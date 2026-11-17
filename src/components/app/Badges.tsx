import { cn } from "@/lib/utils";
import { PRIORITY_CLASS, PRIORITY_LABEL, STATUS_CLASS, STATUS_LABEL, type Priority, type Status } from "@/lib/tickets";

export function StatusBadge({ status }: { status: Status }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_CLASS[status])}>{STATUS_LABEL[status]}</span>;
}
export function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={cn("inline-flex rounded-md border px-2 py-0.5 text-xs", PRIORITY_CLASS[priority])}>{PRIORITY_LABEL[priority]}</span>;
}
