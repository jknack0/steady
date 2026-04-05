"""Evaluation module — calculates precision, recall, F1 per category."""

import logging
from collections import defaultdict
from typing import List, Tuple

from rich.console import Console
from rich.table import Table
from rich.text import Text

from engine.entity import PHIEntity, PHICategory
from engine.pipeline import PHIPipeline
from .sample_data import get_samples, SampleNote

logger = logging.getLogger(__name__)
console = Console()


def _spans_overlap(a_start: int, a_end: int, b_start: int, b_end: int) -> bool:
    """Check if two spans overlap (partial match counts)."""
    return a_start < b_end and b_start < a_end


class EvaluationResult:
    """Stores per-category and overall evaluation metrics."""

    def __init__(self):
        self.tp: dict[str, int] = defaultdict(int)  # true positives
        self.fp: dict[str, int] = defaultdict(int)  # false positives
        self.fn: dict[str, int] = defaultdict(int)  # false negatives

    def precision(self, category: str = "OVERALL") -> float:
        tp = self.tp[category]
        fp = self.fp[category]
        return tp / (tp + fp) if (tp + fp) > 0 else 0.0

    def recall(self, category: str = "OVERALL") -> float:
        tp = self.tp[category]
        fn = self.fn[category]
        return tp / (tp + fn) if (tp + fn) > 0 else 0.0

    def f1(self, category: str = "OVERALL") -> float:
        p = self.precision(category)
        r = self.recall(category)
        return 2 * p * r / (p + r) if (p + r) > 0 else 0.0

    @property
    def categories(self) -> List[str]:
        all_cats = set(self.tp.keys()) | set(self.fp.keys()) | set(self.fn.keys())
        all_cats.discard("OVERALL")
        return sorted(all_cats)


def evaluate(pipeline: PHIPipeline, verbose: bool = True) -> EvaluationResult:
    """Run evaluation on all sample data."""
    samples = get_samples()
    result = EvaluationResult()

    for i, (text, ground_truth) in enumerate(samples):
        detections = pipeline.detect(text)
        _score_sample(detections, ground_truth, result)

        if verbose:
            _print_sample(i + 1, text, ground_truth, detections)

    # Print summary
    if verbose:
        _print_summary(result, len(samples))

    return result


def _score_sample(
    detections: List[PHIEntity],
    ground_truth: List[Tuple[int, int, PHICategory, str]],
    result: EvaluationResult,
) -> None:
    """Score a single sample against ground truth."""
    matched_gt = set()
    matched_det = set()

    for di, det in enumerate(detections):
        found_match = False
        for gi, (gt_start, gt_end, gt_cat, gt_text) in enumerate(ground_truth):
            if gi in matched_gt:
                continue

            # Check span overlap AND category match
            if _spans_overlap(det.start, det.end, gt_start, gt_end):
                if det.category == gt_cat:
                    result.tp[gt_cat.value] += 1
                    result.tp["OVERALL"] += 1
                    matched_gt.add(gi)
                    matched_det.add(di)
                    found_match = True
                    break

        if not found_match:
            result.fp[det.category.value] += 1
            result.fp["OVERALL"] += 1

    # Unmatched ground truth = false negatives
    for gi, (gt_start, gt_end, gt_cat, gt_text) in enumerate(ground_truth):
        if gi not in matched_gt:
            result.fn[gt_cat.value] += 1
            result.fn["OVERALL"] += 1


def _print_sample(
    idx: int,
    text: str,
    ground_truth: List[Tuple[int, int, PHICategory, str]],
    detections: List[PHIEntity],
) -> None:
    """Print a single sample with color-coded detections."""
    has_phi = len(ground_truth) > 0
    detected_count = len(detections)

    if not has_phi and detected_count == 0:
        return  # Clean sample correctly identified — skip verbose output

    status = "[green]OK[/green]" if not has_phi and detected_count == 0 else ""
    if has_phi:
        gt_matched = 0
        for gt_start, gt_end, gt_cat, gt_text in ground_truth:
            for det in detections:
                if _spans_overlap(det.start, det.end, gt_start, gt_end) and det.category == gt_cat:
                    gt_matched += 1
                    break
        status = f"[green]{gt_matched}/{len(ground_truth)} found[/green]" if gt_matched == len(ground_truth) else f"[yellow]{gt_matched}/{len(ground_truth)} found[/yellow]"

    console.print(f"\n[bold]Sample {idx}[/bold] {status}")

    # Show detections
    for det in detections:
        is_correct = any(
            _spans_overlap(det.start, det.end, gs, ge) and det.category == gc
            for gs, ge, gc, _ in ground_truth
        )
        color = "green" if is_correct else "red"
        console.print(
            f"  [{color}]{det.category.value:20s}[/{color}] "
            f"conf={det.confidence:.2f} "
            f"[dim]'{det.text}'[/dim] "
            f"[dim]({det.source.value})[/dim]"
        )

    # Show missed
    for gt_start, gt_end, gt_cat, gt_text in ground_truth:
        was_found = any(
            _spans_overlap(det.start, det.end, gt_start, gt_end) and det.category == gt_cat
            for det in detections
        )
        if not was_found:
            console.print(
                f"  [red]MISSED {gt_cat.value:17s}[/red] "
                f"[dim]'{gt_text}'[/dim]"
            )


def _print_summary(result: EvaluationResult, sample_count: int) -> None:
    """Print formatted summary table."""
    console.print("\n" + "=" * 60)
    console.print("[bold]PHI Detection Evaluation Summary[/bold]")
    console.print(f"Samples: {sample_count}")
    console.print("=" * 60)

    table = Table(title="Per-Category Results")
    table.add_column("Category", style="bold")
    table.add_column("TP", justify="right")
    table.add_column("FP", justify="right")
    table.add_column("FN", justify="right")
    table.add_column("Precision", justify="right")
    table.add_column("Recall", justify="right")
    table.add_column("F1", justify="right")

    for cat in result.categories:
        p = result.precision(cat)
        r = result.recall(cat)
        f = result.f1(cat)
        f1_color = "green" if f >= 0.8 else "yellow" if f >= 0.5 else "red"
        table.add_row(
            cat,
            str(result.tp[cat]),
            str(result.fp[cat]),
            str(result.fn[cat]),
            f"{p:.2%}",
            f"{r:.2%}",
            f"[{f1_color}]{f:.2%}[/{f1_color}]",
        )

    # Overall
    p = result.precision("OVERALL")
    r = result.recall("OVERALL")
    f = result.f1("OVERALL")
    f1_color = "green" if f >= 0.8 else "yellow" if f >= 0.5 else "red"
    table.add_row(
        "[bold]OVERALL[/bold]",
        f"[bold]{result.tp['OVERALL']}[/bold]",
        f"[bold]{result.fp['OVERALL']}[/bold]",
        f"[bold]{result.fn['OVERALL']}[/bold]",
        f"[bold]{p:.2%}[/bold]",
        f"[bold]{r:.2%}[/bold]",
        f"[bold][{f1_color}]{f:.2%}[/{f1_color}][/bold]",
    )

    console.print(table)
