import { afterEach, describe, expect, it } from "vitest";
import type { Server } from "http";
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
});
