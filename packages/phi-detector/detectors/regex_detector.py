"""Pattern-based PHI detector using pre-compiled regex patterns."""

import logging
import re
from pathlib import Path
from typing import List, Optional

import yaml

from engine.entity import PHIEntity, PHICategory, DetectionSource
from .base import BaseDetector

logger = logging.getLogger(__name__)

PATTERNS_FILE = Path(__file__).parent.parent / "config" / "patterns.yaml"


class CompiledPattern:
    """A pre-compiled regex pattern with metadata."""

    def __init__(
        self,
        regex: re.Pattern,
        category: PHICategory,
        confidence: float,
        context_keywords: List[str],
        context_boost: float,
    ):
        self.regex = regex
        self.category = category
        self.confidence = confidence
        self.context_keywords = context_keywords
        self.context_boost = context_boost


class RegexDetector(BaseDetector):
    """Detects PHI using pre-compiled regex patterns from patterns.yaml."""

    def __init__(self, patterns_file: Optional[Path] = None):
        self._patterns: List[CompiledPattern] = []
        self._load_patterns(patterns_file or PATTERNS_FILE)

    @property
    def name(self) -> str:
        return "RegexDetector"

    def _load_patterns(self, path: Path) -> None:
        """Load and pre-compile all patterns from YAML config."""
        with open(path) as f:
            config = yaml.safe_load(f)

        for _key, group in config.items():
            try:
                category = PHICategory(group["category"])
            except (ValueError, KeyError):
                logger.warning(f"Unknown category in patterns: {group.get('category')}")
                continue

            context_keywords = [kw.lower() for kw in group.get("context_keywords", [])]
            context_boost = group.get("context_boost", 0.0)

            for pattern_def in group.get("patterns", []):
                try:
                    compiled = re.compile(pattern_def["regex"], re.IGNORECASE | re.UNICODE)
                    self._patterns.append(
                        CompiledPattern(
                            regex=compiled,
                            category=category,
                            confidence=pattern_def.get("confidence", 0.5),
                            context_keywords=context_keywords,
                            context_boost=context_boost,
                        )
                    )
                except re.error as e:
                    logger.warning(f"Failed to compile pattern: {pattern_def['regex']} — {e}")

        logger.info(f"Loaded {len(self._patterns)} regex patterns")

    def detect(self, text: str) -> List[PHIEntity]:
        """Scan text using all compiled patterns."""
        entities: List[PHIEntity] = []
        text_lower = text.lower()

        for pattern in self._patterns:
            for match in pattern.regex.finditer(text):
                matched_text = match.group()
                start, end = match.start(), match.end()

                # Calculate confidence with context boost
                confidence = pattern.confidence
                if pattern.context_keywords:
                    # Check surrounding text (100 chars before and after) for context
                    window_start = max(0, start - 100)
                    window_end = min(len(text), end + 100)
                    window = text_lower[window_start:window_end]

                    if any(kw in window for kw in pattern.context_keywords):
                        confidence = min(1.0, confidence + pattern.context_boost)

                # Get context window for explainability
                ctx_start = max(0, start - 30)
                ctx_end = min(len(text), end + 30)
                context_window = text[ctx_start:ctx_end]

                entities.append(
                    PHIEntity(
                        text=matched_text,
                        category=pattern.category,
                        start=start,
                        end=end,
                        confidence=confidence,
                        source=DetectionSource.REGEX,
                        context_window=context_window,
                        explanation=f"Matched {pattern.category.value} pattern",
                    )
                )

        return entities
