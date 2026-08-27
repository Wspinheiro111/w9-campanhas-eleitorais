// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import PublicSeoPage, { seoPages } from "./PublicSeoPage";

afterEach(() => {
  document.head.querySelector("#w9-seo-page-schema")?.remove();
});

describe("páginas públicas de SEO", () => {
  it("apresenta o CRM eleitoral com conteúdo operacional, uso responsável e demonstração", () => {
    render(<PublicSeoPage pageKey="crm" />);

    expect(screen.getByRole("heading", { level: 1, name: /crm eleitoral para organizar contatos/i })).toBeInTheDocument();
    expect(screen.getByText(/consentimento e acesso/i)).toBeInTheDocument();
    expect(screen.getByText(/não deve ser usado para perfilamento ilícito/i)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /demonstração/i })[0]).toHaveAttribute("href", "/#demonstracao");
    expect(document.title).toContain("CRM eleitoral");
    expect(document.head.querySelector("#w9-seo-page-schema")?.textContent).toContain("SoftwareApplication");
  });

  it("mantém cinco páginas de intenção comercial com URLs públicas distintas", () => {
    const paths = Object.values(seoPages).map((page) => page.path);

    expect(paths).toEqual([
      "/gestao-de-campanha-eleitoral",
      "/crm-eleitoral",
      "/gestao-de-equipe-de-campanha",
      "/gestao-de-campo-eleitoral",
      "/financeiro-e-juridico-de-campanha",
    ]);
  });
});
