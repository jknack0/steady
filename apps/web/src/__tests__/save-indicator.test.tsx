import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { SaveIndicator } from "@/components/save-indicator";

describe("SaveIndicator", () => {
  it("renders nothing when idle", () => {
    const { container } = render(<SaveIndicator status="idle" />);
    expect(container.firstChild).toBeNull();
  });

  it("shows 'Saving...' when saving", () => {
    render(<SaveIndicator status="saving" />);
    expect(screen.getByText("Saving...")).toBeInTheDocument();
  });

  it("shows 'Saved' when saved", () => {
    render(<SaveIndicator status="saved" />);
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  it("shows 'Save failed' on error", () => {
    render(<SaveIndicator status="error" />);
    expect(screen.getByText("Save failed")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(<SaveIndicator status="saving" className="my-class" />);
    const el = screen.getByText("Saving...").closest("div");
    expect(el).toHaveClass("my-class");
  });

  it("applies error styling for error status", () => {
    render(<SaveIndicator status="error" />);
    const el = screen.getByText("Save failed").closest("div");
    expect(el).toHaveClass("text-destructive");
  });
});
