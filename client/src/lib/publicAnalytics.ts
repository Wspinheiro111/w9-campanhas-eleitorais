type PublicEventProperties = Record<string, string | number | boolean>;

declare global {
  interface Window {
    umami?: {
      track: (eventName: string, properties?: PublicEventProperties) => void;
    };
  }
}

/** Registra somente o nome do evento e contexto não identificável na analytics pública. */
export function trackPublicEvent(eventName: string, properties?: PublicEventProperties) {
  if (typeof window === "undefined") return;
  window.umami?.track(eventName, properties);
}
