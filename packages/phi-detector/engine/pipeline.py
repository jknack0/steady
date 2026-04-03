"""PHI detection pipeline orchestrator.

Runs all enabled detectors, resolves overlaps, applies context
adjustments, and returns a clean set of detected PHI entities.
"""

import logging
import time
from pathlib import Path
from typing import List, Optional

import yaml

from .entity import PHIEntity, PHICategory, DetectionSource
from .resolver import EntityResolver
from .redactor import Redactor, RedactionStrategy

logger = logging.getLogger(__name__)

CONFIG_FILE = Path(__file__).parent.parent / "config" / "default.yaml"


class PHIPipeline:
    """Orchestrates all PHI detectors into a single detection pipeline."""

    def __init__(
        self,
        config_path: Optional[Path] = None,
        enable_ml: bool = True,
        strict_mode: bool = False,
        min_confidence: float = 0.4,
    ):
        self.config = self._load_config(config_path or CONFIG_FILE)
        self.min_confidence = min_confidence
        self.strict_mode = strict_mode
        self.resolver = EntityResolver(strict_mode=strict_mode)
        self._detectors = []

        self._init_detectors(enable_ml)

    def _load_config(self, path: Path) -> dict:
        """Load pipeline configuration."""
        try:
            with open(path) as f:
                return yaml.safe_load(f)
        except Exception as e:
            logger.warning(f"Failed to load config: {e}. Using defaults.")
            return {"pipeline": {"detectors": {"regex": True, "ml": True, "context": True, "checksum": True}}}

    def _init_detectors(self, enable_ml: bool) -> None:
        """Initialize all enabled detectors."""
        detector_config = self.config.get("pipeline", {}).get("detectors", {})

        if detector_config.get("regex", True):
            from detectors.regex_detector import RegexDetector
            self._detectors.append(RegexDetector())
            logger.info("RegexDetector enabled")

        if detector_config.get("checksum", True):
            from detectors.checksum_detector import ChecksumDetector
            self._detectors.append(ChecksumDetector())
            logger.info("ChecksumDetector enabled")

        if enable_ml and detector_config.get("ml", True):
            try:
                from detectors.ml_detector import MLDetector
                ml_config = self.config.get("ml", {})
                self._detectors.append(
                    MLDetector(
                        model_name=ml_config.get("primary_model", "obi/deid_roberta_i2b2"),
                        fallback_model=ml_config.get("fallback_model", "en_core_web_trf"),
                        use_gpu=ml_config.get("use_gpu", True),
                        max_length=ml_config.get("max_length", 512),
                    )
                )
                logger.info("MLDetector enabled")
            except Exception as e:
                logger.warning(f"MLDetector initialization failed: {e}. Continuing without ML.")

        # Context detector is always initialized (used for post-processing)
        if detector_config.get("context", True):
            from detectors.context_detector import ContextDetector
            window_size = self.config.get("pipeline", {}).get("context_window_size", 10)
            self._context_detector = ContextDetector(window_size=window_size)
            self._detectors.append(self._context_detector)
            logger.info("ContextDetector enabled")
        else:
            self._context_detector = None

    def detect(self, text: str) -> List[PHIEntity]:
        """
        Run the full detection pipeline on input text.

        Returns:
            Sorted list of detected PHI entities with confidence >= min_confidence.
        """
        start_time = time.time()
        all_entities: List[PHIEntity] = []

        # Run all detectors
        for detector in self._detectors:
            try:
                entities = detector.detect(text)
                logger.debug(f"{detector.name} found {len(entities)} entities")
                all_entities.extend(entities)
            except Exception as e:
                logger.warning(f"{detector.name} failed: {e}")

        # Apply context-based confidence adjustment
        if self._context_detector and all_entities:
            all_entities = self._context_detector.adjust_confidence(text, all_entities)

        # Validate with checksum detector
        from detectors.checksum_detector import ChecksumDetector
        for detector in self._detectors:
            if isinstance(detector, ChecksumDetector):
                all_entities = [detector.validate_entity(e) for e in all_entities]
                break

        # Resolve overlaps
        resolved = self.resolver.resolve(all_entities)

        # Filter by confidence threshold
        filtered = [e for e in resolved if e.confidence >= self.min_confidence]

        # Post-filter: ambiguous ID-like categories from ML need cross-validation
        # The ML model's "ID" label is too broad — flags clinical scores, codes, etc.
        AMBIGUOUS_ML_CATEGORIES = {
            PHICategory.MRN, PHICategory.ACCOUNT_NUMBER,
            PHICategory.OTHER_ID, PHICategory.HEALTH_PLAN_ID,
        }

        # Build set of spans confirmed by regex/context/checksum
        non_ml_spans = set()
        for entity in all_entities:
            if entity.source != DetectionSource.ML:
                non_ml_spans.add((entity.start, entity.end, entity.category))

        confirmed: List[PHIEntity] = []
        for entity in filtered:
            if entity.category in AMBIGUOUS_ML_CATEGORIES:
                # Only keep if: confirmed by another detector, merged, or has very high confidence with context
                is_cross_validated = any(
                    entity.overlaps(PHIEntity(text="", category=cat, start=s, end=e, confidence=0, source=DetectionSource.REGEX))
                    for s, e, cat in non_ml_spans
                    if cat == entity.category
                )
                if entity.source == DetectionSource.MERGED or is_cross_validated:
                    confirmed.append(entity)
                elif entity.source != DetectionSource.ML and entity.confidence >= 0.6:
                    confirmed.append(entity)
                # ML-only ambiguous detections are dropped unless cross-validated
            else:
                confirmed.append(entity)

        filtered = confirmed

        elapsed = time.time() - start_time
        logger.info(
            f"Pipeline complete: {len(filtered)} entities detected "
            f"({len(all_entities)} raw, {len(resolved)} resolved) "
            f"in {elapsed:.3f}s"
        )

        return filtered

    def detect_and_redact(
        self,
        text: str,
        strategy: RedactionStrategy = RedactionStrategy.CATEGORY,
    ) -> tuple[str, List[PHIEntity], List[dict]]:
        """
        Detect PHI and redact in one call.

        Returns:
            Tuple of (redacted_text, entities, redaction_report).
        """
        entities = self.detect(text)
        redactor = Redactor(strategy=strategy)
        redacted_text, report = redactor.redact(text, entities)
        return redacted_text, entities, report
