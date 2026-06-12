import type { ApiPracticeDetail } from "@/lib/api";
import type { DemoNote, DemoUser } from "@/lib/demo-state";
import type { EventType, Practice, PracticeEvent, PracticeLabel, PracticePhase, User } from "@/lib/types";

export type PracticeDetailUi = {
  practice: Practice;
  phases: PracticePhase[];
  events: PracticeEvent[];
  notes: DemoNote[];
};

type ApiUserSummary = NonNullable<ApiPracticeDetail["responsible"]>;
type ApiPhaseStatus = ApiPracticeDetail["phases"][number]["phase"]["status"];
type ApiPracticeStatus = ApiPracticeDetail["practice"]["status"];
type ApiEventType = ApiPracticeDetail["events"][number]["event"]["event_type"];

const FALLBACK_USER: User = {
  id: "11111111-1111-4111-8111-000000000001",
  initials: "MB",
  name: "Mario Bonometti",
  role: "Titolare",
};

function userFromSummary(user: ApiUserSummary | null | undefined, knownUsers: readonly DemoUser[]): User {
  if (!user) return FALLBACK_USER;
  const known = knownUsers.find((item) => item.id === user.id);
  if (known) return known;
  return {
    id: user.id,
    initials: user.initials,
    name: `${user.nome} ${user.cognome}`,
    role: user.role,
  };
}

function demoUserFromSummary(user: ApiUserSummary | null | undefined, knownUsers: readonly DemoUser[]): DemoUser {
  const known = user ? knownUsers.find((item) => item.id === user.id) : undefined;
  if (known) return known;
  const summary = userFromSummary(user, knownUsers);
  return {
    ...summary,
    avatarColor: user?.avatar_color ?? "#6b7280",
    permission: user?.role === "titolare" ? "admin" : user?.role === "esterno" ? "viewer" : "editor",
  };
}

function mapPracticeStatus(status: ApiPracticeStatus): Practice["status"] {
  return status;
}

function mapPhaseStatus(status: ApiPhaseStatus): PracticePhase["status"] {
  if (status === "completed") return "done";
  return status;
}

function mapEventType(type: ApiEventType): EventType {
  if (type === "telefonata_in" || type === "telefonata_out") return "call";
  return "mail";
}

function mapLabelTone(color: string): PracticeLabel["tone"] {
  const normalized = color.toLowerCase();
  if (normalized.includes("red") || normalized.includes("danger")) return "danger";
  if (normalized.includes("yellow") || normalized.includes("orange") || normalized.includes("warning")) return "warning";
  if (normalized.includes("green") || normalized.includes("success")) return "success";
  if (normalized.includes("blue") || normalized.includes("info")) return "info";
  return "neutral";
}

export function mapPracticeDetailToUi(detail: ApiPracticeDetail, knownUsers: readonly DemoUser[]): PracticeDetailUi {
  const attachmentsByPhase = new Map<string, number>();
  detail.attachments.forEach(({ attachment }) => {
    if (!attachment.phase_id) return;
    attachmentsByPhase.set(attachment.phase_id, (attachmentsByPhase.get(attachment.phase_id) ?? 0) + 1);
  });

  const notesByPhase = new Map<string, number>();
  detail.notes.forEach(({ note }) => {
    if (!note.phase_id) return;
    notesByPhase.set(note.phase_id, (notesByPhase.get(note.phase_id) ?? 0) + 1);
  });

  const clientName =
    detail.target?.display_name ?? detail.client?.ragione_sociale ?? "Soggetto non disponibile";
  const subjectId = detail.practice.target_id ?? detail.practice.client_id ?? "";
  const practice: Practice = {
    id: detail.practice.id,
    category: detail.category?.name ?? "Pratica",
    categoryIcon: detail.category?.icon ?? "folder-kanban",
    client: {
      city: detail.target?.city ?? detail.client?.indirizzo_sede ?? "",
      id: subjectId,
      industry: detail.client?.ateco ?? "",
      name: clientName,
      vatNumber: detail.target?.tax_id
        ? `P.IVA/CF ${detail.target.tax_id}`
        : detail.client?.piva
          ? `P.IVA ${detail.client.piva}`
          : "",
    },
    code: detail.practice.code,
    description: detail.practice.description ?? "",
    dueDate: detail.practice.scadenza ?? detail.practice.apertura,
    labels: detail.labels.map((label) => ({
      id: label.id,
      name: label.name,
      tone: mapLabelTone(label.color),
    })),
    progress: detail.progress_pct,
    responsible: userFromSummary(detail.responsible, knownUsers),
    startDate: detail.practice.apertura,
    status: mapPracticeStatus(detail.practice.status),
    title: detail.practice.title,
  };

  const phases = detail.phases.map(({ assignee, phase }): PracticePhase => ({
    assignee: userFromSummary(assignee, knownUsers),
    attachmentsCount: attachmentsByPhase.get(phase.id) ?? 0,
    description: phase.description ?? "",
    dueDate: phase.planned_end ?? phase.planned_start ?? practice.dueDate,
    id: phase.id,
    notesCount: notesByPhase.get(phase.id) ?? 0,
    order: phase.order_index,
    plannedDate: phase.planned_end ?? phase.planned_start ?? practice.startDate,
    practiceId: phase.practice_id,
    status: mapPhaseStatus(phase.status),
    title: phase.name,
  }));

  const events = detail.events.map(({ author, event }): PracticeEvent => ({
    author: userFromSummary(author, knownUsers),
    description: event.description ?? "",
    id: event.id,
    occurredAt: event.event_date,
    phaseId: event.phase_id ?? phases[0]?.id ?? "",
    practiceId: event.practice_id,
    title: event.title,
    type: mapEventType(event.event_type),
  }));

  const notes = detail.notes.map(({ author, note }): DemoNote => ({
    author: demoUserFromSummary(author, knownUsers),
    body: note.content,
    createdAt: note.created_at,
    id: note.id,
    occurredAt: note.occurred_at ?? null,
    phaseId: note.phase_id ?? phases[0]?.id ?? "",
  }));

  return { events, notes, phases, practice };
}

export function mapEventTypeToApi(type: EventType): ApiEventType {
  if (type === "call") return "telefonata_out";
  if (type === "mail") return "email_out";
  return "attesa_cliente";
}
