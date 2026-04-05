"""Overlap resolution and entity merging.

When multiple detectors flag the same text span, this module resolves
conflicts using confidence scores and specificity ranking.
"""

import logging
from typing import List

from .entity import PHIEntity, PHICategory, DetectionSource

logger = logging.getLogger(__name__)

# More specific categories win over generic ones
SPECIFICITY_RANK: dict[PHICategory, int] = {
    PHICategory.SSN: 10,
    PHICategory.MRN: 10,
    PHICategory.HEALTH_PLAN_ID: 9,
    PHICategory.LICENSE_NUMBER: 9,
    PHICategory.VEHICLE_ID: 9,
    PHICategory.DEVICE_ID: 9,
    PHICategory.IP_ADDRESS: 9,
    PHICategory.EMAIL: 8,
    PHICategory.URL: 8,
    PHICategory.PHONE: 8,
    PHICategory.FAX: 8,
    PHICategory.ACCOUNT_NUMBER: 7,
    PHICategory.DATE: 6,
    PHICategory.AGE_OVER_89: 6,
    PHICategory.GEOGRAPHIC: 5,
    PHICategory.NAME: 4,
    PHICategory.BIOMETRIC: 3,
    PHICategory.PHOTO: 3,
    PHICategory.OTHER_ID: 1,
}


class EntityResolver:
    """Resolves overlapping entity detections into a clean, non-overlapping set."""

    def __init__(self, strict_mode: bool = False):
        """
        Args:
            strict_mode: If True, maximize recall (keep all detections).
                         If False, prefer higher-confidence/more-specific detections.
        """
        self.strict_mode = strict_mode

    def resolve(self, entities: List[PHIEntity]) -> List[PHIEntity]:
        """Resolve overlapping entities into a non-overlapping set."""
        if not entities:
            return []

        # Sort by start position, then by length (longer first), then by confidence
        sorted_entities = sorted(
            entities,
            key=lambda e: (e.start, -(e.end - e.start), -e.confidence),
        )

        resolved: List[PHIEntity] = []

        for entity in sorted_entities:
            overlap_found = False
            for i, existing in enumerate(resolved):
                if entity.overlaps(existing):
                    overlap_found = True
                    winner = self._pick_winner(existing, entity)
                    if winner is entity:
                        resolved[i] = self._merge(entity, existing)
                    else:
                        resolved[i] = self._merge(existing, entity)
                    break

            if not overlap_found:
                resolved.append(entity)

        # Merge adjacent entities of the same type
        resolved = self._merge_adjacent(resolved)

        return sorted(resolved, key=lambda e: e.start)

    def _pick_winner(self, a: PHIEntity, b: PHIEntity) -> PHIEntity:
        """Pick the winner between two overlapping entities."""
        if self.strict_mode:
            # In strict mode, prefer the more specific detection
            spec_a = SPECIFICITY_RANK.get(a.category, 0)
            spec_b = SPECIFICITY_RANK.get(b.category, 0)
            if spec_a != spec_b:
                return a if spec_a > spec_b else b

        # Higher confidence wins
        if abs(a.confidence - b.confidence) > 0.1:
            return a if a.confidence > b.confidence else b

        # More specific category wins
        spec_a = SPECIFICITY_RANK.get(a.category, 0)
        spec_b = SPECIFICITY_RANK.get(b.category, 0)
        if spec_a != spec_b:
            return a if spec_a > spec_b else b

        # Longer span wins (more context captured)
        len_a = a.end - a.start
        len_b = b.end - b.start
        if len_a != len_b:
            return a if len_a > len_b else b

        return a

    def _merge(self, winner: PHIEntity, loser: PHIEntity) -> PHIEntity:
        """Merge loser's info into winner."""
        return PHIEntity(
            text=winner.text,
            category=winner.category,
            start=min(winner.start, loser.start),
            end=max(winner.end, loser.end),
            confidence=max(winner.confidence, loser.confidence),
            source=DetectionSource.MERGED if winner.source != loser.source else winner.source,
            context_window=winner.context_window or loser.context_window,
            explanation=f"{winner.explanation}; also detected by {loser.source.value}",
            metadata={**loser.metadata, **winner.metadata},
        )

    def _merge_adjacent(self, entities: List[PHIEntity]) -> List[PHIEntity]:
        """Merge adjacent entities of the same type (within 2 chars)."""
        if len(entities) < 2:
            return entities

        merged: List[PHIEntity] = [entities[0]]
        for entity in entities[1:]:
            last = merged[-1]
            if (
                entity.category == last.category
                and entity.start - last.end <= 2
            ):
                merged[-1] = PHIEntity(
                    text=last.text + entity.text,
                    category=last.category,
                    start=last.start,
                    end=entity.end,
                    confidence=max(last.confidence, entity.confidence),
                    source=last.source,
                    context_window=last.context_window,
                    explanation=last.explanation,
                )
            else:
                merged.append(entity)

        return merged
