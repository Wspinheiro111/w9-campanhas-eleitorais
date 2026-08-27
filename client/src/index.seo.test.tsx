import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "../..");

describe("fundamentos de SEO público", () => {
  it("mantém a landing com canonical, metadados sociais e dados estruturados", async () => {
    const indexHtml = await readFile(resolve(projectRoot, "client/index.html"), "utf8");

    expect(indexHtml).toContain('rel="canonical" href="https://w9campanhaseleitorais.com.br/"');
    expect(indexHtml).toContain('property="og:title"');
    expect(indexHtml).toContain('name="twitter:card" content="summary_large_image"');
    expect(indexHtml).toContain('type="application/ld+json"');
    expect(indexHtml).toContain('"@type": "SoftwareApplication"');
  });

  it("expõe robots e sitemap com o domínio raiz oficial", async () => {
    const robots = await readFile(resolve(projectRoot, "client/public/robots.txt"), "utf8");
    const sitemap = await readFile(resolve(projectRoot, "client/public/sitemap.xml"), "utf8");

    expect(robots).toContain("Sitemap: https://w9campanhaseleitorais.com.br/sitemap.xml");
    expect(robots).toContain("Disallow: /paineladmin");
    expect(sitemap).toContain("https://w9campanhaseleitorais.com.br/");
    expect(sitemap).toContain("http://www.sitemaps.org/schemas/sitemap/0.9");
  });
});
