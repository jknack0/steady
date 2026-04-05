import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import React from "react";
import { SaveIndicator } from "@/components/save-indicator";

describe("SaveIndicator", () => {
  it("renders nothing when idle", () => {
    const { container } = render(<SaveIndicator status="idle" />);
    expect(container.firstChild).toBeNull();
  });

  it("shows 'Saving...' when saving", () => {
    const { getByText } = render(<SaveIndicator status="saving" />);
    expect(getByText("Saving...")).toBeInTheDocument();
  });

  it("shows 'Saved' when saved", () => {
    const { getByText } = render(<SaveIndicator status="saved" />);
    expect(getByText("Saved")).toBeInTheDocument();
  });

  it("shows 'Save failed' on error", () => {
    const { getByText } = render(<SaveIndicator status="error" />);
    expect(getByText("Save failed")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { getByText } = render(<SaveIndicator status="saving" className="my-class" />);
    const el = getByText("Saving...").closest("div");
    expect(el).toHaveClass("my-class");
  });

  it("applies error styling for error status", () => {
    const { getByText } = render(<SaveIndicator status="error" />);
    const el = getByText("Save failed").closest("div");
    expect(el).toHaveClass("text-destructive");
  });
});
