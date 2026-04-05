"""Model download and cache management.

Run directly to pre-download models during Docker build:
    python models/model_manager.py

Model name is configurable via PHI_MODEL_NAME env var.
"""

import logging
import os

logger = logging.getLogger(__name__)

PHI_MODEL_NAME = os.environ.get("PHI_MODEL_NAME", "obi/deid_roberta_i2b2")


def ensure_model(model_name: str = PHI_MODEL_NAME) -> bool:
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
            logger.info(f"Downloading model: {model_name}")
            AutoTokenizer.from_pretrained(model_name)
            AutoModelForTokenClassification.from_pretrained(model_name)
            logger.info(f"Model {model_name} cached successfully")
            return True
    except Exception as e:
        logger.error(f"Failed to download model {model_name}: {e}")
        return False


def get_model_status() -> dict:
    """Check which models are available."""
    status = {}

    try:
        from transformers import AutoTokenizer
        AutoTokenizer.from_pretrained(PHI_MODEL_NAME, local_files_only=True)
        status[PHI_MODEL_NAME] = "cached"
    except Exception:
        status[PHI_MODEL_NAME] = "not cached"

    try:
        import spacy
        spacy.load("en_core_web_trf")
        status["en_core_web_trf"] = "available"
    except Exception:
        status["en_core_web_trf"] = "not available"

    return status


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print(f"Downloading model: {PHI_MODEL_NAME}")
    success = ensure_model()
    if success:
        print("Model downloaded successfully")
    else:
        print("WARNING: Model download failed. Service will run in regex-only mode.")
