"""Redaction engine with multiple strategies."""

import logging
from enum import Enum
from typing import List, Optional

from faker import Faker

from .entity import PHIEntity, PHICategory

logger = logging.getLogger(__name__)
fake = Faker()
Faker.seed(42)


class RedactionStrategy(str, Enum):
    REDACTED = "redacted"       # [REDACTED]
    CATEGORY = "category"       # [NAME], [SSN], etc.
    MASK = "mask"               # *** (length-preserving)
    SURROGATE = "surrogate"     # Replace with realistic fakes


# Surrogate generators per category
def _surrogate_name() -> str:
    return fake.name()

def _surrogate_date() -> str:
    return fake.date(pattern="%m/%d/%Y")

def _surrogate_phone() -> str:
    return fake.phone_number()

def _surrogate_email() -> str:
    return fake.email()

def _surrogate_ssn() -> str:
    return fake.ssn()

def _surrogate_address() -> str:
    return fake.street_address()

def _surrogate_url() -> str:
    return fake.url()

def _surrogate_ip() -> str:
    return fake.ipv4()

def _surrogate_generic() -> str:
    return f"[{fake.bothify('??####')}]"


SURROGATE_MAP: dict[PHICategory, callable] = {
    PHICategory.NAME: _surrogate_name,
    PHICategory.DATE: _surrogate_date,
    PHICategory.PHONE: _surrogate_phone,
    PHICategory.FAX: _surrogate_phone,
    PHICategory.EMAIL: _surrogate_email,
    PHICategory.SSN: _surrogate_ssn,
    PHICategory.GEOGRAPHIC: _surrogate_address,
    PHICategory.URL: _surrogate_url,
    PHICategory.IP_ADDRESS: _surrogate_ip,
}


class Redactor:
    """Redacts PHI from text using configurable strategies."""

    def __init__(self, strategy: RedactionStrategy = RedactionStrategy.CATEGORY):
        self.strategy = strategy

    def redact(
        self, text: str, entities: List[PHIEntity]
    ) -> tuple[str, List[dict]]:
        """
        Redact PHI from text.

        Returns:
            Tuple of (redacted_text, report) where report is a list of
            dicts describing each redaction.
        """
        if not entities:
            return text, []

        # Sort by start position descending so replacements don't shift indices
        sorted_entities = sorted(entities, key=lambda e: e.start, reverse=True)
        redacted = text
        report: List[dict] = []

        for entity in sorted_entities:
            replacement = self._get_replacement(entity)
            redacted = redacted[: entity.start] + replacement + redacted[entity.end :]
            report.append({
                "original": entity.text,
                "replacement": replacement,
                "category": entity.category.value,
                "start": entity.start,
                "end": entity.end,
                "confidence": round(entity.confidence, 3),
                "source": entity.source.value,
            })

        report.reverse()  # Restore original order
        return redacted, report

    def _get_replacement(self, entity: PHIEntity) -> str:
        """Generate replacement text based on strategy."""
        if self.strategy == RedactionStrategy.REDACTED:
            return "[REDACTED]"

        if self.strategy == RedactionStrategy.CATEGORY:
            return f"[{entity.category.value}]"

        if self.strategy == RedactionStrategy.MASK:
            return "*" * len(entity.text)

        if self.strategy == RedactionStrategy.SURROGATE:
            generator = SURROGATE_MAP.get(entity.category, _surrogate_generic)
            return generator()

        return "[REDACTED]"
