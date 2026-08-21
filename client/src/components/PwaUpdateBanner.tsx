import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

export function PwaUpdateBanner() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let reloading = false;
    const onControllerChange = () => {
      if (!reloading) return;
      window.location.reload();
    };
    const inspectRegistration = (registration: ServiceWorkerRegistration) => {
      if (registration.waiting) setWaitingWorker(registration.waiting);
      registration.addEventListener("updatefound", () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) setWaitingWorker(registration.waiting);
        });
      });
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    void navigator.serviceWorker.getRegistration().then(registration => {
      if (!registration) return;
      inspectRegistration(registration);
      void registration.update();
    });
    return () => navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, []);

  if (!waitingWorker) return null;
  return <div className="fixed inset-x-4 bottom-4 z-[100] mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-primary/25 bg-card p-4 shadow-xl" role="status"><span className="rounded-xl bg-primary/10 p-2 text-primary"><Download className="size-5" /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">Uma atualização está pronta</p><p className="mt-0.5 text-xs text-muted-foreground">Atualize para usar a versão mais recente do W9.</p></div><Button size="sm" onClick={() => { waitingWorker.postMessage({ type: "SKIP_WAITING" }); setWaitingWorker(null); }}><RefreshCw className="mr-1.5 size-3.5" />Atualizar</Button></div>;
}
