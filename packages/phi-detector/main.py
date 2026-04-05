#!/usr/bin/env python3
"""PHI Detection Engine — CLI entrypoint."""

import logging
import sys
from pathlib import Path

# Add project root to path so imports work
sys.path.insert(0, str(Path(__file__).parent))

import typer
from rich.console import Console
from rich.text import Text

from engine.pipeline import PHIPipeline
from engine.redactor import RedactionStrategy

app = typer.Typer(
    name="phi-detector",
    help="Local, HIPAA-grade PHI detection and redaction engine.",
)
console = Console()


def _get_pipeline(no_ml: bool = False, strict: bool = False, min_conf: float = 0.4) -> PHIPipeline:
    """Initialize the pipeline with CLI options."""
    return PHIPipeline(
        enable_ml=not no_ml,
        strict_mode=strict,
        min_confidence=min_conf,
    )


@app.command()
def detect(
    input: str = typer.Option(None, "--input", "-i", help="Input file path"),
    text: str = typer.Option(None, "--text", "-t", help="Text string to scan"),
    no_ml: bool = typer.Option(False, "--no-ml", help="Disable ML model (regex-only mode)"),
    strict: bool = typer.Option(False, "--strict", help="Strict mode (maximize recall)"),
    min_confidence: float = typer.Option(0.4, "--min-confidence", "-c", help="Minimum confidence threshold"),
    json_output: bool = typer.Option(False, "--json", help="Output as JSON"),
):
    """Detect PHI in text or a file."""
    if not input and not text:
        console.print("[red]Error: provide --input or --text[/red]")
        raise typer.Exit(1)

    content = text
    if input:
        path = Path(input)
        if not path.exists():
            console.print(f"[red]File not found: {input}[/red]")
            raise typer.Exit(1)
        content = path.read_text(encoding="utf-8")

    pipeline = _get_pipeline(no_ml, strict, min_confidence)
    entities = pipeline.detect(content)

    if json_output:
        import json
        output = {
            "found": len(entities) > 0,
            "count": len(entities),
            "entities": [
                {
                    "text": e.text,
                    "category": e.category.value,
                    "start": e.start,
                    "end": e.end,
                    "confidence": round(e.confidence, 3),
                    "source": e.source.value,
                    "explanation": e.explanation,
                }
                for e in entities
            ],
        }
        console.print_json(json.dumps(output, indent=2))
    else:
        if not entities:
            console.print("[green]No PHI detected.[/green]")
        else:
            console.print(f"\n[bold red]Found {len(entities)} PHI entities:[/bold red]\n")
            for e in entities:
                console.print(
                    f"  [{e.category.value:20s}] "
                    f"conf={e.confidence:.2f} "
                    f"[dim]'{e.text}'[/dim] "
                    f"({e.source.value})"
                )

            # Show annotated text
            console.print(f"\n[bold]Annotated text:[/bold]")
            _print_annotated(content, entities)


@app.command()
def redact(
    input: str = typer.Option(None, "--input", "-i", help="Input file path"),
    text: str = typer.Option(None, "--text", "-t", help="Text string to redact"),
    output: str = typer.Option(None, "--output", "-o", help="Output file path"),
    strategy: str = typer.Option("category", "--strategy", "-s", help="Redaction strategy: redacted, category, mask, surrogate"),
    no_ml: bool = typer.Option(False, "--no-ml", help="Disable ML model"),
    min_confidence: float = typer.Option(0.4, "--min-confidence", "-c"),
):
    """Detect and redact PHI from text or a file."""
    if not input and not text:
        console.print("[red]Error: provide --input or --text[/red]")
        raise typer.Exit(1)

    content = text
    if input:
        path = Path(input)
        if not path.exists():
            console.print(f"[red]File not found: {input}[/red]")
            raise typer.Exit(1)
        content = path.read_text(encoding="utf-8")

    try:
        strat = RedactionStrategy(strategy)
    except ValueError:
        console.print(f"[red]Unknown strategy: {strategy}. Use: redacted, category, mask, surrogate[/red]")
        raise typer.Exit(1)

    pipeline = _get_pipeline(no_ml, False, min_confidence)
    redacted_text, entities, report = pipeline.detect_and_redact(content, strategy=strat)

    if output:
        Path(output).write_text(redacted_text, encoding="utf-8")
        console.print(f"[green]Redacted text written to {output}[/green]")
    else:
        console.print(f"\n[bold]Redacted text:[/bold]\n")
        console.print(redacted_text)

    console.print(f"\n[dim]{len(entities)} entities redacted using '{strategy}' strategy[/dim]")


@app.command()
def evaluate(
    no_ml: bool = typer.Option(False, "--no-ml", help="Disable ML model"),
    verbose: bool = typer.Option(True, "--verbose/--quiet", help="Show per-sample details"),
):
    """Run evaluation on synthetic clinical notes."""
    from evaluation.evaluator import evaluate as run_eval

    pipeline = _get_pipeline(no_ml, False, 0.4)
    run_eval(pipeline, verbose=verbose)


@app.command()
def serve(
    port: int = typer.Option(8000, "--port", "-p", help="Server port"),
    host: str = typer.Option("0.0.0.0", "--host", help="Server host"),
):
    """Start the FastAPI server."""
    import uvicorn
    console.print(f"[bold]Starting PHI Detection Server on {host}:{port}[/bold]")
    uvicorn.run("server:app", host=host, port=port, reload=False)


def _print_annotated(text: str, entities: list) -> None:
    """Print text with PHI highlighted in red."""
    rich_text = Text(text)
    for entity in sorted(entities, key=lambda e: e.start):
        rich_text.stylize("bold red", entity.start, entity.end)
    console.print(rich_text)


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(name)s %(levelname)s %(message)s",
    )
    app()
