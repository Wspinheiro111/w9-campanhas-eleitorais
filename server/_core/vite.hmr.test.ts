import { afterEach, describe, expect, it } from "vitest";
import type { Server } from "http";
import viteConfig from "../../vite.config";
import { getViteServerOptions, SPA_FALLBACK_PATH } from "./vite";

const originalProjectId = process.env.MANUS_WEBDEV_PROJECT_ID;

afterEach(() => {
  if (originalProjectId === undefined) delete process.env.MANUS_WEBDEV_PROJECT_ID;
  else process.env.MANUS_WEBDEV_PROJECT_ID = originalProjectId;
});

describe("configuração de HMR da prévia", () => {
  it("usa WSS na porta pública quando está em prévia hospedada", () => {
    process.env.MANUS_WEBDEV_PROJECT_ID = "project-preview";
    const options = getViteServerOptions({} as Server);
    expect(options.hmr).toMatchObject({ protocol: "wss", clientPort: 443 });
  });

  it("mantém o HMR padrão para desenvolvimento local", () => {
    delete process.env.MANUS_WEBDEV_PROJECT_ID;
    process.env.PORT = "3000";
    const options = getViteServerOptions({} as Server);
    expect(options.hmr).toMatchObject({ protocol: "ws", clientPort: 3000 });
  });

  it("usa um fallback SPA compatível com o Express 5", () => {
    expect(SPA_FALLBACK_PATH).toBe("/{*splat}");
  });

  it("resolve React e seus runtimes por uma única instalação física", () => {
    const resolve = viteConfig.resolve;
    const aliases = resolve?.alias as Record<string, string>;

    expect(resolve?.dedupe).toEqual(expect.arrayContaining(["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"]));
    expect(aliases.react).toContain("node_modules/react");
    expect(aliases["react-dom"]).toContain("node_modules/react-dom");
    expect(aliases["react/jsx-runtime"]).toContain("node_modules/react/jsx-runtime.js");
    expect(aliases["react/jsx-dev-runtime"]).toContain("node_modules/react/jsx-dev-runtime.js");
  });

  it("não injeta o runtime visual que traz uma segunda cópia de React", () => {
    const plugins = (viteConfig.plugins ?? []).flat().filter((plugin): plugin is { name?: string } => typeof plugin === "object" && plugin !== null);

    expect(plugins.some(plugin => plugin.name === "vite-plugin-manus-runtime")).toBe(false);
  });
});
