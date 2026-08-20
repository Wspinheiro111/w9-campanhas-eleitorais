import { trpc } from "@/lib/trpc";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export const campaignThemes = [
  { id: "red", label: "Vermelho e branco", description: "Rubro, branco e cinza claro", swatches: ["#b42318", "#ffffff", "#d0d5dd"] },
  { id: "green_yellow", label: "Verde e amarelo", description: "Verde bandeira, ouro e navy", swatches: ["#0b5d3b", "#f3c74d", "#102a43"] },
  { id: "blue", label: "Azul e branco", description: "Royal, celeste e azul escuro", swatches: ["#2155c7", "#ffffff", "#173b78"] },
  { id: "emerald", label: "Verde esmeralda", description: "Esmeralda, menta e lima", swatches: ["#056e54", "#b9fbc0", "#d9f99d"] },
  { id: "orange", label: "Laranja", description: "Laranja vibrante, navy e branco", swatches: ["#c2410c", "#132a4a", "#ffffff"] },
  { id: "violet", label: "Roxo e violeta", description: "Púrpura, ouro e branco", swatches: ["#6d28d9", "#eab308", "#ffffff"] },
  { id: "navy_red", label: "Azul escuro e vermelho", description: "Navy, vermelho e cinza", swatches: ["#12243d", "#c62828", "#d9dee7"] },
  { id: "neutral", label: "Padrão neutro", description: "Slate e azul corporativo", swatches: ["#334155", "#2563eb", "#f8fafc"] },
] as const;

export type CampaignTheme = typeof campaignThemes[number]["id"];
const validThemes = new Set<string>(campaignThemes.map(theme => theme.id));
const STORAGE_KEY = "w9-theme-preference";

interface ThemeContextType {
  theme: CampaignTheme;
  setTheme: (theme: CampaignTheme) => void;
  themes: typeof campaignThemes;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children, defaultTheme = "neutral" }: { children: React.ReactNode; defaultTheme?: CampaignTheme }) {
  const [theme, setThemeState] = useState<CampaignTheme>(() => {
    const stored = typeof window === "undefined" ? null : localStorage.getItem(STORAGE_KEY);
    return stored && validThemes.has(stored) ? stored as CampaignTheme : defaultTheme;
  });
  const me = trpc.auth.me.useQuery();
  const updatePreference = trpc.auth.updateThemePreference.useMutation();

  useEffect(() => {
    document.documentElement.dataset.w9Theme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const remoteTheme = me.data?.themePreference;
    if (!remoteTheme || !validThemes.has(remoteTheme)) return;
    const localTheme = localStorage.getItem(STORAGE_KEY);
    if (remoteTheme !== "neutral") {
      setThemeState(remoteTheme as CampaignTheme);
    } else if (localTheme && validThemes.has(localTheme) && localTheme !== remoteTheme) {
      updatePreference.mutate({ themePreference: localTheme as CampaignTheme });
    }
  }, [me.data?.themePreference]);

  const setTheme = (nextTheme: CampaignTheme) => {
    setThemeState(nextTheme);
    if (me.data) updatePreference.mutate({ themePreference: nextTheme });
  };
  const value = useMemo(() => ({ theme, setTheme, themes: campaignThemes }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
