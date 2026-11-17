import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { StatusBadge, PriorityBadge } from "@/components/app/Badges";
import { useAuth } from "@/lib/auth";
import { fmtDate, STATUSES, STATUS_LABEL, type Priority, type Status } from "@/lib/tickets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Search = { status?: Status; novo?: boolean };

export const Route = createFileRoute("/chamados/")({
  validateSearch: (s: Record<string, unknown>): Search => {
    const out: Search = {};
    if (typeof s["status"] === "string" && (STATUSES as string[]).includes(s["status"])) out.status = s["status"] as Status;
    if (s["novo"] === true || s["novo"] === "true") out.novo = true;
    return out;
  },
  head: () => ({
    meta: [
      { title: "Chamados · Monitoo Chamados" },
      { name: "description", content: "Lista de chamados de TI." },
      { property: "og:title", content: "Chamados · Monitoo Chamados" },
      { property: "og:description", content: "Lista de chamados de TI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <AppShell><Tickets /></AppShell>,
});

function Tickets() {
  const { status, novo } = Route.useSearch();
  const navigate = useNavigate({ from: "/chamados/" });
  const { role } = useAuth();
  const { data = [] } = useQuery({
    queryKey: ["tickets-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("id,number,title,status,priority,created_at,author:profiles!tickets_created_by_fkey(full_name),tech:profiles!tickets_assigned_to_fkey(full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const list = status ? data.filter((t) => t.status === status) : data;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-3xl font-bold">{role === "tecnico" ? "Todos os chamados" : "Meus chamados"}</h1>
        <Button onClick={() => void navigate({ search: (p) => ({ ...p, novo: true }) })}>Novo chamado</Button>
      </header>
      <div className="flex flex-wrap gap-2">
        {[undefined, ...STATUSES].map((s) => (
          <Link key={s ?? "all"} to="/chamados" search={s ? { status: s } : {}}
            className={`rounded-full border px-3 py-1 text-sm ${status === s ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>
            {s ? STATUS_LABEL[s] : "Todos"}
          </Link>
        ))}
      </div>
      <div className="rounded-xl border bg-card">
        {list.length === 0 && <p className="p-6 text-sm text-muted-foreground">Nenhum chamado encontrado.</p>}
        {list.map((t) => (
          <Link key={t.id} to="/chamados/$id" params={{ id: t.id }} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b p-4 last:border-0 hover:bg-muted/50">
            <div className="min-w-0">
              <p className="truncate font-medium">#{t.number} {t.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {role === "tecnico" && <>{t.author?.full_name} · </>}{fmtDate(t.created_at)}
                {t.tech ? ` · Técnico: ${t.tech.full_name}` : " · Sem técnico"}
              </p>
            </div>
            <div className="flex shrink-0 gap-2"><PriorityBadge priority={t.priority} /><StatusBadge status={t.status} /></div>
          </Link>
        ))}
      </div>
      <NewTicket open={!!novo} onClose={() => void navigate({ search: (p) => (p.status ? { status: p.status } : {}) })} />
    </div>
  );
}

function NewTicket({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("media");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("tickets").insert({ title: title.trim(), description: description.trim(), priority, created_by: user.id });
    setBusy(false);
    if (error) return void toast.error("Não foi possível abrir o chamado.");
    toast.success("Chamado aberto!");
    setTitle(""); setDescription(""); setPriority("media");
    void qc.invalidateQueries();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo chamado</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="t">Título</Label><Input id="t" required minLength={3} maxLength={150} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="d">Descrição</Label><Textarea id="d" required rows={5} maxLength={5000} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="space-y-1.5">
            <Label>Prioridade</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="baixa">Baixa</SelectItem><SelectItem value="media">Média</SelectItem><SelectItem value="alta">Alta</SelectItem></SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={busy}>Abrir chamado</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
