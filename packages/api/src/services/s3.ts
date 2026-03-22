import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

const BUCKET = process.env.S3_BUCKET || "steady-uploads";
const REGION = process.env.AWS_REGION || "us-east-1";

const s3 = new S3Client({ region: REGION });

const UPLOAD_EXPIRY = 300; // 5 minutes
const DOWNLOAD_EXPIRY = 3600; // 1 hour

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
    ServerSideEncryption: "AES256",
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: UPLOAD_EXPIRY });
  const publicUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;

  return { uploadUrl, key, publicUrl };
}

export async function generateDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  return getSignedUrl(s3, command, { expiresIn: DOWNLOAD_EXPIRY });
}
