import { trpc } from "@/lib/trpc";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export const campaignThemes = [
  { id: "w9", label: "W9 Oficial", description: "Navy, amarelo e verde", swatches: ["#0F1C3F", "#FFC300", "#00A859"] },
  { id: "red", label: "Vermelho e branco", description: "Rubro, branco e cinza claro", swatches: ["#b42318", "#ffffff", "#d0d5dd"] },
  { id: "green_yellow", label: "Verde e amarelo", description: "Verde bandeira, ouro e navy", swatches: ["#0b5d3b", "#f3c74d", "#102a43"] },
  { id: "blue", label: "Azul e branco", description: "Royal, celeste e azul escuro", swatches: ["#2155c7", "#ffffff", "#173b78"] },
  { id: "emerald", label: "Verde esmeralda", description: "Esmeralda, menta e lima", swatches: ["#056e54", "#b9fbc0", "#d9f99d"] },
  { id: "orange", label: "Laranja", description: "Laranja vibrante, navy e branco", swatches: ["#c2410c", "#132a4a", "#ffffff"] },
  { id: "violet", label: "Roxo e violeta", description: "Púrpura, ouro e branco", swatches: ["#6d28d9", "#eab308", "#ffffff"] },
  { id: "navy_red", label: "Azul escuro e vermelho", description: "Navy, vermelho e cinza", swatches: ["#12243d", "#c62828", "#d9dee7"] },
  { id: "neutral", label: "Padrão neutro", description: "Slate e azul corporativo", swatches: ["#334155", "#2563eb", "#f8fafc"] },
] as const;

export type CustomPalette = { primary: string; secondary: string; accent: string; background: string; surface: string; text: string; border: string };
export type CampaignTheme = typeof campaignThemes[number]["id"] | "custom";
export const defaultCustomPalette: CustomPalette = { primary: "#0F1C3F", secondary: "#EEF2F8", accent: "#FFC300", background: "#F8FAFC", surface: "#FFFFFF", text: "#0F1C3F", border: "#CBD5E1" };

const validThemes = new Set<string>([...campaignThemes.map(theme => theme.id), "custom"]);
const colorKeys: Array<keyof CustomPalette> = ["primary", "secondary", "accent", "background", "surface", "text", "border"];
const tokens = ["--primary", "--primary-foreground", "--secondary", "--secondary-foreground", "--accent", "--accent-foreground", "--background", "--foreground", "--surface", "--text", "--card", "--card-foreground", "--popover", "--popover-foreground", "--muted", "--muted-foreground", "--border", "--input", "--ring", "--sidebar", "--sidebar-foreground", "--sidebar-primary", "--sidebar-primary-foreground", "--sidebar-accent", "--sidebar-accent-foreground", "--sidebar-border", "--sidebar-ring", "--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5"];

function isHex(value: unknown): value is string { return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value); }
export function isCustomPalette(value: unknown): value is CustomPalette { return Boolean(value) && typeof value === "object" && colorKeys.every(key => isHex((value as Record<string, unknown>)[key])); }
function parsePalette(value: string | null) { try { const parsed = value ? JSON.parse(value) : null; return isCustomPalette(parsed) ? parsed : null; } catch { return null; } }
function luminance(hex: string) { const [r, g, b] = [1, 3, 5].map(index => Number.parseInt(hex.slice(index, index + 2), 16) / 255).map(channel => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4); return r * 0.2126 + g * 0.7152 + b * 0.0722; }
export function contrastRatio(first: string, second: string) { const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a); return (light + 0.05) / (dark + 0.05); }
function readableOn(color: string) { return contrastRatio(color, "#ffffff") >= contrastRatio(color, "#111827") ? "#ffffff" : "#111827"; }
export function isPaletteAccessible(palette: CustomPalette) { return contrastRatio(palette.text, palette.background) >= 4.5 && contrastRatio(palette.text, palette.surface) >= 4.5 && contrastRatio(readableOn(palette.primary), palette.primary) >= 4.5 && contrastRatio(readableOn(palette.accent), palette.accent) >= 4.5; }

function applyPalette(palette: CustomPalette | null) {
  const root = document.documentElement;
  tokens.forEach(token => root.style.removeProperty(token));
  if (!palette) return;
  const primaryText = readableOn(palette.primary); const accentText = readableOn(palette.accent);
  const values: Record<string, string> = { "--primary": palette.primary, "--primary-foreground": primaryText, "--secondary": palette.secondary, "--secondary-foreground": palette.text, "--accent": palette.accent, "--accent-foreground": accentText, "--background": palette.background, "--foreground": palette.text, "--surface": palette.surface, "--text": palette.text, "--card": palette.surface, "--card-foreground": palette.text, "--popover": palette.surface, "--popover-foreground": palette.text, "--muted": palette.secondary, "--muted-foreground": palette.text, "--border": palette.border, "--input": palette.border, "--ring": palette.primary, "--sidebar": palette.primary, "--sidebar-foreground": primaryText, "--sidebar-primary": palette.accent, "--sidebar-primary-foreground": accentText, "--sidebar-accent": palette.secondary, "--sidebar-accent-foreground": palette.text, "--sidebar-border": palette.border, "--sidebar-ring": palette.accent, "--chart-1": palette.primary, "--chart-2": palette.accent, "--chart-3": palette.secondary, "--chart-4": palette.text, "--chart-5": palette.border };
  Object.entries(values).forEach(([token, value]) => root.style.setProperty(token, value));
}

interface ThemeContextType { theme: CampaignTheme; setTheme: (theme: CampaignTheme) => void; themes: typeof campaignThemes; customPalette: CustomPalette; saveCustomPalette: (palette: CustomPalette) => boolean; }
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children, defaultTheme = "w9" }: { children: React.ReactNode; defaultTheme?: CampaignTheme }) {
  const [theme, setThemeState] = useState<CampaignTheme>(() => { const stored = typeof window === "undefined" ? null : localStorage.getItem("w9-theme-preference"); return stored && validThemes.has(stored) ? stored as CampaignTheme : defaultTheme; });
  const [customPalette, setCustomPalette] = useState<CustomPalette>(() => parsePalette(typeof window === "undefined" ? null : localStorage.getItem("w9-custom-theme-palette")) ?? defaultCustomPalette);
  const me = trpc.auth.me.useQuery(); const updatePreference = trpc.auth.updateThemePreference.useMutation();
  const persist = (nextTheme: CampaignTheme, nextPalette: CustomPalette) => { if (me.data) updatePreference.mutate({ themePreference: nextTheme, themePalette: nextPalette }); };
  useEffect(() => { document.documentElement.dataset.w9Theme = theme; localStorage.setItem("w9-theme-preference", theme); localStorage.setItem("w9-custom-theme-palette", JSON.stringify(customPalette)); applyPalette(theme === "custom" ? customPalette : null); }, [theme, customPalette]);
  useEffect(() => { const remoteTheme = me.data?.themePreference; const remotePalette = me.data?.themePalette; if (!remoteTheme || !validThemes.has(remoteTheme)) return; const palette = isCustomPalette(remotePalette) ? remotePalette : null; if (palette) setCustomPalette(palette); if (remoteTheme !== "neutral" && (remoteTheme !== "custom" || palette)) setThemeState(remoteTheme as CampaignTheme); }, [me.data?.themePreference, me.data?.themePalette]);
  const setTheme = (nextTheme: CampaignTheme) => { setThemeState(nextTheme); persist(nextTheme, customPalette); };
  const saveCustomPalette = (palette: CustomPalette) => { if (!isCustomPalette(palette) || !isPaletteAccessible(palette)) return false; setCustomPalette(palette); setThemeState("custom"); persist("custom", palette); return true; };
  const value = useMemo(() => ({ theme, setTheme, themes: campaignThemes, customPalette, saveCustomPalette }), [theme, customPalette]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() { const context = useContext(ThemeContext); if (!context) throw new Error("useTheme must be used within ThemeProvider"); return context; }
