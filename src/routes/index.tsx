import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { StatusBadge, PriorityBadge } from "@/components/app/Badges";
import { useAuth } from "@/lib/auth";
import { countByStatus, fmtDate, STATUSES, STATUS_LABEL, type Status } from "@/lib/tickets";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel · Monitoo Chamados" },
      { name: "description", content: "Visão geral dos chamados de TI por status." },
      { property: "og:title", content: "Painel · Monitoo Chamados" },
      { property: "og:description", content: "Visão geral dos chamados de TI por status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <AppShell><Dashboard /></AppShell>,
});

const BAR: Record<Status, string> = { aberto: "bg-status-aberto", em_atendimento: "bg-status-atendimento", resolvido: "bg-status-resolvido" };

function Dashboard() {
  const { role, name } = useAuth();
  const { data = [] } = useQuery({
    queryKey: ["tickets"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tickets").select("id,number,title,status,priority,created_at").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const counts = countByStatus(data);
  const total = data.length || 1;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Olá, {name.split(" ")[0]}</p>
          <h1 className="font-display text-3xl font-bold">{role === "tecnico" ? "Painel geral" : "Meus chamados"}</h1>
        </div>
        <Button asChild><Link to="/chamados" search={{ novo: true }}>Novo chamado</Link></Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {STATUSES.map((s) => (
          <Link key={s} to="/chamados" search={{ status: s }} className="rounded-xl border bg-card p-5 transition hover:shadow-md">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><span className={`size-2.5 rounded-full ${BAR[s]}`} />{STATUS_LABEL[s]}</div>
            <p className="mt-2 font-display text-4xl font-bold">{counts[s]}</p>
          </Link>
        ))}
      </div>

      <div className="rounded-xl border bg-card p-5">
        <p className="mb-3 text-sm font-medium">Distribuição ({data.length} chamados)</p>
        <div className="flex h-3 overflow-hidden rounded-full bg-muted">
          {STATUSES.map((s) => <div key={s} className={BAR[s]} style={{ width: `${(counts[s] / total) * 100}%` }} />)}
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <p className="border-b p-4 text-sm font-medium">Recentes</p>
        {data.length === 0 && <p className="p-6 text-sm text-muted-foreground">Nenhum chamado ainda.</p>}
        {data.slice(0, 6).map((t) => (
          <Link key={t.id} to="/chamados/$id" params={{ id: t.id }} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b p-4 last:border-0 hover:bg-muted/50">
            <div className="min-w-0"><p className="truncate font-medium">#{t.number} {t.title}</p><p className="text-xs text-muted-foreground">{fmtDate(t.created_at)}</p></div>
            <div className="flex shrink-0 gap-2"><PriorityBadge priority={t.priority} /><StatusBadge status={t.status} /></div>
          </Link>
        ))}
      </div>
    </div>
  );
}
