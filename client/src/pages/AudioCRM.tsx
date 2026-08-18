import { CampaignGate, PageHeader } from "@/components/CampaignShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCampaign } from "@/contexts/CampaignContext";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, FileAudio, Mic, Pause, ShieldCheck, Sparkles, Square, Volume2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

function toDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível preparar o arquivo de áudio."));
    reader.readAsDataURL(blob);
  });
}

function AudioCRMContent() {
  const { activeCampaign } = useCampaign();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [audio, setAudio] = useState<Blob | null>(null);
  const [consent, setConsent] = useState(false);
  const [result, setResult] = useState<{ transcription: string; extracted: { name: string; phone: string; neighborhood: string; region: string; address: string; primaryDemand: string; engagementLevel: "low" | "medium" | "high" }; voterId: number | null } | null>(null);
  const processAudio = trpc.ai.processAudioCrm.useMutation({ onSuccess: data => { setResult(data); toast.success(data.voterId ? "Transcrição processada e contato cadastrado." : "Transcrição processada. Revise os dados extraídos."); }, onError: error => toast.error(error.message) });

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { toast.error("A gravação de áudio não é suportada neste navegador."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const chunks: BlobPart[] = [];
      const recorder = new MediaRecorder(stream, MediaRecorder.isTypeSupported("audio/webm") ? { mimeType: "audio/webm" } : undefined);
      recorderRef.current = recorder;
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = () => { const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" }); setAudio(blob); stream.getTracks().forEach(track => track.stop()); streamRef.current = null; setRecording(false); };
      recorder.start(); setAudio(null); setResult(null); setRecording(true);
    } catch { toast.error("Não foi possível acessar o microfone. Verifique a permissão do dispositivo."); }
  };
  const stopRecording = () => recorderRef.current?.state === "recording" && recorderRef.current.stop();
  const submit = async () => {
    if (!audio || !consent) return;
    if (audio.size > 16 * 1024 * 1024) { toast.error("O áudio ultrapassa o limite de 16 MB."); return; }
    try {
      const dataBase64 = await toDataUrl(audio);
      processAudio.mutate({ campaignId: activeCampaign!.id, filename: `relato-campo-${Date.now()}.webm`, mimeType: (audio.type || "audio/webm") as "audio/webm", dataBase64, consentConfirmed: true });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível preparar o áudio."); }
  };
  return <>
    <PageHeader eyebrow="Operação em campo" title="Áudio para CRM" description="Grave um relato no dispositivo para transcrever e transformar informações explicitamente mencionadas em um pré-cadastro estruturado." />
    <div className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]"><section className="relative overflow-hidden rounded-[2rem] bg-[#103527] p-7 text-white shadow-[0_24px_80px_-42px_rgba(16,53,39,.9)] sm:p-10"><div className="absolute -right-14 -top-16 size-56 rounded-full bg-[#c9a85b]/15 blur-2xl" /><div className="relative"><Badge className="border-0 bg-white/10 text-white">Registro assistido</Badge><h2 className="mt-6 font-serif text-3xl leading-tight">Capture o relato enquanto a informação está fresca.</h2><p className="mt-4 max-w-md text-sm leading-6 text-white/70">O áudio é enviado ao ambiente seguro, transcrito no servidor e processado para extrair apenas dados informados na gravação.</p><div className="my-9 flex justify-center"><button onClick={recording ? stopRecording : startRecording} disabled={processAudio.isPending} aria-label={recording ? "Encerrar gravação" : "Iniciar gravação"} className={`flex size-40 items-center justify-center rounded-full border-[10px] border-white/10 shadow-[0_0_0_12px_rgba(255,255,255,.05)] transition-transform duration-200 active:scale-95 ${recording ? "bg-rose-500" : "bg-[#c9a85b]"}`}>{recording ? <Square className="size-10 fill-white text-white" /> : <Mic className="size-12 text-[#103527]" />}</button></div><p className="text-center text-sm font-medium">{recording ? "Gravação em andamento — toque para encerrar" : audio ? "Áudio pronto para processamento" : "Toque para iniciar a gravação"}</p>{audio && <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/70"><span className="flex items-center gap-2"><FileAudio className="size-4 text-[#e4cc8d]" />Arquivo pronto · {(audio.size / 1024 / 1024).toFixed(2)} MB</span></div>}</div></section>
      <section className="rounded-2xl border border-border bg-card p-6 shadow-[0_12px_28px_-24px_rgba(0,0,0,.6)]"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Sparkles className="size-5" /></span><div><h2 className="font-semibold">Processamento responsável</h2><p className="mt-1 text-xs text-muted-foreground">Confirme a base de registro antes de gerar o contato.</p></div></div><div className="mt-6 space-y-4"><div className="flex gap-3 rounded-xl bg-muted/55 p-4 text-sm leading-6 text-muted-foreground"><Volume2 className="mt-0.5 size-4 shrink-0 text-primary" /><p>A transcrição pode conter erros de reconhecimento. Revise os dados extraídos no resultado e corrija o cadastro posteriormente se necessário.</p></div><label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 text-sm"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} className="mt-0.5 size-4 accent-primary" /><span><strong className="block">Confirmo a base legítima para registrar este contato.</strong><span className="mt-1 block text-xs leading-5 text-muted-foreground">A pessoa foi informada sobre o registro e autorizou o contato. Não utilizarei o recurso para captar dados sensíveis ou não necessários.</span></span></label><Button onClick={submit} disabled={!audio || !consent || processAudio.isPending} className="w-full bg-[#103527] text-white hover:bg-[#174a35]">{processAudio.isPending ? "Transcrevendo e estruturando..." : <><Sparkles className="mr-2 size-4" />Processar áudio no CRM</>}</Button></div>{result ? <div className="mt-7 border-t border-border pt-6"><div className="flex items-center gap-2"><CheckCircle2 className="size-5 text-primary" /><div><p className="font-semibold">Resultado do processamento</p><p className="mt-1 text-xs text-muted-foreground">{result.voterId ? "Contato criado a partir do relato." : "Não foi possível criar um contato com os dados identificados."}</p></div></div><div className="mt-5 rounded-xl bg-muted/50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Transcrição</p><p className="mt-2 text-sm leading-6">{result.transcription}</p></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{Object.entries(result.extracted).map(([key, value]) => <div key={key} className="rounded-lg border border-border p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{key === "name" ? "Nome" : key === "phone" ? "Telefone" : key === "neighborhood" ? "Bairro" : key === "region" ? "Região" : key === "address" ? "Endereço" : key === "primaryDemand" ? "Demanda" : "Engajamento"}</p><p className="mt-1 text-sm font-medium">{value || "Não informado"}</p></div>)}</div></div> : <div className="mt-7 border-t border-border pt-6"><div className="flex items-start gap-3 text-sm leading-6 text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" /><p>O áudio não é processado no navegador: o arquivo e os pedidos ao modelo permanecem protegidos no servidor.</p></div></div>}</section></div>
  </>;
}
export default function AudioCRM() { return <CampaignGate><AudioCRMContent /></CampaignGate>; }
