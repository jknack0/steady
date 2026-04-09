"""PHI entity data structures covering all 18 HIPAA identifiers."""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class PHICategory(str, Enum):
    """All 18 HIPAA Safe Harbor identifiers."""
    NAME = "NAME"
    DATE = "DATE"
    PHONE = "PHONE"
    FAX = "FAX"
    EMAIL = "EMAIL"
    SSN = "SSN"
    MRN = "MRN"
    HEALTH_PLAN_ID = "HEALTH_PLAN_ID"
    ACCOUNT_NUMBER = "ACCOUNT_NUMBER"
    LICENSE_NUMBER = "LICENSE_NUMBER"
    VEHICLE_ID = "VEHICLE_ID"
    DEVICE_ID = "DEVICE_ID"
    URL = "URL"
    IP_ADDRESS = "IP_ADDRESS"
    BIOMETRIC = "BIOMETRIC"
    PHOTO = "PHOTO"
    GEOGRAPHIC = "GEOGRAPHIC"
    OTHER_ID = "OTHER_ID"
    AGE_OVER_89 = "AGE_OVER_89"


class DetectionSource(str, Enum):
    """Which detector found this entity."""
    REGEX = "regex"
    ML = "ml"
    CONTEXT = "context"
    CHECKSUM = "checksum"
    MERGED = "merged"


@dataclass
class PHIEntity:
    """A detected PHI entity with confidence scoring and provenance."""
    text: str
    category: PHICategory
    start: int
    end: int
    confidence: float
    source: DetectionSource
    context_window: str = ""
    explanation: str = ""
    metadata: dict = field(default_factory=dict)

    @property
    def span(self) -> tuple[int, int]:
        return (self.start, self.end)

    def overlaps(self, other: "PHIEntity") -> bool:
        """Check if this entity overlaps with another."""
        return self.start < other.end and other.start < self.end

    def contains(self, other: "PHIEntity") -> bool:
        """Check if this entity fully contains another."""
        return self.start <= other.start and self.end >= other.end

    def __repr__(self) -> str:
        return (
            f"PHIEntity('{self.text}', {self.category.value}, "
            f"[{self.start}:{self.end}], conf={self.confidence:.2f}, "
            f"src={self.source.value})"
        )
