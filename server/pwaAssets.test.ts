import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const publicDirectory = resolve(process.cwd(), "client/public");

describe("ativos PWA", () => {
  it("declara um ícone instalável no manifesto", () => {
    const manifest = JSON.parse(readFileSync(resolve(publicDirectory, "manifest.webmanifest"), "utf8")) as {
      display?: string;
      icons?: Array<{ src: string; type: string; purpose: string }>;
    };

    expect(manifest.display).toBe("standalone");
    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: expect.stringContaining("w9-pwa-icon-source"), type: "image/png", purpose: "any maskable" }),
    ]));
  });

  it("mantém fallback offline e limpeza de caches obsoletos", () => {
    const worker = readFileSync(resolve(publicDirectory, "sw.js"), "utf8");
    const offline = readFileSync(resolve(publicDirectory, "offline.html"), "utf8");

    expect(worker).toContain("w9-campaign-shell-v2");
    expect(worker).toContain("caches.delete(key)");
    expect(worker).toContain('"/offline.html"');
    expect(worker).toContain('event.data?.type === "SKIP_WAITING"');
    expect(offline).toContain("Você está sem conexão");
  });
});
