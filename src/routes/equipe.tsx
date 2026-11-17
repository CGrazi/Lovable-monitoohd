import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { useAuth, type Role } from "@/lib/auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/equipe")({
  head: () => ({
    meta: [
      { title: "Equipe · Monitoo Chamados" },
      { name: "description", content: "Gerencie quem é Técnico ou Colaborador." },
      { property: "og:title", content: "Equipe · Monitoo Chamados" },
      { property: "og:description", content: "Gerencie quem é Técnico ou Colaborador." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <AppShell tecnicoOnly><Team /></AppShell>,
});

function Team() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["team"],
    queryFn: async () => {
      const [{ data: people, error }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id,full_name,email").order("full_name"),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      if (error) throw error;
      return (people ?? []).map((p) => ({
        ...p,
        role: (roles?.some((r) => r.user_id === p.id && r.role === "tecnico") ? "tecnico" : "colaborador") as Role,
      }));
    },
  });

  async function change(id: string, role: Role) {
    const { error } = await supabase.rpc("set_user_role", { _user_id: id, _role: role });
    if (error) return void toast.error("Não foi possível alterar o perfil.");
    toast.success("Perfil atualizado.");
    void qc.invalidateQueries({ queryKey: ["team"] });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-3xl font-bold">Equipe</h1>
      <div className="rounded-xl border bg-card">
        {data.map((p) => (
          <div key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b p-4 last:border-0">
            <div className="min-w-0"><p className="truncate font-medium">{p.full_name}</p><p className="truncate text-xs text-muted-foreground">{p.email}</p></div>
            {p.id === user?.id ? (
              <span className="text-sm text-muted-foreground">Técnico (você)</span>
            ) : (
              <Select value={p.role} onValueChange={(v) => void change(p.id, v as Role)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="colaborador">Colaborador</SelectItem><SelectItem value="tecnico">Técnico</SelectItem></SelectContent>
              </Select>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
