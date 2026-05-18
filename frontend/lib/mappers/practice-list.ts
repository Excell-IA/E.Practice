import type { ApiPracticeListItem } from "@/lib/api";
import { directoryClients, directoryPractices, type DirectoryPractice } from "@/lib/demo-directory";

const fallbackByPracticeId = new Map(directoryPractices.map((practice) => [practice.id, practice]));
const fallbackClientById = new Map(directoryClients.map((client) => [client.id, client]));

function statusToDirectory(status: ApiPracticeListItem["status"]): DirectoryPractice["status"] {
  if (status === "chiusa" || status === "archiviata") return "chiusa";
  if (status === "sospesa") return "sospesa";
  if (status === "in_attesa") return "in_attesa";
  return "aperta";
}

export function mapApiPracticeToDirectoryPractice(practice: ApiPracticeListItem): DirectoryPractice {
  const fallback = fallbackByPracticeId.get(practice.id);
  const fallbackClient = fallbackClientById.get(practice.client_id);
  return {
    category: fallback?.category ?? "Pratica",
    categoryColor: fallback?.categoryColor ?? "info",
    clientId: practice.client_id,
    clientName: fallback?.clientName ?? fallbackClient?.name ?? "Cliente nuovo",
    code: practice.code,
    dueDate: practice.scadenza ?? practice.apertura,
    id: practice.id,
    phasesClosed: practice.phases_closed,
    phasesTotal: practice.phases_total,
    progress: practice.progress_pct,
    responsible: fallback?.responsible ?? { color: "#0f766e", initials: "SS", name: "Sara Salvi" },
    status: statusToDirectory(practice.status),
    title: practice.title,
  };
}
