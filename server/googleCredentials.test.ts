import { describe, expect, it } from "vitest";

describe("Google OAuth credentials", () => {
  it("are accepted by the Google token endpoint", async () => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    expect(clientId).toBeTruthy();
    expect(clientSecret).toBeTruthy();

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        code: "credential-validation-probe",
        grant_type: "authorization_code",
        redirect_uri: "https://w9campaigns-qbzudlmj.manus.space/api/auth/google/callback",
      }),
    });

    // A valid client with a deliberately invalid authorization code returns 400.
    // Invalid client credentials return 401 and fail this assertion.
    expect(response.status).toBe(400);
  });
});
