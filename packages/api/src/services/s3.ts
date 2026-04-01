import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

const BUCKET = process.env.AWS_S3_BUCKET_NAME || process.env.S3_BUCKET || "steady-uploads";
const REGION = process.env.AWS_DEFAULT_REGION || process.env.AWS_REGION || "us-east-1";
const ENDPOINT = process.env.AWS_ENDPOINT_URL || undefined;

const s3 = new S3Client({
  region: REGION,
  ...(ENDPOINT ? { endpoint: ENDPOINT, forcePathStyle: true } : {}),
});

const UPLOAD_EXPIRY = 300; // 5 minutes
const DOWNLOAD_EXPIRY = 300; // 5 minutes — minimize exposure window for PHI

export async function generateUploadUrl(opts: {
  userId: string;
  context: string;
  fileName: string;
  fileType: string;
}): Promise<{ uploadUrl: string; key: string; publicUrl: string }> {
  const ext = opts.fileName.split(".").pop() || "bin";
  const id = crypto.randomUUID();
  const key = `uploads/${opts.userId}/${opts.context}/${id}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: opts.fileType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: UPLOAD_EXPIRY });

  // Build public URL based on endpoint
  const publicUrl = ENDPOINT
    ? `${ENDPOINT}/${BUCKET}/${key}`
    : `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;

  return { uploadUrl, key, publicUrl };
}

export async function getFileBuffer(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  const response = await s3.send(command);
  const stream = response.Body as NodeJS.ReadableStream;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function generateDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  return getSignedUrl(s3, command, { expiresIn: DOWNLOAD_EXPIRY });
}
