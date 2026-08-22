// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Landing from "./Landing";

describe("página institucional", () => {
  it("apresenta o sistema e mantém o acesso à conta no encerramento", () => {
    render(<Landing />);
    expect(screen.getByText("Mais clareza para decidir. Mais ritmo para mobilizar.")).toBeInTheDocument();
    expect(screen.getByText("Acesso à conta")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Entrar na conta" })).toHaveAttribute("href", "/login");
  });
});
