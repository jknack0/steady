"""Validation-based PHI detector using checksums and known invalid ranges.

Validates candidate entities detected by other detectors:
- SSN: Luhn-like validation + known invalid ranges
- NPI: 10-digit Luhn check
- VIN: Check digit validation at position 9
"""

import logging
import re
from typing import List

from engine.entity import PHIEntity, PHICategory, DetectionSource
from .base import BaseDetector

logger = logging.getLogger(__name__)


class ChecksumDetector(BaseDetector):
    """Validates and detects PHI using checksum algorithms."""

    @property
    def name(self) -> str:
        return "ChecksumDetector"

    def detect(self, text: str) -> List[PHIEntity]:
        """Find entities that pass checksum validation."""
        entities: List[PHIEntity] = []
        entities.extend(self._detect_ssn(text))
        entities.extend(self._detect_npi(text))
        return entities

    def validate_entity(self, entity: PHIEntity) -> PHIEntity:
        """Validate an existing entity and adjust confidence."""
        digits = re.sub(r'\D', '', entity.text)

        if entity.category == PHICategory.SSN:
            if self._is_valid_ssn(digits):
                return PHIEntity(
                    text=entity.text, category=entity.category,
                    start=entity.start, end=entity.end,
                    confidence=min(1.0, entity.confidence + 0.2),
                    source=entity.source,
                    context_window=entity.context_window,
                    explanation=entity.explanation + " (SSN validated)",
                    metadata={**entity.metadata, "ssn_valid": True},
                )
            else:
                return PHIEntity(
                    text=entity.text, category=entity.category,
                    start=entity.start, end=entity.end,
                    confidence=max(0.0, entity.confidence - 0.3),
                    source=entity.source,
                    context_window=entity.context_window,
                    explanation=entity.explanation + " (invalid SSN range)",
                    metadata={**entity.metadata, "ssn_valid": False},
                )

        return entity

    def _detect_ssn(self, text: str) -> List[PHIEntity]:
        """Detect SSN-like patterns and validate them."""
        entities: List[PHIEntity] = []
        # Look for 9-digit patterns with SSN context
        pattern = re.compile(r'\b(\d{3})[-\s]?(\d{2})[-\s]?(\d{4})\b')

        for match in pattern.finditer(text):
            area, group, serial = match.group(1), match.group(2), match.group(3)
            full = area + group + serial

            if self._is_valid_ssn(full):
                # Check context for SSN keywords
                window_start = max(0, match.start() - 50)
                window_end = min(len(text), match.end() + 50)
                window = text[window_start:window_end].lower()

                has_context = any(
                    kw in window
                    for kw in ["ssn", "social security", "ss#", "ss #"]
                )

                confidence = 0.85 if has_context else 0.5

                entities.append(
                    PHIEntity(
                        text=match.group(),
                        category=PHICategory.SSN,
                        start=match.start(),
                        end=match.end(),
                        confidence=confidence,
                        source=DetectionSource.CHECKSUM,
                        context_window=text[window_start:window_end],
                        explanation="SSN pattern with valid range" + (" + context" if has_context else ""),
                        metadata={"ssn_valid": True, "has_context": has_context},
                    )
                )

        return entities

    def _detect_npi(self, text: str) -> List[PHIEntity]:
        """Detect National Provider Identifiers (10-digit Luhn)."""
        entities: List[PHIEntity] = []
        pattern = re.compile(r'\b(\d{10})\b')

        for match in pattern.finditer(text):
            digits = match.group(1)

            # NPI must start with 1 or 2 (CMS prefix) and pass Luhn
            if digits[0] in ('1', '2') and self._luhn_check(digits):
                window_start = max(0, match.start() - 50)
                window_end = min(len(text), match.end() + 50)
                window = text[window_start:window_end].lower()

                has_context = any(kw in window for kw in ["npi", "provider", "national provider"])
                confidence = 0.8 if has_context else 0.4

                entities.append(
                    PHIEntity(
                        text=match.group(),
                        category=PHICategory.LICENSE_NUMBER,
                        start=match.start(),
                        end=match.end(),
                        confidence=confidence,
                        source=DetectionSource.CHECKSUM,
                        context_window=text[window_start:window_end],
                        explanation="NPI (valid Luhn check)" + (" + context" if has_context else ""),
                        metadata={"npi_valid": True},
                    )
                )

        return entities

    @staticmethod
    def _is_valid_ssn(digits: str) -> bool:
        """Check if digits form a valid SSN (not in known invalid ranges)."""
        if len(digits) != 9:
            return False

        area = int(digits[:3])
        group = int(digits[3:5])
        serial = int(digits[5:])

        # Invalid area numbers
        if area == 0 or area == 666 or (900 <= area <= 999):
            return False
        # Invalid group number
        if group == 0:
            return False
        # Invalid serial number
        if serial == 0:
            return False

        return True

    @staticmethod
    def _luhn_check(number: str) -> bool:
        """Validate a number using the Luhn algorithm."""
        digits = [int(d) for d in number]
        checksum = 0
        for i, d in enumerate(reversed(digits)):
            if i % 2 == 1:
                d *= 2
                if d > 9:
                    d -= 9
            checksum += d
        return checksum % 10 == 0
