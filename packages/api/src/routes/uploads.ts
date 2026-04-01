import { logger } from "../lib/logger";
import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { generateUploadUrl, generateDownloadUrl } from "../services/s3";

const router = Router();

router.use(authenticate);

const VALID_CONTEXTS = ["program-cover", "handout", "attachment", "audio", "pdf"] as const;

const ALLOWED_TYPES: Record<string, string[]> = {
  "program-cover": ["image/png", "image/jpeg", "image/webp"],
  handout: ["application/pdf", "image/png", "image/jpeg"],
  attachment: ["application/pdf", "image/png", "image/jpeg", "image/webp"],
  audio: ["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/wav", "audio/aac", "audio/ogg"],
  pdf: ["application/pdf"],
};

const MAX_FILE_SIZE: Record<string, number> = {
  "program-cover": 5 * 1024 * 1024, // 5 MB
  handout: 20 * 1024 * 1024, // 20 MB
  attachment: 20 * 1024 * 1024, // 20 MB
  audio: 500 * 1024 * 1024, // 500 MB — full session recordings can be 45-90 minutes
  pdf: 50 * 1024 * 1024, // 50 MB
};

// POST /api/uploads/presign — Get a pre-signed URL for uploading
router.post("/presign", async (req: Request, res: Response) => {
  try {
    const { fileName, fileType, context } = req.body;

    if (!fileName?.trim()) {
      res.status(400).json({ success: false, error: "fileName is required" });
      return;
    }
    if (!fileType?.trim()) {
      res.status(400).json({ success: false, error: "fileType is required" });
      return;
    }
    if (!context || !VALID_CONTEXTS.includes(context)) {
      res.status(400).json({
        success: false,
        error: `context must be one of: ${VALID_CONTEXTS.join(", ")}`,
      });
      return;
    }

    const allowed = ALLOWED_TYPES[context];
    if (!allowed.includes(fileType)) {
      res.status(400).json({
        success: false,
        error: `File type ${fileType} is not allowed for ${context}. Allowed: ${allowed.join(", ")}`,
      });
      return;
    }

    const userId =
      req.user!.clinicianProfileId || req.user!.participantProfileId || req.user!.userId;

    const result = await generateUploadUrl({
      userId,
      context,
      fileName: fileName.trim(),
      fileType,
    });

    res.json({
      success: true,
      data: {
        uploadUrl: result.uploadUrl,
        key: result.key,
        publicUrl: result.publicUrl,
        maxSize: MAX_FILE_SIZE[context],
      },
    });
  } catch (err) {
    logger.error("Presign upload error", err);
    res.status(500).json({ success: false, error: "Failed to generate upload URL" });
  }
});

// GET /api/uploads/presign-download — Get a pre-signed URL for downloading
router.get("/presign-download", async (req: Request, res: Response) => {
  try {
    const key = req.query.key as string;

    if (!key?.trim()) {
      res.status(400).json({ success: false, error: "key query parameter is required" });
      return;
    }

    // Basic path validation — only allow downloads from uploads/ prefix
    if (!key.startsWith("uploads/")) {
      res.status(403).json({ success: false, error: "Access denied" });
      return;
    }

    const downloadUrl = await generateDownloadUrl(key);

    res.json({ success: true, data: { downloadUrl } });
  } catch (err) {
    logger.error("Presign download error", err);
    res.status(500).json({ success: false, error: "Failed to generate download URL" });
  }
});

export default router;
