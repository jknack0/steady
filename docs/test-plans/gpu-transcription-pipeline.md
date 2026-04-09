# Test Plan: GPU Transcription Pipeline

**Feature Spec:** docs/ai_features/gpu-transcription-spec.md
**Status: IN_REVIEW**

## Overview

Covers the end-to-end GPU transcription pipeline: LiveKit Egress audio recording, SQS job queuing, GPU worker transcription via Voxtral, internal API transcript ingestion, public API transcript retrieval, database schema changes (audio_path, transcript JSONB, transcript_status, transcribed_at), frontend transcript viewer with speaker labels, and all HIPAA-mandated audit/access controls.

The pipeline introduces four new integration boundaries: LiveKit Egress API, SQS, S3 (audio/transcript storage), and the internal GPU worker callback. Each requires dedicated mock strategies in tests.

---

## Architecture Scope

| Component | Testable In-Repo | Mock Strategy |
|-----------|-----------------|---------------|
| LiveKit Egress API | Yes, service layer | Mock livekit-server-sdk EgressClient |
| S3 audio upload | Yes, service layer | Mock @aws-sdk/client-s3 |
| SQS message send | Yes, service layer | Mock @aws-sdk/client-sqs |
| GPU worker (Python) | No, separate repo | Test via internal API contract |
| POST /internal/transcripts | Yes, route test | Supertest against Express app |
| GET /api/sessions/:id/transcript | Yes, route test | Supertest against Express app |
| Frontend transcript viewer | Yes, component test | React Testing Library |
| Database schema changes | Yes, integration test | Real PostgreSQL (test DB) |