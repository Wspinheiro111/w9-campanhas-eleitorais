import { trpc } from "@/lib/trpc";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type OrganizationContextValue = {
  organizations: Array<{ organization: { id: number; name: string; legalName: string | null }; membership: { role: "admin" | "manager" | "operator" | "viewer" } }>;
  activeOrganizationId: number | null;
  setActiveOrganizationId: (id: number) => void;
  loading: boolean;
};

const OrganizationContext = createContext<OrganizationContextValue | null>(null);
const STORAGE_KEY = "w9-active-organization";

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = trpc.organization.mine.useQuery();
  const organizations = data ?? [];
  const [activeOrganizationId, setActive] = useState<number | null>(() => Number(localStorage.getItem(STORAGE_KEY)) || null);
  useEffect(() => {
    if (!organizations.length) return;
    if (!organizations.some(item => item.organization.id === activeOrganizationId)) setActive(organizations[0].organization.id);
  }, [organizations, activeOrganizationId]);
  const setActiveOrganizationId = (id: number) => { localStorage.setItem(STORAGE_KEY, String(id)); setActive(id); };
  const value = useMemo(() => ({ organizations, activeOrganizationId, setActiveOrganizationId, loading: isLoading }), [organizations, activeOrganizationId, isLoading]);
  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) throw new Error("useOrganization must be used within OrganizationProvider");
  return context;
}
