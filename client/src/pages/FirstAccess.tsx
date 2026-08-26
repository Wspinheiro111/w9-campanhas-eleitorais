import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { KeyRound, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function FirstAccess() {
  const { user, loading, logout } = useAuth();
  const [, navigate] = useLocation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const updatePassword = trpc.auth.setLocalPassword.useMutation({ onSuccess: () => navigate("/painel") });
  useEffect(() => { if (!loading && !user) navigate("/login"); else if (user && !user.mustChangePassword) navigate("/painel"); }, [loading, navigate, user]);
  if (loading || !user) return <main className="min-h-screen bg-[#0A132E]" />;
  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0A132E] p-5"><div className="pointer-events-none absolute inset-0 opacity-[.12]" style={{ backgroundImage: "radial-gradient(white 1px, transparent 1px)", backgroundSize: "26px 26px" }} /><section className="relative w-full max-w-md rounded-[2rem] border border-white/10 bg-[#0F1C3F]/95 p-8 text-white shadow-[0_30px_90px_rgba(0,0,0,.45)]"><BrandMark /><div className="mt-8 flex size-11 items-center justify-center rounded-2xl bg-[#FFC300] text-[#0F1C3F]"><KeyRound className="size-5" /></div><h1 className="mt-5 font-[Anton,sans-serif] text-4xl uppercase leading-none">Defina sua nova senha</h1><p className="mt-3 text-sm leading-6 text-white/65">Por segurança, sua senha provisória deve ser trocada antes de acessar a operação da organização.</p><form className="mt-7 space-y-4" onSubmit={event => { event.preventDefault(); if (password === confirmation) updatePassword.mutate({ currentPassword, password }); }}><div><Label htmlFor="first-current-password" className="text-white/75">Senha provisória</Label><Input id="first-current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} className="mt-1.5 border-white/15 bg-white/5 text-white" required /></div><div><Label htmlFor="first-new-password" className="text-white/75">Nova senha</Label><Input id="first-new-password" type="password" autoComplete="new-password" minLength={10} value={password} onChange={event => setPassword(event.target.value)} className="mt-1.5 border-white/15 bg-white/5 text-white" required /></div><div><Label htmlFor="first-confirm-password" className="text-white/75">Confirmar nova senha</Label><Input id="first-confirm-password" type="password" autoComplete="new-password" minLength={10} value={confirmation} onChange={event => setConfirmation(event.target.value)} className="mt-1.5 border-white/15 bg-white/5 text-white" required /></div>{confirmation && password !== confirmation && <p className="text-sm text-red-200">As novas senhas não coincidem.</p>}{updatePassword.error && <p className="text-sm text-red-200">Não foi possível atualizar a senha. Confira a senha provisória e tente novamente.</p>}<Button className="w-full bg-[#FFC300] font-black text-[#0F1C3F] hover:bg-white" disabled={password.length < 10 || password !== confirmation || updatePassword.isPending}>{updatePassword.isPending ? "Salvando..." : "Concluir primeiro acesso"}</Button></form><button type="button" onClick={() => void logout().then(() => navigate("/login"))} className="mt-5 flex w-full items-center justify-center gap-2 text-sm text-white/60 hover:text-[#FFC300]"><ShieldCheck className="size-4" />Sair</button></section></main>;
}
