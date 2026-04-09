import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PageHeader } from "@/components/page-header";

describe("PageHeader", () => {
  it("renders title", () => {
    const { getByRole } = render(<PageHeader title="My Programs" />);
    expect(getByRole("heading", { level: 1 })).toHaveTextContent("My Programs");
  });

  it("renders subtitle when provided", () => {
    const { getByText } = render(<PageHeader title="My Programs" subtitle="12 programs" />);
    expect(getByText("12 programs")).toBeInTheDocument();
  });

  it("does not render subtitle when omitted", () => {
    const { container } = render(<PageHeader title="My Programs" />);
    expect(container.querySelector("p")).toBeNull();
  });

  it("renders actions slot", () => {
    const { getByRole } = render(
      <PageHeader title="My Programs" actions={<button>Create</button>} />
    );
    expect(getByRole("button", { name: "Create" })).toBeInTheDocument();
  });
});
