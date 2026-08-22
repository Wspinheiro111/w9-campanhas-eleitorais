import { afterEach, describe, expect, it } from "vitest";
import type { Server } from "http";
import { getViteServerOptions } from "./vite";

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
    const options = getViteServerOptions({} as Server);
    expect(options.hmr).not.toHaveProperty("clientPort");
  });
});
