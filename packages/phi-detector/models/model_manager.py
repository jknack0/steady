"""Model download and cache management."""

import logging
from pathlib import Path

logger = logging.getLogger(__name__)

CACHE_DIR = Path.home() / ".cache" / "phi_detector"


def ensure_model(model_name: str) -> bool:
    """Ensure a model is downloaded and cached."""
    try:
        if model_name.startswith("en_core_web"):
            import spacy
            try:
                spacy.load(model_name)
                return True
            except OSError:
                logger.info(f"Downloading spaCy model: {model_name}")
                from spacy.cli import download
                download(model_name)
                return True
        else:
            from transformers import AutoTokenizer, AutoModelForTokenClassification
            logger.info(f"Ensuring HuggingFace model cached: {model_name}")
            AutoTokenizer.from_pretrained(model_name)
            AutoModelForTokenClassification.from_pretrained(model_name)
            return True
    except Exception as e:
        logger.error(f"Failed to download model {model_name}: {e}")
        return False


def get_model_status() -> dict:
    """Check which models are available."""
    status = {}

    try:
        from transformers import AutoTokenizer
        AutoTokenizer.from_pretrained("obi/deid_roberta_i2b2", local_files_only=True)
        status["obi/deid_roberta_i2b2"] = "cached"
    except Exception:
        status["obi/deid_roberta_i2b2"] = "not cached"

    try:
        import spacy
        spacy.load("en_core_web_trf")
        status["en_core_web_trf"] = "available"
    except Exception:
        status["en_core_web_trf"] = "not available"

    return status
