"""ML-based PHI detector using Hugging Face transformer NER models.

Primary: obi/deid_roberta_i2b2 (clinical NER)
Fallback: spaCy en_core_web_trf
"""

import logging
from typing import List, Optional

from engine.entity import PHIEntity, PHICategory, DetectionSource
from .base import BaseDetector

logger = logging.getLogger(__name__)

# Map model labels to our PHI categories
LABEL_MAP: dict[str, PHICategory] = {
    # obi/deid_roberta_i2b2 labels
    "PATIENT": PHICategory.NAME,
    "STAFF": PHICategory.NAME,
    "AGE": PHICategory.AGE_OVER_89,
    "DATE": PHICategory.DATE,
    "PHONE": PHICategory.PHONE,
    "EMAIL": PHICategory.EMAIL,
    # "ID" is too noisy — catches clinical scores, CPT codes. MRN handled by regex + context.
    # "ID": PHICategory.MRN,
    "HOSP": PHICategory.GEOGRAPHIC,
    "PATORG": PHICategory.GEOGRAPHIC,
    "LOC": PHICategory.GEOGRAPHIC,
    "OTHERPHI": PHICategory.OTHER_ID,
    "STREET": PHICategory.GEOGRAPHIC,
    "CITY": PHICategory.GEOGRAPHIC,
    "STATE": PHICategory.GEOGRAPHIC,
    "ZIP": PHICategory.GEOGRAPHIC,
    "COUNTRY": PHICategory.GEOGRAPHIC,
    "ORGANIZATION": PHICategory.GEOGRAPHIC,
    "URL": PHICategory.URL,
    "USERNAME": PHICategory.OTHER_ID,
    "BIOID": PHICategory.BIOMETRIC,
    "DEVICE": PHICategory.DEVICE_ID,
    "HEALTHPLAN": PHICategory.HEALTH_PLAN_ID,
    "ACCT": PHICategory.ACCOUNT_NUMBER,
    "LICENSE": PHICategory.LICENSE_NUMBER,
    "VEHICLE": PHICategory.VEHICLE_ID,
    "SSN": PHICategory.SSN,
    "FAX": PHICategory.FAX,
    "MEDICALRECORD": PHICategory.MRN,
    # spaCy labels
    "PERSON": PHICategory.NAME,
    "GPE": PHICategory.GEOGRAPHIC,
    "ORG": PHICategory.GEOGRAPHIC,
    "FAC": PHICategory.GEOGRAPHIC,
    "LOC": PHICategory.GEOGRAPHIC,
}


class MLDetector(BaseDetector):
    """Detects PHI using transformer-based NER models."""

    def __init__(
        self,
        model_name: str = "obi/deid_roberta_i2b2",
        fallback_model: str = "en_core_web_trf",
        use_gpu: bool = True,
        max_length: int = 512,
    ):
        self.model_name = model_name
        self.fallback_model = fallback_model
        self.max_length = max_length
        self._pipeline = None
        self._spacy_nlp = None
        self._use_primary = True

        self._init_model(use_gpu)

    @property
    def name(self) -> str:
        return f"MLDetector({'primary' if self._use_primary else 'fallback'})"

    def _init_model(self, use_gpu: bool) -> None:
        """Initialize the NER model, falling back to spaCy if needed."""
        try:
            import torch
            from transformers import pipeline as hf_pipeline

            device = 0 if use_gpu and torch.cuda.is_available() else -1
            logger.info(f"Loading primary model: {self.model_name} (device={device})")

            self._pipeline = hf_pipeline(
                "token-classification",
                model=self.model_name,
                aggregation_strategy="simple",
                device=device,
            )
            self._use_primary = True
            logger.info("Primary ML model loaded successfully")

        except Exception as e:
            logger.warning(f"Failed to load primary model: {e}. Trying spaCy fallback.")
            self._use_primary = False

            try:
                import spacy
                self._spacy_nlp = spacy.load(self.fallback_model)
                logger.info(f"Loaded spaCy fallback: {self.fallback_model}")
            except Exception as e2:
                logger.error(f"Failed to load fallback model: {e2}. ML detection disabled.")
                self._spacy_nlp = None

    def detect(self, text: str) -> List[PHIEntity]:
        """Detect PHI entities using the loaded ML model."""
        if self._use_primary and self._pipeline:
            return self._detect_primary(text)
        elif self._spacy_nlp:
            return self._detect_spacy(text)
        else:
            logger.debug("No ML model available, skipping ML detection")
            return []

    def _detect_primary(self, text: str) -> List[PHIEntity]:
        """Detect using the Hugging Face transformer pipeline."""
        entities: List[PHIEntity] = []

        # Split long texts into chunks
        chunks = self._chunk_text(text)

        for chunk_text, offset in chunks:
            try:
                results = self._pipeline(chunk_text)
            except Exception as e:
                logger.warning(f"ML inference failed on chunk: {e}")
                continue

            for result in results:
                label = result.get("entity_group", result.get("entity", "")).upper()
                category = LABEL_MAP.get(label)
                if not category:
                    continue

                start = result["start"] + offset
                end = result["end"] + offset
                matched_text = text[start:end]

                # Skip very short matches (likely noise)
                if len(matched_text.strip()) < 2:
                    continue

                confidence = float(result.get("score", 0.5))

                ctx_start = max(0, start - 30)
                ctx_end = min(len(text), end + 30)

                entities.append(
                    PHIEntity(
                        text=matched_text,
                        category=category,
                        start=start,
                        end=end,
                        confidence=confidence,
                        source=DetectionSource.ML,
                        context_window=text[ctx_start:ctx_end],
                        explanation=f"ML model ({self.model_name}) detected {label}",
                    )
                )

        return entities

    def _detect_spacy(self, text: str) -> List[PHIEntity]:
        """Detect using spaCy NER as fallback."""
        entities: List[PHIEntity] = []
        doc = self._spacy_nlp(text)

        for ent in doc.ents:
            category = LABEL_MAP.get(ent.label_)
            if not category:
                continue

            ctx_start = max(0, ent.start_char - 30)
            ctx_end = min(len(text), ent.end_char + 30)

            entities.append(
                PHIEntity(
                    text=ent.text,
                    category=category,
                    start=ent.start_char,
                    end=ent.end_char,
                    confidence=0.6,  # spaCy doesn't provide per-entity scores
                    source=DetectionSource.ML,
                    context_window=text[ctx_start:ctx_end],
                    explanation=f"spaCy NER detected {ent.label_}",
                )
            )

        return entities

    def _chunk_text(self, text: str) -> List[tuple[str, int]]:
        """Split text into overlapping chunks for processing."""
        if len(text) <= self.max_length * 4:  # rough char-to-token ratio
            return [(text, 0)]

        chunks = []
        stride = self.max_length * 3  # 75% overlap
        window = self.max_length * 4

        for i in range(0, len(text), stride):
            chunk = text[i : i + window]
            chunks.append((chunk, i))
            if i + window >= len(text):
                break

        return chunks
