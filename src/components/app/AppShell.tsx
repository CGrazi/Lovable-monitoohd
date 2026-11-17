import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { LayoutDashboard, Ticket, Users, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function AppShell({ children, tecnicoOnly }: { children: ReactNode; tecnicoOnly?: boolean }) {
  const { user, role, name, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/login" });
    if (!loading && user && tecnicoOnly && role !== "tecnico") void navigate({ to: "/" });
  }, [loading, user, role, tecnicoOnly, navigate]);

  if (loading || !user || (tecnicoOnly && role !== "tecnico")) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando…</div>;
  }
  const link = "flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent";
  const active = { className: "bg-sidebar-accent text-sidebar-primary font-medium" };
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col bg-sidebar p-4 text-sidebar-foreground md:w-60">
        <Link to="/" className="mb-6 font-display text-xl font-bold">
          monitoo<span className="text-sidebar-primary">.</span>ti
        </Link>
        <nav className="flex gap-1 md:flex-col">
          <Link to="/" className={link} activeProps={active} activeOptions={{ exact: true }}><LayoutDashboard className="size-4" />Painel</Link>
          <Link to="/chamados" className={link} activeProps={active}><Ticket className="size-4" />Chamados</Link>
          {role === "tecnico" && <Link to="/equipe" className={link} activeProps={active}><Users className="size-4" />Equipe</Link>}
        </nav>
        <div className="mt-auto hidden border-t border-sidebar-border pt-4 md:block">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="text-xs text-sidebar-primary">{role === "tecnico" ? "Técnico" : "Colaborador"}</p>
          <button onClick={() => void supabase.auth.signOut()} className="mt-3 flex items-center gap-2 text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground">
            <LogOut className="size-3.5" />Sair
          </button>
        </div>
      </aside>
      <main className="flex-1 p-5 md:p-10">{children}</main>
    </div>
  );
}
