import Cropper, { Area } from "react-easy-crop";
import { useState } from "react";
import { Button } from "@/components/ui/button";

async function cropToDataUrl(source: string, area: Area) {
  const image = new Image(); image.src = source; await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Não foi possível carregar a imagem.")); });
  const canvas = document.createElement("canvas"); canvas.width = 720; canvas.height = 720;
  const context = canvas.getContext("2d"); if (!context) throw new Error("Recorte indisponível neste navegador.");
  context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, 720, 720);
  return canvas.toDataURL("image/png");
}

export function CertificateLogoCropDialog({ source, onCancel, onConfirm }: { source: string; onCancel: () => void; onConfirm: (dataUrl: string) => void }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 }); const [zoom, setZoom] = useState(1); const [area, setArea] = useState<Area | null>(null); const [saving, setSaving] = useState(false);
  const confirm = async () => { if (!area) return; setSaving(true); try { onConfirm(await cropToDataUrl(source, area)); } finally { setSaving(false); } };
  return <section className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4" role="dialog" aria-modal="true" aria-labelledby="crop-logo-title"><div className="w-full max-w-xl overflow-hidden rounded-2xl bg-card shadow-2xl"><div className="border-b px-5 py-4"><h2 id="crop-logo-title" className="font-serif text-2xl">Ajustar logotipo</h2><p className="mt-1 text-sm text-muted-foreground">Centralize o elemento principal no quadrado que aparecerá no certificado.</p></div><div className="relative h-80 bg-muted"><Cropper image={source} crop={crop} zoom={zoom} aspect={1} cropShape="rect" showGrid onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, pixels) => setArea(pixels)} /></div><div className="space-y-2 px-5 pt-4"><label className="text-sm font-medium" htmlFor="logo-zoom">Zoom do logotipo</label><input id="logo-zoom" className="w-full accent-[#103527]" type="range" min="1" max="3" step="0.05" value={zoom} onChange={event => setZoom(Number(event.target.value))} /></div><div className="flex justify-end gap-3 p-5"><Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancelar</Button><Button type="button" onClick={confirm} disabled={!area || saving}>{saving ? "Aplicando..." : "Usar recorte"}</Button></div></div></section>;
}
