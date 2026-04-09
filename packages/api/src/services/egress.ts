import { EgressClient, EncodedFileOutput, EncodedFileType, S3Upload } from "livekit-server-sdk";
import { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL } from "../lib/env";
import { LIVEKIT_EGRESS_S3_BUCKET, LIVEKIT_EGRESS_S3_REGION, TRANSCRIPTION_ENABLED } from "../lib/env";
import { logger } from "../lib/logger";

function getEgressClient(): EgressClient | null {
  if (!TRANSCRIPTION_ENABLED) return null;
  // Convert ws:// or wss:// to http:// or https:// for the EgressClient
  const httpUrl = LIVEKIT_URL.replace("wss://", "https://").replace("ws://", "http://");
  return new EgressClient(httpUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
}

export async function startAudioEgress(
  roomName: string,
  sessionId: string,
  clinicianId: string,
): Promise<string | null> {
  const client = getEgressClient();
  if (!client) {
    logger.info("Transcription disabled — skipping egress");
    return null;
  }

  try {
    const s3 = new S3Upload({
      bucket: LIVEKIT_EGRESS_S3_BUCKET,
      region: LIVEKIT_EGRESS_S3_REGION,
    });

    const output = new EncodedFileOutput({
      fileType: EncodedFileType.OGG,
      filepath: `recordings/${clinicianId}/${sessionId}.ogg`,
      output: {
        case: "s3" as const,
        value: s3,
      },
    });

    const info = await client.startRoomCompositeEgress(roomName, output, {
      audioOnly: true,
    });

    logger.info("Egress started", `room=${roomName} egressId=${info.egressId}`);
    return info.egressId;
  } catch (err) {
    logger.error("Failed to start egress", err);
    return null;
  }
}

export async function stopEgress(egressId: string): Promise<void> {
  const client = getEgressClient();
  if (!client) return;

  try {
    await client.stopEgress(egressId);
    logger.info("Egress stopped", `egressId=${egressId}`);
  } catch (err) {
    logger.error("Failed to stop egress", err);
  }
}
