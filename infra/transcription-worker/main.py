"""
Transcription Worker (faster-whisper)

Receives HTTP POST requests from the API with an S3 audio path.
Downloads from S3 (or MinIO in dev), transcribes on GPU, POSTs result
back to the API via internal endpoint.
"""
import os
import json
import logging
import hashlib
import tempfile
from typing import Optional
import boto3
import requests
from botocore.config import Config
from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from faster_whisper import WhisperModel

# Config from env
MODEL_SIZE = os.getenv("WHISPER_MODEL", "large-v3")
DEVICE = os.getenv("WHISPER_DEVICE", "cuda")
COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "float16")
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "dev-internal-key")

# S3 config — works with AWS S3 and MinIO
S3_ENDPOINT = os.getenv("S3_ENDPOINT")  # None → AWS S3, URL → MinIO
S3_BUCKET = os.getenv("S3_BUCKET", "steady-dev")
S3_REGION = os.getenv("S3_REGION", "us-east-2")

# Structured logging — no PHI
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
)
logger = logging.getLogger("transcription-worker")

app = FastAPI(title="Steady Transcription Worker")

# Lazy-load the model on first request
_model: Optional[WhisperModel] = None

# S3 client — works with AWS S3 or MinIO via S3_ENDPOINT
_s3_client = boto3.client(
    "s3",
    endpoint_url=S3_ENDPOINT,
    region_name=S3_REGION,
    config=Config(signature_version="s3v4", s3={"addressing_style": "path"} if S3_ENDPOINT else {}),
)

def get_model() -> WhisperModel:
    global _model
    if _model is None:
        logger.info(f"Loading Whisper model: {MODEL_SIZE} on {DEVICE} ({COMPUTE_TYPE})")
        _model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)
        logger.info("Model loaded")
    return _model


class TranscribeRequest(BaseModel):
    sessionId: str
    therapistId: str
    audioPath: str  # S3 key (e.g. "recordings/therapist-1/session-1.ogg")
    bucket: str
    callbackUrl: str
    callbackSecret: str


class TranscribeResponse(BaseModel):
    status: str
    sessionId: str


def check_auth(authorization: Optional[str]) -> None:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization")
    token = authorization.replace("Bearer ", "", 1)
    if token != INTERNAL_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid credentials")


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_SIZE, "device": DEVICE, "s3_endpoint": S3_ENDPOINT or "aws"}


@app.post("/transcribe", response_model=TranscribeResponse)
def transcribe(
    req: TranscribeRequest,
    authorization: Optional[str] = Header(None),
):
    check_auth(authorization)
    logger.info(f"Transcription request received sessionId={req.sessionId}")

    # Download audio from S3 to temp file
    with tempfile.NamedTemporaryFile(suffix=".ogg", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        _s3_client.download_file(req.bucket, req.audioPath, tmp_path)
        logger.info(f"Audio downloaded sessionId={req.sessionId}")

        # Compute SHA-256 hash for integrity verification
        sha256 = hashlib.sha256()
        with open(tmp_path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                sha256.update(chunk)
        audio_hash = sha256.hexdigest()

        # Run transcription
        model = get_model()
        segments, info = model.transcribe(
            tmp_path,
            beam_size=5,
            vad_filter=True,
            word_timestamps=False,
        )

        # Collect segments
        segment_list = []
        full_text_parts = []
        for seg in segments:
            segment_data = {
                "start": round(seg.start, 2),
                "end": round(seg.end, 2),
                "text": seg.text.strip(),
                "speaker": "spk_0",  # faster-whisper doesn't do diarization
            }
            segment_list.append(segment_data)
            full_text_parts.append(seg.text.strip())

        transcript = {
            "text": " ".join(full_text_parts),
            "segments": segment_list,
            "language": info.language,
            "duration": round(info.duration, 2),
        }

        logger.info(
            f"Transcription complete sessionId={req.sessionId} "
            f"segments={len(segment_list)} duration={info.duration:.1f}s"
        )

        # POST result back to API
        response = requests.post(
            req.callbackUrl,
            json={
                "sessionId": req.sessionId,
                "transcript": transcript,
                "audioHash": audio_hash,
            },
            headers={"Authorization": f"Bearer {req.callbackSecret}"},
            timeout=30,
        )
        response.raise_for_status()
        logger.info(f"Callback succeeded sessionId={req.sessionId}")

        return TranscribeResponse(status="completed", sessionId=req.sessionId)

    except HTTPException:
        raise
    except Exception as e:
        # Log only error type — never the full exception (may contain PHI)
        logger.error(
            f"Transcription failed sessionId={req.sessionId} "
            f"errorType={type(e).__name__}"
        )
        raise HTTPException(status_code=500, detail="Transcription failed")
    finally:
        # Always delete temp file
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
