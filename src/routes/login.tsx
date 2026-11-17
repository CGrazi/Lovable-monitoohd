import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar · Monitoo Chamados" },
      { name: "description", content: "Acesse a central de chamados de TI da Monitoo." },
      { property: "og:title", content: "Entrar · Monitoo Chamados" },
      { property: "og:description", content: "Acesse a central de chamados de TI da Monitoo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Login,
});

function Login() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) void navigate({ to: "/" });
  }, [user, navigate]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error("E-mail ou senha inválidos.");
    } else {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: window.location.origin, data: { full_name: name } },
      });
      if (error) toast.error(error.message);
      else toast.success("Conta criada! Confira seu e-mail para confirmar o cadastro.");
    }
    setBusy(false);
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("Não foi possível entrar com Google.");
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <section className="hidden flex-col justify-between bg-sidebar p-12 text-sidebar-foreground md:flex">
        <span className="font-display text-2xl font-bold">monitoo<span className="text-sidebar-primary">.</span>ti</span>
        <div>
          <h1 className="font-display text-5xl font-bold leading-tight">Problema de TI?<br /><span className="text-sidebar-primary">Abra um chamado.</span></h1>
          <p className="mt-4 max-w-sm text-sidebar-foreground/70">Registre, acompanhe e resolva solicitações internas em um só lugar.</p>
        </div>
        <p className="text-xs text-sidebar-foreground/50">Uso interno · Monitoo</p>
      </section>
      <section className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <h2 className="font-display text-3xl font-bold">{mode === "in" ? "Entrar" : "Criar conta"}</h2>
          {mode === "up" && (
            <div className="space-y-1.5"><Label htmlFor="n">Nome</Label><Input id="n" required value={name} onChange={(e) => setName(e.target.value)} /></div>
          )}
          <div className="space-y-1.5"><Label htmlFor="e">E-mail</Label><Input id="e" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="p">Senha</Label><Input id="p" type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <Button type="submit" className="w-full" disabled={busy}>{mode === "in" ? "Entrar" : "Cadastrar"}</Button>
          <button type="button" onClick={google} className="flex w-full items-center justify-center gap-2.5 rounded-md border border-[#747775] bg-[#FFFFFF] px-3 py-2 text-sm font-medium text-[#1F1F1F]">
            <svg aria-hidden="true" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.140 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.170 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.450 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
            Continuar com Google
          </button>
          <p className="text-center text-sm text-muted-foreground">
            {mode === "in" ? "Ainda não tem conta? " : "Já tem conta? "}
            <button type="button" className="font-medium text-primary underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
              {mode === "in" ? "Cadastre-se" : "Entrar"}
            </button>
          </p>
        </form>
      </section>
    </div>
  );
}
