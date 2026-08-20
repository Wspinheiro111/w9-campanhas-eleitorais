import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("auth.me privacy", () => {
  it("does not expose password hashes or provider identifiers to the client", async () => {
    const ctx: TrpcContext = {
      user: {
        id: 7,
        openId: "private-user",
        name: "Pessoa Privada",
        email: "private@example.com",
        passwordHash: "argon2$private-hash",
        googleId: "google-subject-id",
        avatarUrl: null,
        loginMethod: "password",
        themePreference: "violet",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };

    const result = await appRouter.createCaller(ctx).auth.me();

    expect(result).toMatchObject({ id: 7, email: "private@example.com", themePreference: "violet" });
    expect(result).not.toHaveProperty("passwordHash");
    expect(result).not.toHaveProperty("googleId");
    expect(result).not.toHaveProperty("openId");
  });
});
