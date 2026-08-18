import { CampaignGate, EmptyPanel, PageHeader } from "@/components/CampaignShell";
import { MapView } from "@/components/Map";
import { Badge } from "@/components/ui/badge";
import { useCampaign } from "@/contexts/CampaignContext";
import { trpc } from "@/lib/trpc";
import { MapPinned, MapPin, Radar } from "lucide-react";
import { useCallback } from "react";

function TerritoryContent() {
  const { activeCampaign } = useCampaign();
  const { data, isLoading } = trpc.territory.overview.useQuery({ campaignId: activeCampaign!.id });
  const onMapReady = useCallback((map: google.maps.Map) => {
    if (!activeCampaign || !data) return;
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: activeCampaign.region }, (results, status) => { if (status === "OK" && results?.[0]) map.setCenter(results[0].geometry.location); });
    data.territories.filter(item => item.neighborhood || item.region).slice(0, 20).forEach(item => {
      const address = [item.neighborhood, item.region || activeCampaign.region].filter(Boolean).join(", ");
      geocoder.geocode({ address }, (results, status) => { if (status === "OK" && results?.[0]) new google.maps.Marker({ map, position: results[0].geometry.location, title: `${item.neighborhood || item.region}: ${item.contacts} contato(s)` }); });
    });
    data.events.filter(item => item.neighborhood || item.region).slice(0, 12).forEach(item => {
      const address = [item.neighborhood, item.region || activeCampaign.region].filter(Boolean).join(", ");
      geocoder.geocode({ address }, (results, status) => { if (status === "OK" && results?.[0]) new google.maps.Marker({ map, position: results[0].geometry.location, label: "E", title: `${item.neighborhood || item.region}: ${item.total} evento(s)` }); });
    });
    data.incidents.filter(item => item.neighborhood || item.region).slice(0, 12).forEach(item => {
      const address = [item.neighborhood, item.region || activeCampaign.region].filter(Boolean).join(", ");
      geocoder.geocode({ address }, (results, status) => { if (status === "OK" && results?.[0]) new google.maps.Marker({ map, position: results[0].geometry.location, label: "O", title: `${item.neighborhood || item.region}: ${item.total} ocorrência(s)` }); });
    });
  }, [activeCampaign, data]);
  if (isLoading) return <div className="h-96 animate-pulse rounded-2xl bg-muted" />;
  const territories = data?.territories ?? [];
  return <><PageHeader eyebrow="Inteligência territorial" title="Mapa de território" description="Visualize a presença da campanha por bairro e região, com sinais de agenda e ocorrências de campo." />
    <div className="grid gap-4 sm:grid-cols-3"><article className="rounded-2xl border border-border bg-card p-5"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Territórios mapeados</p><p className="mt-3 text-3xl font-semibold">{territories.length}</p></article><article className="rounded-2xl border border-border bg-card p-5"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Eventos localizados</p><p className="mt-3 text-3xl font-semibold">{data?.events.reduce((sum, item) => sum + item.total, 0) ?? 0}</p></article><article className="rounded-2xl border border-border bg-card p-5"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ocorrências localizadas</p><p className="mt-3 text-3xl font-semibold">{data?.incidents.reduce((sum, item) => sum + item.total, 0) ?? 0}</p></article></div>
    <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card"><div className="flex items-center gap-3 border-b border-border p-5"><span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><MapPinned className="size-5" /></span><div><h2 className="font-semibold">Distribuição geográfica</h2><p className="mt-1 text-xs text-muted-foreground">Os marcadores representam registros agregados, sem expor endereços individuais.</p></div></div>{territories.length ? <MapView className="h-[460px]" initialCenter={{ lat: -14.235, lng: -51.9253 }} initialZoom={4} onMapReady={onMapReady} /> : <div className="flex h-[360px] flex-col items-center justify-center bg-[radial-gradient(circle_at_50%_40%,rgba(201,168,91,.16),transparent_28%),linear-gradient(135deg,#f8f7f2,#f1f4ef)] p-8 text-center"><span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><MapPinned className="size-7" /></span><h3 className="mt-5 font-serif text-2xl">Seu mapa ganhará vida com a base</h3><p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">Registre bairro ou região nos contatos e os dados territoriais serão consolidados aqui com segurança.</p></div>}</section>
    <section className="mt-6 rounded-2xl border border-border bg-card p-5"><div className="flex items-center gap-2"><Radar className="size-5 text-primary" /><div><h2 className="font-semibold">Base por bairro e região</h2><p className="mt-1 text-xs text-muted-foreground">Consolidação dos contatos consentidos cadastrados na campanha.</p></div></div>{territories.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{territories.sort((a, b) => b.contacts - a.contacts).map((item, index) => <article key={`${item.region}-${item.neighborhood}-${index}`} className="rounded-xl bg-muted/45 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{item.neighborhood || "Bairro não informado"}</p><p className="mt-1 text-xs text-muted-foreground">{item.region || "Região não informada"}</p></div><Badge>{item.contacts} contato(s)</Badge></div></article>)}</div> : <EmptyPanel title="Ainda não há dados territoriais" description="Cadastre contatos com bairro ou região para construir a leitura geográfica da base." action={<span className="inline-flex items-center gap-2 text-sm font-medium text-primary"><MapPin className="size-4" />Use os campos territoriais no CRM</span>} />}</section>
    {(data?.events.length || data?.incidents.length) ? <section className="mt-6 grid gap-4 lg:grid-cols-2"><article className="rounded-2xl border border-border bg-card p-5"><h2 className="font-semibold">Eventos por bairro e região</h2><div className="mt-4 space-y-2">{data?.events.filter(item => item.neighborhood || item.region).map((item, index) => <div key={`${item.region}-${item.neighborhood}-${index}`} className="flex items-center justify-between rounded-lg bg-muted/45 px-3 py-2 text-sm"><span>{item.neighborhood || "Bairro não informado"} · {item.region || "Região não informada"}</span><Badge variant="secondary">{item.total} evento(s)</Badge></div>)}</div></article><article className="rounded-2xl border border-border bg-card p-5"><h2 className="font-semibold">Ocorrências por bairro e região</h2><div className="mt-4 space-y-2">{data?.incidents.filter(item => item.neighborhood || item.region).map((item, index) => <div key={`${item.region}-${item.neighborhood}-${index}`} className="flex items-center justify-between rounded-lg bg-muted/45 px-3 py-2 text-sm"><span>{item.neighborhood || "Bairro não informado"} · {item.region || "Região não informada"}</span><Badge variant="secondary">{item.total} ocorrência(s)</Badge></div>)}</div></article></section> : null}
  </>;
}
export default function Territory() { return <CampaignGate><TerritoryContent /></CampaignGate>; }
