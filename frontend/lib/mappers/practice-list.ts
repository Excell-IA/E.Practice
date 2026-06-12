import type { ApiContactSummary, ApiPracticeListItem } from "@/lib/api";
import { directoryClients, directoryPractices, type DirectoryPractice } from "@/lib/demo-directory";

const fallbackByPracticeId = new Map(directoryPractices.map((practice) => [practice.id, practice]));
const fallbackClientById = new Map(directoryClients.map((client) => [client.id, client]));

function statusToDirectory(status: ApiPracticeListItem["status"]): DirectoryPractice["status"] {
  if (status === "chiusa" || status === "archiviata") return "chiusa";
  if (status === "sospesa") return "sospesa";
  if (status === "in_attesa") return "in_attesa";
  return "aperta";
}

export function mapApiPracticeToDirectoryPractice(
  practice: ApiPracticeListItem,
  contacts: ApiContactSummary[] = [],
): DirectoryPractice {
  const fallback = fallbackByPracticeId.get(practice.id);
  const subjectId = practice.target_id ?? practice.client_id ?? "";
  const fallbackClient = practice.client_id
    ? fallbackClientById.get(practice.client_id)
    : undefined;
  const contact = practice.target_id
    ? contacts.find(
        (item) =>
          item.target_id === practice.target_id &&
          (!practice.target_type || item.target_type === practice.target_type),
      )
    : undefined;
  return {
    category: fallback?.category ?? "Pratica",
    categoryColor: fallback?.categoryColor ?? "info",
    clientId: subjectId,
    clientName:
      contact?.display_name ??
      fallback?.clientName ??
      fallbackClient?.name ??
      (practice.target_type ? "Soggetto E.Contacts" : "Cliente nuovo"),
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
