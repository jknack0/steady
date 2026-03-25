import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PageHeader } from "@/components/page-header";

describe("PageHeader", () => {
  it("renders title", () => {
    render(<PageHeader title="My Programs" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("My Programs");
  });

  it("renders subtitle when provided", () => {
    render(<PageHeader title="My Programs" subtitle="12 programs" />);
    expect(screen.getByText("12 programs")).toBeInTheDocument();
  });

  it("does not render subtitle when omitted", () => {
    const { container } = render(<PageHeader title="My Programs" />);
    expect(container.querySelector("p")).toBeNull();
  });

  it("renders actions slot", () => {
    render(
      <PageHeader title="My Programs" actions={<button>Create</button>} />
    );
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
  });
});
