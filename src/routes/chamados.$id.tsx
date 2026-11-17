import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { StatusBadge, PriorityBadge } from "@/components/app/Badges";
import { useAuth } from "@/lib/auth";
import { fmtDate, STATUSES, STATUS_LABEL, type Status } from "@/lib/tickets";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/chamados/$id")({
  head: () => ({
    meta: [
      { title: "Chamado · Monitoo Chamados" },
      { name: "description", content: "Detalhes e andamento do chamado." },
      { property: "og:title", content: "Chamado · Monitoo Chamados" },
      { property: "og:description", content: "Detalhes e andamento do chamado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <AppShell><Detail /></AppShell>,
});

function Detail() {
  const { id } = Route.useParams();
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const [comment, setComment] = useState("");

  const { data: t, isLoading } = useQuery({
    queryKey: ["ticket", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("*,author:profiles!tickets_created_by_fkey(full_name,email),tech:profiles!tickets_assigned_to_fkey(full_name)")
        .eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const { data: comments = [] } = useQuery({
    queryKey: ["comments", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("ticket_comments").select("id,body,created_at,author:profiles(full_name)").eq("ticket_id", id).order("created_at");
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Carregando…</p>;
  if (!t) return <p>Chamado não encontrado. <Link to="/chamados" className="underline">Voltar</Link></p>;

  const tecnico = role === "tecnico";
  async function update(patch: { status?: Status; assigned_to?: string }) {
    const { error } = await supabase.from("tickets").update(patch).eq("id", id);
    if (error) return void toast.error("Não foi possível atualizar.");
    toast.success("Chamado atualizado.");
    void qc.invalidateQueries();
  }
  async function send(e: FormEvent) {
    e.preventDefault();
    if (!user || !comment.trim()) return;
    const { error } = await supabase.from("ticket_comments").insert({ ticket_id: id, body: comment.trim(), author_id: user.id });
    if (error) return void toast.error("Não foi possível comentar.");
    setComment("");
    void qc.invalidateQueries({ queryKey: ["comments", id] });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/chamados" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Chamados</Link>
      <div className="rounded-xl border bg-card p-6">
        <div className="flex flex-wrap items-center gap-2"><StatusBadge status={t.status} /><PriorityBadge priority={t.priority} /><span className="text-xs text-muted-foreground">#{t.number}</span></div>
        <h1 className="mt-3 font-display text-2xl font-bold">{t.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Aberto por {t.author?.full_name} em {fmtDate(t.created_at)}</p>
        <p className="mt-5 whitespace-pre-wrap">{t.description}</p>
        <div className="mt-6 border-t pt-4 text-sm">
          Técnico responsável: <strong>{t.tech?.full_name ?? "ainda não atribuído"}</strong>
        </div>
        {tecnico && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {t.assigned_to !== user?.id && (
              <Button variant="secondary" onClick={() => void update({ assigned_to: user!.id, ...(t.status === "aberto" ? { status: "em_atendimento" as Status } : {}) })}>
                Assumir chamado
              </Button>
            )}
            <Select value={t.status} onValueChange={(v) => void update({ status: v as Status })}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold">Comentários</h2>
        {comments.length === 0 && <p className="text-sm text-muted-foreground">Nenhum comentário ainda.</p>}
        {comments.map((c) => (
          <div key={c.id} className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground"><strong className="text-foreground">{c.author?.full_name}</strong> · {fmtDate(c.created_at)}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{c.body}</p>
          </div>
        ))}
        {tecnico && (
          <form onSubmit={send} className="space-y-2">
            <Textarea placeholder="Escreva um comentário…" value={comment} maxLength={3000} onChange={(e) => setComment(e.target.value)} />
            <Button type="submit" disabled={!comment.trim()}>Comentar</Button>
          </form>
        )}
      </section>
    </div>
  );
}
