

**Feature Spec: GPU Transcription Pipeline**

Self-Hosted Voxtral on EC2 Spot GPU

*Batch transcription with SQS, S3, Lambda, and EventBridge*

April 2026

# **Overview**

After a therapy session ends, the platform automatically transcribes the session audio using a self-hosted Voxtral speech-to-text model running on an EC2 spot GPU instance. The transcript includes speaker diarization (therapist vs client) and timestamps, and is available to the therapist within approximately 4 minutes of the session ending.

**Why self-hosted:** Voxtral is open source (Apache 2.0). Audio never leaves our AWS infrastructure, making it HIPAA compliant by default. No per-minute API fees — we only pay for GPU compute time.

**Why batch (not real-time):** Therapists review transcripts after the session when writing notes. Real-time streaming adds complexity without adding value for this use case.

# **Architecture**

The pipeline uses five AWS services: LiveKit (audio recording), S3 (audio storage), SQS (job queue), EC2 spot GPU (transcription), and EventBridge \+ Lambda (lifecycle management).

## **Data Flow**

| Step | What Happens | Service |
| :---- | :---- | :---- |
| 1 | Therapist and client are in a LiveKit video call | LiveKit (EC2) |
| 2 | LiveKit Egress API records the audio as a .wav file | LiveKit Egress |
| 3 | Audio file is saved to S3 with a session-specific key | S3 |
| 4 | API creates a database record: status \= pending\_transcription | API (EC2) |
| 5 | API sends a message to the SQS transcription queue | SQS |
| 6 | GPU worker picks up the message from the queue | EC2 g4dn.xlarge |
| 7 | Worker downloads audio from S3 | EC2 g4dn.xlarge |
| 8 | Voxtral transcribes audio with speaker diarization | EC2 g4dn.xlarge |
| 9 | Worker saves transcript to database via API | API (EC2) |
| 10 | Worker deletes the SQS message (job complete) | SQS |
| 11 | Therapist sees transcript in the app (\~4 min after session) | Amplify (frontend) |

# **Component Details**

## **1\. LiveKit Audio Recording (Egress)**

LiveKit has a built-in Egress API that records room audio/video. We use it to export the session audio as a single .wav file when the session ends.

### **Trigger**

When a therapy session ends (both participants leave the room, or the therapist clicks “End Session”), the API calls LiveKit’s Egress API to begin a room composite export of the audio track only.

### **Output**

* **Format:** WAV (PCM 16-bit, 16kHz mono) — this is what Voxtral expects

* **S3 key:** recordings/{therapist\_id}/{session\_id}.wav

* **Typical size:** \~75MB for a 45-minute session at 16kHz mono

### **API Code (TypeScript)**

import { EgressClient, EncodedFileType } from 'livekit-server-sdk';

const egressClient \= new EgressClient(LIVEKIT\_URL, API\_KEY, API\_SECRET);

async function startRecording(roomName: string, sessionId: string) {

  const output \= {

    fileType: EncodedFileType.WAV,

    filepath: \`recordings/{therapistId}/${sessionId}.wav\`,

    s3: {

      bucket: S3\_BUCKET,

      region: 'us-east-1',

      accessKey: AWS\_ACCESS\_KEY,

      secret: AWS\_SECRET\_KEY,

    },

  };

  const info \= await egressClient.startRoomCompositeEgress(

    roomName,

    { file: output },

    { audioOnly: true }

  );

  return info.egressId;

}

## **2\. SQS Transcription Queue**

A standard SQS queue holds transcription jobs. Each message represents one session that needs transcription.

### **Queue Configuration**

| Setting | Value | Why |
| :---- | :---- | :---- |
| Queue type | Standard | Order doesn’t matter, we want throughput |
| Visibility timeout | 600 seconds (10 min) | Prevents another worker from picking up the same job while one is processing it. A 45-min session takes \~4 min to transcribe. |
| Message retention | 4 days | If the GPU is down for a day, messages wait safely |
| Dead letter queue | Yes, after 3 attempts | Failed jobs go here for manual investigation |
| Encryption | SSE-SQS | Messages contain session IDs (PHI-adjacent) |

### **Message Format**

{

  "sessionId": "sess\_abc123",

  "therapistId": "ther\_xyz789",

  "audioPath": "recordings/ther\_xyz789/sess\_abc123.wav",

  "bucket": "yourapp-storage-prod",

  "createdAt": "2026-04-09T17:45:00Z"

}

### **When a Message is Sent**

The API sends a message to SQS immediately after LiveKit Egress confirms the recording is saved to S3. This happens in the session-end webhook handler:

async function onSessionEnd(sessionId: string, audioPath: string) {

  // Update database

  await db.session.update({

    where: { id: sessionId },

    data: { status: 'pending\_transcription', audioPath },

  });

  // Queue transcription job

  await sqs.sendMessage({

    QueueUrl: TRANSCRIPTION\_QUEUE\_URL,

    MessageBody: JSON.stringify({

      sessionId,

      therapistId: session.therapistId,

      audioPath,

      bucket: S3\_BUCKET,

      createdAt: new Date().toISOString(),

    }),

  }).promise();

}

## **3\. GPU Instance (g4dn.xlarge)**

A spot EC2 instance running Voxtral Mini Transcribe V2. It polls SQS for jobs, downloads audio from S3, transcribes, and posts results back to the API.

### **Instance Spec**

| Property | Value |
| :---- | :---- |
| Instance type | g4dn.xlarge |
| GPU | NVIDIA T4 (16GB VRAM) |
| vCPU | 4 |
| RAM | 16GB |
| Pricing | Spot: \~$0.21/hr, On-demand: $0.53/hr |
| AMI | Ubuntu 24.04 \+ NVIDIA CUDA drivers (Deep Learning AMI) |
| Storage | 50GB gp3 (model weights \+ temp audio files) |
| Security group | sg-gpu: no inbound (pulls from SQS, doesn’t serve traffic) |

### **Instance Setup (one-time)**

Use the AWS Deep Learning AMI (Ubuntu) which comes with CUDA pre-installed:

1. **Launch a g4dn.xlarge** with the Deep Learning AMI. Spot request. Security group: outbound only (HTTPS to SQS/S3/API).

2. **Install Voxtral:** 

   pip install vllm mistral-common\[audio\]

3. **Download model weights** (happens once, cached on EBS):

   \# Model downloads automatically on first serve

   vllm serve mistralai/Voxtral-Mini-4B-Realtime-2602 \\

     \--tokenizer-mode mistral \\

     \--config-format mistral \\

     \--load-format mistral

4. **Create an AMI snapshot** of this configured instance. Future launches use this AMI — no reinstallation needed, boots in \~90 seconds.

### **Worker Script**

The worker runs as a systemd service on the GPU instance. It loops forever, polling SQS:

import boto3, json, requests, subprocess, os, time

sqs \= boto3.client('sqs', region\_name='us-east-1')

s3 \= boto3.client('s3')

QUEUE\_URL \= os.environ\['TRANSCRIPTION\_QUEUE\_URL'\]

API\_URL \= os.environ\['API\_URL'\]

API\_KEY \= os.environ\['INTERNAL\_API\_KEY'\]

def transcribe(audio\_path):

    \# Call local vLLM server

    result \= requests.post('http://localhost:8000/v1/audio/transcriptions', files={

        'file': open(audio\_path, 'rb'),

    }, data={

        'model': 'mistralai/Voxtral-Mini-4B-Realtime-2602',

        'response\_format': 'verbose\_json',

    })

    return result.json()

while True:

    resp \= sqs.receive\_message(

        QueueUrl=QUEUE\_URL,

        MaxNumberOfMessages=1,

        WaitTimeSeconds=20,  \# long polling (free, efficient)

    )

    if 'Messages' not in resp:

        continue

    msg \= json.loads(resp\['Messages'\]\[0\]\['Body'\])

    receipt \= resp\['Messages'\]\[0\]\['ReceiptHandle'\]

    try:

        \# Download audio from S3

        local\_path \= f"/tmp/{msg\['sessionId'\]}.wav"

        s3.download\_file(msg\['bucket'\], msg\['audioPath'\], local\_path)

        \# Transcribe

        transcript \= transcribe(local\_path)

        \# Post result to API

        requests.post(f"{API\_URL}/internal/transcripts", json={

            'sessionId': msg\['sessionId'\],

            'transcript': transcript,

        }, headers={'Authorization': f'Bearer {API\_KEY}'})

        \# Delete message (success)

        sqs.delete\_message(QueueUrl=QUEUE\_URL, ReceiptHandle=receipt)

        \# Cleanup temp file

        os.remove(local\_path)

    except Exception as e:

        print(f'Error processing {msg\["sessionId"\]}: {e}')

        \# Message returns to queue after visibility timeout

## **4\. GPU Lifecycle Management (EventBridge \+ Lambda)**

The GPU instance runs during business hours only. EventBridge schedules start/stop, and Lambda handles the actual EC2 API calls.

### **Schedule**

| Rule | Cron Expression | Action |
| :---- | :---- | :---- |
| Start GPU | cron(0 13 ? \* MON-FRI \*) (8am ET) | Lambda starts the spot instance |
| Stop GPU | cron(0 23 ? \* MON-FRI \*) (6pm ET) | Lambda stops the instance |

Cron expressions are in UTC. Adjust for your timezone.

### **Lambda Function (Start/Stop)**

import boto3

ec2 \= boto3.client('ec2', region\_name='us-east-1')

INSTANCE\_ID \= 'i-0abc123def456789'  \# your GPU instance ID

def handler(event, context):

    action \= event.get('action', 'start')

    if action \== 'start':

        ec2.start\_instances(InstanceIds=\[INSTANCE\_ID\])

        print(f'Started {INSTANCE\_ID}')

    elif action \== 'stop':

        ec2.stop\_instances(InstanceIds=\[INSTANCE\_ID\])

        print(f'Stopped {INSTANCE\_ID}')

    return {'statusCode': 200, 'body': action}

### **Spot Interruption Handling**

If AWS reclaims the spot instance mid-transcription:

* **The SQS message is NOT deleted** (it only gets deleted after successful transcription). After the visibility timeout (10 min), the message returns to the queue.

* **When the instance restarts** (either via EventBridge schedule or manual start), the worker picks up the message and retries.

* **The audio file is safe in S3.** Nothing is lost.

* **Spot interruptions are rare** for g4dn.xlarge in us-east-1 (\~5% frequency). If it’s a problem, switch to on-demand ($0.53/hr instead of $0.21/hr).

## **5\. API Endpoints**

Two new internal endpoints on your TypeScript API:

### **POST /internal/transcripts**

Called by the GPU worker after transcription completes. Internal only — authenticated with a shared secret, not exposed publicly.

// Request body

{

  "sessionId": "sess\_abc123",

  "transcript": {

    "text": "Full transcript text...",

    "segments": \[

      {

        "start": 0.0,

        "end": 4.2,

        "text": "Hi, how are you feeling today?",

        "speaker": "spk\_0"

      },

      {

        "start": 4.5,

        "end": 8.1,

        "text": "I’ve been having a rough week...",

        "speaker": "spk\_1"

      }

    \]

  }

}

The API handler:

* Validates the internal API key

* Stores the full transcript JSON in the database (sessions table, transcript column as JSONB)

* Optionally stores the raw transcript JSON in S3 as a backup

* Updates session status from pending\_transcription to transcribed

* Sends a real-time notification to the therapist’s frontend (WebSocket or polling)

### **GET /api/sessions/:id/transcript**

Called by the frontend when a therapist opens a session’s notes. Returns the transcript with speaker labels.

// Response

{

  "sessionId": "sess\_abc123",

  "status": "transcribed",

  "duration": 2700,

  "speakers": {

    "spk\_0": "Therapist",

    "spk\_1": "Client"

  },

  "segments": \[

    { "start": 0.0, "end": 4.2, "speaker": "Therapist", "text": "..." },

    { "start": 4.5, "end": 8.1, "speaker": "Client", "text": "..." }

  \]

}

**Speaker mapping:** Voxtral outputs generic labels (spk\_0, spk\_1). The API maps these to “Therapist” and “Client” based on who joined the LiveKit room first, or the therapist can manually assign them in the UI.

## **6\. Database Schema Changes**

Add to the sessions table:

ALTER TABLE sessions ADD COLUMN audio\_path TEXT;

ALTER TABLE sessions ADD COLUMN transcript JSONB;

ALTER TABLE sessions ADD COLUMN transcript\_status TEXT

  DEFAULT 'none'

  CHECK (transcript\_status IN ('none','pending','transcribing','completed','failed'));

ALTER TABLE sessions ADD COLUMN transcribed\_at TIMESTAMPTZ;

Status transitions:

| Status | When | Set By |
| :---- | :---- | :---- |
| none | Session created, not yet ended | API |
| pending | Session ended, audio saved, SQS message sent | API |
| transcribing | GPU worker picked up the job | GPU worker (via API) |
| completed | Transcript saved to database | GPU worker (via API) |
| failed | 3 attempts failed, message in DLQ | SQS DLQ / monitoring |

## **7\. Frontend (Therapist Experience)**

What the therapist sees after ending a session:

### **Session Notes Page**

1. **Session ends.** Therapist sees “Transcript processing...” with a subtle spinner.

2. **\~4 minutes later,** the transcript appears automatically (poll every 15 seconds, or use WebSocket push).

3. **Transcript is displayed** as a conversation view with speaker labels, timestamps, and the full text.

4. **Therapist can click on any segment** to highlight it, add it to their session notes, or flag it for follow-up.

5. **Speaker labels are editable:** if Voxtral misassigns spk\_0/spk\_1, the therapist can swap them with one click.

### **Transcript States in the UI**

| State | What the Therapist Sees |
| :---- | :---- |
| none | No transcript section shown (session hasn’t ended yet) |
| pending | “Transcript processing...” with spinner |
| transcribing | “Transcript processing...” with spinner (same as pending visually) |
| completed | Full transcript displayed as conversation |
| failed | “Transcription failed. Click to retry.” button |

## **8\. S3 Bucket Structure**

yourapp-storage-prod/

  recordings/

    {therapist\_id}/

      {session\_id}.wav          ← raw audio

  transcripts/

    {therapist\_id}/

      {session\_id}.json         ← transcript backup

### **Lifecycle Policy**

* **Audio recordings:** Move to S3 Glacier after 30 days, delete after 1 year (or whatever your retention policy requires). Audio files are large (\~75MB each) and rarely accessed after transcription.

* **Transcript JSON:** Keep in Standard tier indefinitely. They’re small (\< 100KB each).

## **9\. Monitoring and Alerts**

| Metric | Alert Threshold | Action |
| :---- | :---- | :---- |
| SQS queue depth | Greater than 50 messages for 10 min | GPU may be down or overloaded. Check instance status. |
| DLQ message count | Greater than 0 | A transcription failed 3 times. Investigate manually. |
| GPU instance status | Not running during business hours | Lambda failed to start it. Check EventBridge/Lambda logs. |
| Transcript latency | Session ended \> 10 min ago, status still pending | GPU worker may be stuck. Check worker logs. |
| Spot interruption | Instance terminated | EventBridge or Lambda should restart. Verify SQS messages are safe. |

## **10\. Cost Summary**

| Component | Monthly Cost | Notes |
| :---- | :---- | :---- |
| g4dn.xlarge spot | $46 | 10 hrs/day, 22 days, $0.21/hr |
| S3 storage | \~$2–5 | 75MB per session, lifecycle to Glacier |
| SQS | \< $1 | Free tier covers millions of messages |
| Lambda | \< $1 | Two invocations per day (start/stop) |
| EventBridge | Free | 2 rules, well within free tier |
| **Total** | **\~$50/month** | **Handles up to \~50 therapists** |

## **11\. Scaling Plan**

| Therapists | GPU Setup | Monthly GPU Cost | Notes |
| :---- | :---- | :---- | :---- |
| 1–49 | 1× g4dn.xlarge spot | $46 | Handles all sessions with room to spare |
| 50–199 | 2× g4dn.xlarge spot | $92 | Workers share the same SQS queue |
| 200–499 | 3–5× g4dn.xlarge spot | $138–$230 | Add workers as needed, all poll same queue |
| 500+ | 5–10× g4dn.xlarge spot | $230–$460 | Consider g5.xlarge for faster processing |

**Scaling is trivially easy:** launch more GPU instances pointing at the same SQS queue. SQS handles message distribution automatically — no load balancer or coordinator needed. Each worker independently polls, processes, and deletes messages.

# **12\. Implementation Order**

Build in this order. Each phase is independently testable.

## **Phase 1: Recording (1–2 days)**

* Integrate LiveKit Egress API into session-end handler

* Audio saves to S3 on session end

* Database record updated with audio\_path and status \= pending

* Test: end a session, verify .wav appears in S3

## **Phase 2: Queue (half day)**

* Create SQS queue \+ DLQ in AWS Console

* API sends message to SQS after audio is confirmed in S3

* Test: end a session, verify message appears in SQS console

## **Phase 3: GPU Worker (2–3 days)**

* Launch g4dn.xlarge with Deep Learning AMI

* Install vLLM \+ Voxtral, verify it transcribes a test file

* Write the worker script (poll SQS, download, transcribe, post result)

* Run as systemd service

* Create AMI snapshot of configured instance

* Test: manually send SQS message, verify transcript arrives in database

## **Phase 4: API Endpoints (1 day)**

* POST /internal/transcripts — receives and stores transcript

* GET /api/sessions/:id/transcript — returns transcript to frontend

* Speaker mapping logic (spk\_0 → Therapist/Client)

* Test: call endpoints directly with sample data

## **Phase 5: Frontend (1–2 days)**

* Transcript status indicator on session notes page

* Polling or WebSocket for real-time transcript arrival

* Conversation view with speaker labels and timestamps

* Speaker label editing

* Test: end a real session, watch transcript appear in UI

## **Phase 6: Lifecycle Automation (half day)**

* Create Lambda function for start/stop

* Create EventBridge rules (8am start, 6pm stop)

* Test: verify GPU starts and stops on schedule

* Set up CloudWatch alarms for SQS depth and DLQ

**Total estimated time: 6–9 days** for a senior engineer.

*Voxtral Mini Transcribe V2 — Apache 2.0 license, 3B parameters, 16GB GPU RAM required. Audio never leaves AWS infrastructure. All pricing April 2026, US East (N. Virginia), spot pricing.*