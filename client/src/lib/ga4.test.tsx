// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  getAnalyticsConsent,
  initializeGoogleAnalytics,
  setAnalyticsConsent,
  trackGoogleEvent,
} from "./ga4";

afterEach(() => {
  localStorage.clear();
  document.getElementById("w9-ga4-script")?.remove();
  delete window.dataLayer;
  delete window.gtag;
});

describe("Google Analytics 4 consentido", () => {
  it("não carrega a tag antes do consentimento", () => {
    expect(getAnalyticsConsent()).toBeNull();
    expect(initializeGoogleAnalytics()).toBe(false);
    expect(document.getElementById("w9-ga4-script")).toBeNull();
  });

  it("carrega a tag somente após consentimento explícito", () => {
    setAnalyticsConsent("granted");
    expect(initializeGoogleAnalytics()).toBe(true);
    expect(document.getElementById("w9-ga4-script")).not.toBeNull();
    expect(window.dataLayer).toBeDefined();
  });

  it("ignora eventos quando o visitante recusa a medição", () => {
    setAnalyticsConsent("denied");
    expect(() => trackGoogleEvent("test_event", { source: "test" })).not.toThrow();
    expect(window.dataLayer).toBeUndefined();
  });
});
