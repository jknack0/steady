"""Abstract base class for all PHI detectors."""

from abc import ABC, abstractmethod
from typing import List

from engine.entity import PHIEntity


class BaseDetector(ABC):
    """Base class that all PHI detectors must implement."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable detector name."""
        ...

    @abstractmethod
    def detect(self, text: str) -> List[PHIEntity]:
        """
        Scan text and return all detected PHI entities.

        Args:
            text: The input text to scan.

        Returns:
            List of PHIEntity instances found in the text.
        """
        ...
