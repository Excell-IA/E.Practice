import type { ApiPracticePage } from "@/lib/api";
import { directoryClients, directoryPractices, type DirectoryPractice } from "@/lib/demo-directory";

type ApiPractice = ApiPracticePage["items"][number];

const fallbackByPracticeId = new Map(directoryPractices.map((practice) => [practice.id, practice]));
const fallbackClientById = new Map(directoryClients.map((client) => [client.id, client]));

function statusToDirectory(status: ApiPractice["status"]): DirectoryPractice["status"] {
  if (status === "chiusa" || status === "archiviata") return "chiusa";
  if (status === "sospesa") return "sospesa";
  if (status === "in_attesa") return "in_attesa";
  if (status === "in_corso") return "in_corso";
  return "aperta";
}

function progressFromStatus(status: ApiPractice["status"], fallback?: DirectoryPractice) {
  if (fallback) return fallback.progress;
  if (status === "chiusa" || status === "archiviata") return 100;
  if (status === "in_corso" || status === "in_attesa") return 12;
  return 0;
}

export function mapApiPracticeToDirectoryPractice(practice: ApiPractice): DirectoryPractice {
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
    progress: progressFromStatus(practice.status, fallback),
    responsible: fallback?.responsible ?? { color: "#0f766e", initials: "SS", name: "Sara Salvi" },
    status: statusToDirectory(practice.status),
    title: practice.title,
  };
}
