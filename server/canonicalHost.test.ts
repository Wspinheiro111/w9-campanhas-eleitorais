import { describe, expect, it, vi } from "vitest";
import { canonicalW9HostRedirect } from "./canonicalHost";

function request(host: string, path = "/") {
  return { get: (name: string) => name === "host" ? host : undefined, originalUrl: path, url: path } as never;
}

describe("redirecionamento canônico W9", () => {
  it("redireciona o domínio raiz para www preservando rota e consulta", () => {
    const redirect = vi.fn();
    canonicalW9HostRedirect(request("w9campanhaseleitorais.com.br"), { redirect } as never, vi.fn());
    expect(redirect).toHaveBeenCalledWith(308, "https://www.w9campanhaseleitorais.com.br/");
  });

  it("mantém o host canônico e ambientes de desenvolvimento sem redirecionar", () => {
    const next = vi.fn();
    canonicalW9HostRedirect(request("www.w9campanhaseleitorais.com.br", "/login?from=landing"), { redirect: vi.fn() } as never, next);
    expect(next).toHaveBeenCalledOnce();
  });
});
