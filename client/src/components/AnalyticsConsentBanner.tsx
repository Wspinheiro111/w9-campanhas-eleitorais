import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  getAnalyticsConsent,
  initializeGoogleAnalytics,
  isGoogleAnalyticsConfigured,
  setAnalyticsConsent,
  trackGoogleEvent,
} from "@/lib/ga4";

export function AnalyticsConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isGoogleAnalyticsConfigured() && !getAnalyticsConsent()) setVisible(true);
  }, []);

  const choose = (consent: "granted" | "denied") => {
    setAnalyticsConsent(consent);
    setVisible(false);
    if (consent === "granted") {
      initializeGoogleAnalytics();
      trackGoogleEvent("analytics_consent_granted", { source: "consent_banner" });
    }
  };

  if (!visible) return null;

  return (
    <aside
      aria-label="Preferências de privacidade e analytics"
      className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-3xl rounded-2xl border border-white/15 bg-[#0F1C3F] p-4 text-white shadow-2xl sm:inset-x-auto sm:bottom-5 sm:p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-bold">Privacidade e experiência</p>
          <p className="mt-1 text-xs leading-5 text-white/75">
            Podemos usar cookies de medição para entender visitas, navegação e desempenho do site. A escolha é opcional e pode ser alterada limpando a preferência de analytics do navegador. Não enviamos nomes, e-mails, telefones ou dados de campanha ao Google Analytics.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="outline" onClick={() => choose("denied")} className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white">Recusar</Button>
          <Button type="button" onClick={() => choose("granted")} className="bg-[#FFC300] font-bold text-[#0F1C3F] hover:bg-white">Aceitar medição</Button>
        </div>
      </div>
    </aside>
  );
}
