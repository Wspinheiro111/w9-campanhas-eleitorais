import { trpc } from "@/lib/trpc";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useOrganization } from "./OrganizationContext";

type Campaign = { id: number; organizationId: number; name: string; candidateName: string; electionLabel: string; region: string; status: "planning" | "active" | "paused" | "closed"; memberRole: "admin" | "coordinator" | "partner" | null };

type CampaignContextValue = {
  campaigns: Campaign[];
  activeCampaign: Campaign | null;
  activeCampaignId: number | null;
  setActiveCampaignId: (id: number) => void;
  loading: boolean;
  refetchCampaigns: () => void;
};

const CampaignContext = createContext<CampaignContextValue | null>(null);
const STORAGE_KEY = "w9-active-campaign";

export function CampaignProvider({ children }: { children: React.ReactNode }) {
  const { activeOrganizationId, loading: organizationLoading } = useOrganization();
  const campaignInput = useMemo(() => activeOrganizationId ? { organizationId: activeOrganizationId } : undefined, [activeOrganizationId]);
  const { data, isLoading, refetch } = trpc.campaign.list.useQuery(campaignInput, { enabled: !organizationLoading && Boolean(activeOrganizationId) });
  const [activeCampaignId, setActiveCampaignIdState] = useState<number | null>(null);

  useEffect(() => {
    if (!data?.length) return;
    const storedId = Number(localStorage.getItem(`${STORAGE_KEY}:${activeOrganizationId ?? "none"}`));
    const chosen = data.find(campaign => campaign.id === storedId) ?? data[0];
    setActiveCampaignIdState(chosen.id);
  }, [data, activeOrganizationId]);

  const setActiveCampaignId = (id: number) => {
    localStorage.setItem(`${STORAGE_KEY}:${activeOrganizationId ?? "none"}`, String(id));
    setActiveCampaignIdState(id);
  };

  const value = useMemo(() => ({
    campaigns: (data ?? []) as Campaign[],
    activeCampaign: (data?.find(campaign => campaign.id === activeCampaignId) ?? null) as Campaign | null,
    activeCampaignId,
    setActiveCampaignId,
    loading: isLoading || organizationLoading,
    refetchCampaigns: () => { void refetch(); },
  }), [data, activeCampaignId, isLoading, organizationLoading]);

  return <CampaignContext.Provider value={value}>{children}</CampaignContext.Provider>;
}

export function useCampaign() {
  const context = useContext(CampaignContext);
  if (!context) throw new Error("useCampaign deve ser usado dentro de CampaignProvider.");
  return context;
}
