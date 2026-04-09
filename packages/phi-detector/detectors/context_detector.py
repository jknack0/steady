"""Context-aware PHI detector using sliding window heuristics.

Boosts or suppresses confidence of existing detections based on
surrounding text. Also catches PHI that requires context to identify
(e.g., "Patient: John Smith").
"""

import logging
import re
from typing import List

from engine.entity import PHIEntity, PHICategory, DetectionSource
from .base import BaseDetector

logger = logging.getLogger(__name__)

# Patterns that indicate patient-specific context
PATIENT_LABEL_PATTERNS = [
    (re.compile(r'\b(?:patient|client|pt)\s*(?:name)?\s*[:=]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)', re.IGNORECASE), PHICategory.NAME, 0.85),
    (re.compile(r'\b(?:name)\s*[:=]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)'), PHICategory.NAME, 0.75),
    (re.compile(r'\bDOB\s*[:=]\s*(\S+)', re.IGNORECASE), PHICategory.DATE, 0.9),
    (re.compile(r'\b(?:date of birth)\s*[:=]\s*(\S+)', re.IGNORECASE), PHICategory.DATE, 0.9),
    (re.compile(r'\b(?:admitted|admission date|discharge date|date of death)\s*[:=]\s*(\S+)', re.IGNORECASE), PHICategory.DATE, 0.85),
    (re.compile(r'\bSSN\s*[:=#]\s*(\S+)', re.IGNORECASE), PHICategory.SSN, 0.95),
    (re.compile(r'\bMRN\s*[:=#]\s*(\S+)', re.IGNORECASE), PHICategory.MRN, 0.95),
]

# Suppression context — these keywords near a numeric pattern mean it's NOT PHI
SUPPRESSION_KEYWORDS = {
    "order", "invoice", "reference", "ref", "item", "product", "sku",
    "code", "icd", "cpt", "module", "session", "week", "step", "part",
    "score", "scale", "rating", "level", "grade", "dose", "mg", "ml",
    "page", "chapter", "section", "table", "figure", "version",
}


class ContextDetector(BaseDetector):
    """Detects PHI using context-aware heuristics."""

    def __init__(self, window_size: int = 10):
        self.window_size = window_size

    @property
    def name(self) -> str:
        return "ContextDetector"

    def detect(self, text: str) -> List[PHIEntity]:
        """Find PHI using label patterns and contextual signals."""
        entities: List[PHIEntity] = []

        for pattern, category, confidence in PATIENT_LABEL_PATTERNS:
            for match in pattern.finditer(text):
                # Use the captured group if available, else full match
                if match.lastindex:
                    matched_text = match.group(1)
                    start = match.start(1)
                    end = match.end(1)
                else:
                    matched_text = match.group()
                    start = match.start()
                    end = match.end()

                ctx_start = max(0, match.start() - 30)
                ctx_end = min(len(text), match.end() + 30)

                entities.append(
                    PHIEntity(
                        text=matched_text,
                        category=category,
                        start=start,
                        end=end,
                        confidence=confidence,
                        source=DetectionSource.CONTEXT,
                        context_window=text[ctx_start:ctx_end],
                        explanation=f"Found {category.value} via label pattern",
                    )
                )

        return entities

    def adjust_confidence(
        self, text: str, entities: List[PHIEntity]
    ) -> List[PHIEntity]:
        """Adjust confidence of existing entities based on surrounding context."""
        adjusted: List[PHIEntity] = []

        for entity in entities:
            # Get surrounding words
            words_before = self._get_words(text, entity.start, direction="before")
            words_after = self._get_words(text, entity.end, direction="after")
            surrounding = set(w.lower() for w in words_before + words_after)

            # Check for suppression signals
            if surrounding & SUPPRESSION_KEYWORDS:
                # Reduce confidence if near non-PHI context
                new_confidence = max(0.0, entity.confidence - 0.3)
                adjusted.append(
                    PHIEntity(
                        text=entity.text,
                        category=entity.category,
                        start=entity.start,
                        end=entity.end,
                        confidence=new_confidence,
                        source=entity.source,
                        context_window=entity.context_window,
                        explanation=entity.explanation + " (suppressed by context)",
                        metadata=entity.metadata,
                    )
                )
            else:
                adjusted.append(entity)

        return adjusted

    def _get_words(self, text: str, pos: int, direction: str) -> List[str]:
        """Get N words before or after a position."""
        if direction == "before":
            segment = text[max(0, pos - 200) : pos]
            words = segment.split()
            return words[-self.window_size :]
        else:
            segment = text[pos : min(len(text), pos + 200)]
            words = segment.split()
            return words[: self.window_size]
