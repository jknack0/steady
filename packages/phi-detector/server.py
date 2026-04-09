"""FastAPI server for PHI detection and redaction."""

import logging
from typing import List, Optional

from fastapi import FastAPI
from pydantic import BaseModel, Field

from engine.pipeline import PHIPipeline
from engine.redactor import RedactionStrategy
from models.model_manager import get_model_status

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="PHI Detection Engine",
    description="Local, HIPAA-grade PHI detection and redaction API",
    version="1.0.0",
)

# Singleton pipeline — loads models once at startup
_pipeline: Optional[PHIPipeline] = None


def get_pipeline() -> PHIPipeline:
    global _pipeline
    if _pipeline is None:
        _pipeline = PHIPipeline(enable_ml=True, min_confidence=0.4)
    return _pipeline


# ── Request/Response Models ──────────────────────────

class DetectRequest(BaseModel):
    text: str = Field(..., description="Text to scan for PHI")
    min_confidence: float = Field(0.4, ge=0.0, le=1.0, description="Minimum confidence threshold")


class EntityResponse(BaseModel):
    text: str
    category: str
    start: int
    end: int
    confidence: float
    source: str
    explanation: str


class DetectResponse(BaseModel):
    found: bool
    entity_count: int
    entities: List[EntityResponse]


class RedactRequest(BaseModel):
    text: str = Field(..., description="Text to redact")
    strategy: str = Field("category", description="Redaction strategy: redacted, category, mask, surrogate")
    min_confidence: float = Field(0.4, ge=0.0, le=1.0)


class RedactionReport(BaseModel):
    original: str
    replacement: str
    category: str
    start: int
    end: int
    confidence: float


class RedactResponse(BaseModel):
    redacted_text: str
    entity_count: int
    report: List[RedactionReport]


class HealthResponse(BaseModel):
    status: str
    models: dict
    detectors: List[str]


# ── Endpoints ────────────────────────────────────────

@app.post("/detect", response_model=DetectResponse)
async def detect_phi(req: DetectRequest):
    """Detect PHI entities in text."""
    pipeline = get_pipeline()
    pipeline.min_confidence = req.min_confidence
    entities = pipeline.detect(req.text)

    return DetectResponse(
        found=len(entities) > 0,
        entity_count=len(entities),
        entities=[
            EntityResponse(
                text=e.text,
                category=e.category.value,
                start=e.start,
                end=e.end,
                confidence=round(e.confidence, 3),
                source=e.source.value,
                explanation=e.explanation,
            )
            for e in entities
        ],
    )


@app.post("/redact", response_model=RedactResponse)
async def redact_phi(req: RedactRequest):
    """Detect and redact PHI from text."""
    pipeline = get_pipeline()
    pipeline.min_confidence = req.min_confidence

    try:
        strategy = RedactionStrategy(req.strategy)
    except ValueError:
        strategy = RedactionStrategy.CATEGORY

    redacted_text, entities, report = pipeline.detect_and_redact(
        req.text, strategy=strategy
    )

    return RedactResponse(
        redacted_text=redacted_text,
        entity_count=len(entities),
        report=[
            RedactionReport(
                original=r["original"],
                replacement=r["replacement"],
                category=r["category"],
                start=r["start"],
                end=r["end"],
                confidence=r["confidence"],
            )
            for r in report
        ],
    )


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Check engine status and model availability."""
    pipeline = get_pipeline()
    return HealthResponse(
        status="ok",
        models=get_model_status(),
        detectors=[d.name for d in pipeline._detectors],
    )


@app.get("/config")
async def get_config():
    """Return current pipeline configuration."""
    pipeline = get_pipeline()
    return {"config": pipeline.config}
