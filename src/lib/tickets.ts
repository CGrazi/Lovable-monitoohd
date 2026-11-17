export type Status = "aberto" | "em_atendimento" | "resolvido";
export type Priority = "baixa" | "media" | "alta";

export const STATUS_LABEL: Record<Status, string> = {
  aberto: "Aberto",
  em_atendimento: "Em atendimento",
  resolvido: "Resolvido",
};
export const STATUS_CLASS: Record<Status, string> = {
  aberto: "bg-status-aberto/15 text-status-aberto",
  em_atendimento: "bg-status-atendimento/20 text-foreground",
  resolvido: "bg-status-resolvido/15 text-status-resolvido",
};
export const PRIORITY_LABEL: Record<Priority, string> = { baixa: "Baixa", media: "Média", alta: "Alta" };
export const PRIORITY_CLASS: Record<Priority, string> = {
  baixa: "border-border text-muted-foreground",
  media: "border-primary/30 text-primary",
  alta: "border-prio-alta/50 text-prio-alta font-semibold",
};
export const STATUSES: Status[] = ["aberto", "em_atendimento", "resolvido"];

export function countByStatus(items: { status: Status }[]): Record<Status, number> {
  const out: Record<Status, number> = { aberto: 0, em_atendimento: 0, resolvido: 0 };
  for (const t of items) out[t.status] += 1;
  return out;
}

export const fmtDate = (d: string) =>
  new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
