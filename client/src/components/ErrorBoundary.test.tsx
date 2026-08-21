// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ErrorBoundary from "./ErrorBoundary";

function FailingArea(): never {
  throw new Error("falha de teste");
}

describe("ErrorBoundary", () => {
  it("oferece recuperação amigável sem expor detalhes técnicos", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(<ErrorBoundary><FailingArea /></ErrorBoundary>);
    expect(screen.getByRole("heading", { name: "Não foi possível carregar esta área." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recarregar página" })).toBeInTheDocument();
    expect(screen.queryByText(/falha de teste/i)).not.toBeInTheDocument();
  });
});
