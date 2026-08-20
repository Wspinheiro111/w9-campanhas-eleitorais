import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Star } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRoute } from "wouter";

export default function EventFeedback() {
  const [, params] = useRoute("/evento/feedback/:token");
  const token = params?.token ?? "";
  const feedback = trpc.publicEvents.feedback.useQuery({ token }, { enabled: token.length >= 20 });
  const submitFeedback = trpc.publicEvents.submitFeedback.useMutation();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const submit = (event: FormEvent) => { event.preventDefault(); submitFeedback.mutate({ token, rating, comment: comment || undefined }); };
  if (feedback.isLoading) return <main className="min-h-screen animate-pulse bg-[#f8f7f2]" />;
  if (!feedback.data) return <main className="flex min-h-screen items-center justify-center bg-[#f8f7f2] p-5"><div className="max-w-md rounded-3xl border bg-card p-8 text-center"><Star className="mx-auto size-10 text-primary" /><h1 className="mt-4 font-serif text-3xl">Avaliação indisponível</h1><p className="mt-3 text-sm text-muted-foreground">Este link de participação não é válido.</p></div></main>;
  if (submitFeedback.isSuccess) return <main className="flex min-h-screen items-center justify-center bg-[#f8f7f2] p-5"><div className="max-w-md rounded-3xl border border-emerald-200 bg-card p-8 text-center"><CheckCircle2 className="mx-auto size-11 text-emerald-600" /><h1 className="mt-5 font-serif text-3xl">Obrigado pelo retorno</h1><p className="mt-3 text-sm text-muted-foreground">Sua avaliação ajudará a campanha a melhorar os próximos encontros.</p></div></main>;
  const prompt = feedback.data.event.postEventSurveyPrompt || "Como foi sua experiência neste evento?";
  return <main className="flex min-h-screen items-center justify-center bg-[#f8f7f2] p-5"><form onSubmit={submit} className="w-full max-w-xl rounded-[2rem] border bg-card p-7 shadow-[0_24px_80px_-45px_rgba(20,50,38,.55)]"><p className="text-xs font-bold uppercase tracking-[.16em] text-primary">Retorno pós-evento</p><h1 className="mt-2 font-serif text-3xl">{feedback.data.event.title}</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Olá, {feedback.data.registration.name}. {prompt}</p><div className="mt-6 flex gap-2" aria-label="Avaliação de 1 a 5 estrelas">{[1, 2, 3, 4, 5].map(value => <button key={value} type="button" onClick={() => setRating(value)} className="rounded-lg p-1 focus:outline-none focus:ring-2 focus:ring-primary" aria-label={`${value} estrela${value > 1 ? "s" : ""}`}><Star className={`size-8 ${value <= rating ? "fill-[#c9a85b] text-[#c9a85b]" : "text-muted-foreground"}`} /></button>)}</div><div className="mt-5 space-y-2"><label className="text-sm font-medium">Comentário opcional</label><Textarea value={comment} onChange={event => setComment(event.target.value)} placeholder="Conte o que funcionou ou pode melhorar" /></div><Button type="submit" className="mt-6 w-full" disabled={!rating || submitFeedback.isPending}>{submitFeedback.isPending ? "Enviando..." : "Enviar avaliação"}</Button>{submitFeedback.error && <p className="mt-3 text-sm text-destructive">{submitFeedback.error.message}</p>}</form></main>;
}
