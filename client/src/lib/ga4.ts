const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
const CONSENT_STORAGE_KEY = "w9-analytics-consent";
const GA_SCRIPT_ID = "w9-ga4-script";

type AnalyticsConsent = "granted" | "denied";
type AnalyticsProperties = Record<string, string | number | boolean>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function readConsent(): AnalyticsConsent | null {
  try {
    const value = localStorage.getItem(CONSENT_STORAGE_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

export function getAnalyticsConsent(): AnalyticsConsent | null {
  return readConsent();
}

export function setAnalyticsConsent(consent: AnalyticsConsent) {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, consent);
  } catch {
    // O rastreamento permanece desativado quando o armazenamento não está disponível.
  }
}

export function isGoogleAnalyticsConfigured() {
  return Boolean(MEASUREMENT_ID && /^G-[A-Z0-9]{10,}$/.test(MEASUREMENT_ID));
}

export function initializeGoogleAnalytics() {
  if (typeof window === "undefined" || !isGoogleAnalyticsConfigured() || readConsent() !== "granted") return false;
  if (window.gtag) return true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = (...args: unknown[]) => window.dataLayer?.push(args);
  window.gtag("js", new Date());
  window.gtag("config", MEASUREMENT_ID, { send_page_view: false, anonymize_ip: true });

  if (!document.getElementById(GA_SCRIPT_ID)) {
    const script = document.createElement("script");
    script.id = GA_SCRIPT_ID;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(MEASUREMENT_ID!)}`;
    document.head.appendChild(script);
  }
  return true;
}

export function trackGooglePageView(path = window.location.pathname) {
  if (typeof window === "undefined" || !initializeGoogleAnalytics() || !window.gtag) return;
  window.gtag("event", "page_view", { page_location: `${window.location.origin}${path}`, page_path: path });
}

export function trackGoogleEvent(eventName: string, properties?: AnalyticsProperties) {
  if (typeof window === "undefined" || !initializeGoogleAnalytics() || !window.gtag) return;
  window.gtag("event", eventName, properties);
}
