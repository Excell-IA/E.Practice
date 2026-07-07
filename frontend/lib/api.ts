import type { components } from "@/lib/api-types";
import type { PracticeStatus } from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";
const DEFAULT_USER_ID = "11111111-1111-4111-8111-000000000001";

export type ApiPracticePage = components["schemas"]["Page_PracticeListItem_"];
export type ApiPracticeListItem = components["schemas"]["PracticeListItem"];
export type ApiPracticeDetail = components["schemas"]["PracticeDetail"];
export type ApiPracticePhase = components["schemas"]["PracticePhase"];
export type ApiPracticeEvent = components["schemas"]["PracticeEvent"];
export type ApiNote = components["schemas"]["Note"];
export type ApiAttachment = components["schemas"]["Attachment"];
export type ApiClient = components["schemas"]["Client"];
export type ApiClientSearchHit = components["schemas"]["ClientSearchHit"];
export type ApiCategory = components["schemas"]["Category"];
export type ApiUser = components["schemas"]["User"];
export type ApiTemplatePreview = components["schemas"]["TemplatePreview"];
export type ApiCreatePracticeResponse = components["schemas"]["CreatePracticeResponse"];
export type ApiContactSummary = components["schemas"]["ContactSummary"];
export type ApiContactDetail = components["schemas"]["ContactDetail"];
export type ApiEnsurePracticeResponse = components["schemas"]["EnsurePracticeResponse"];

export type UserCreateInput = {
  avatar_color?: string | null;
  cognome: string;
  email: string;
  nome: string;
  role: ApiUser["role"];
};

type ApiFetchOptions = RequestInit & {
  userId?: string;
};

function activeUserId(userId?: string) {
  if (userId) return userId;
  if (typeof window === "undefined") return DEFAULT_USER_ID;
  return window.localStorage.getItem("epractice:user-id") ?? DEFAULT_USER_ID;
}

function activeAccessToken() {
  if (typeof window === "undefined") return null;
  return (
    window.localStorage.getItem("ework:access-token") ??
    window.localStorage.getItem("access_token") ??
    window.localStorage.getItem("token")
  );
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  headers.set("X-User-Id", activeUserId(options.userId));
  const accessToken = activeAccessToken();
  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  if (!headers.has("X-Correlation-Id")) {
    headers.set("X-Correlation-Id", crypto.randomUUID());
  }

  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (options.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const rawDetail = await response.text();
    let detail = rawDetail;
    try {
      const parsed = JSON.parse(rawDetail) as { detail?: unknown };
      detail = typeof parsed.detail === "string" ? parsed.detail : JSON.stringify(parsed.detail ?? parsed);
    } catch {
      detail = rawDetail;
    }
    throw new Error(`API ${response.status}: ${detail || response.statusText}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function getPractices(
  q?: string,
  target?: { targetId: string; targetType: ApiContactSummary["target_type"] },
) {
  const params = new URLSearchParams({ limit: "20", offset: "0" });
  if (q) params.set("q", q);
  if (target) {
    params.set("target_id", target.targetId);
    params.set("target_type", target.targetType);
  }
  return apiFetch<ApiPracticePage>(`/api/practices?${params.toString()}`);
}

export function getPracticeDetail(practiceId: string) {
  return apiFetch<ApiPracticeDetail>(`/api/practices/${practiceId}`);
}

export function getClient(clientId: string) {
  return apiFetch<ApiClient>(`/api/clients/${clientId}`);
}

export function getClientPractices(clientId: string) {
  return apiFetch<components["schemas"]["Practice"][]>(`/api/clients/${clientId}/practices`);
}

export function searchClients(q: string) {
  const params = new URLSearchParams({ limit: "10", q });
  return apiFetch<ApiClientSearchHit[]>(`/api/clients/search?${params.toString()}`);
}

export function getContacts() {
  return apiFetch<ApiContactSummary[]>("/api/contacts?limit=100");
}

export function searchContacts(q: string) {
  const params = new URLSearchParams({ limit: "20", q });
  return apiFetch<ApiContactSummary[]>(`/api/contacts/search?${params.toString()}`);
}

export function getContact(targetType: ApiContactSummary["target_type"], targetId: string) {
  return apiFetch<ApiContactDetail>(`/api/contacts/${targetType}/${targetId}`);
}

export function createContact(
  input: components["schemas"]["ContactCreateRequest"],
  userId: string,
) {
  return apiFetch<ApiContactDetail>("/api/contacts", {
    body: JSON.stringify(input),
    method: "POST",
    userId,
  });
}

export function updateContact(
  targetType: ApiContactSummary["target_type"],
  targetId: string,
  input: components["schemas"]["ContactUpdateRequest"],
  userId: string,
) {
  return apiFetch<ApiContactDetail>(`/api/contacts/${targetType}/${targetId}`, {
    body: JSON.stringify(input),
    method: "PATCH",
    userId,
  });
}

export function deleteContact(
  targetType: ApiContactSummary["target_type"],
  targetId: string,
  userId: string,
) {
  return apiFetch<void>(`/api/contacts/${targetType}/${targetId}`, {
    method: "DELETE",
    userId,
  });
}

export function getCategories() {
  return apiFetch<ApiCategory[]>("/api/categories");
}

export type CategoryCreateInput = {
  name: string;
  group_name?: string | null;
  color?: string | null;
  description?: string | null;
};

export function createCategory(input: CategoryCreateInput, userId: string) {
  return apiFetch<ApiCategory>("/api/categories", {
    body: JSON.stringify(input),
    method: "POST",
    userId,
  });
}

export function deleteCategory(categoryId: string, userId: string) {
  return apiFetch<void>(`/api/categories/${categoryId}`, {
    method: "DELETE",
    userId,
  });
}

export function getUsers() {
  return apiFetch<ApiUser[]>("/api/users");
}

export function createUser(input: UserCreateInput, userId: string) {
  return apiFetch<ApiUser>("/api/users", {
    body: JSON.stringify(input),
    method: "POST",
    userId,
  });
}

export function deleteUser(id: string, userId: string) {
  return apiFetch<void>(`/api/users/${id}`, {
    method: "DELETE",
    userId,
  });
}

export function getTemplatePreview(categoryId: string, apertura: string) {
  const params = new URLSearchParams({ apertura });
  return apiFetch<ApiTemplatePreview>(`/api/templates/category/${categoryId}/preview?${params.toString()}`);
}

export type TemplatePhaseInput = {
  name: string;
  description?: string | null;
  duration_days: number;
  default_role?: string | null;
};

export function replaceTemplateForCategory(
  categoryId: string,
  phases: TemplatePhaseInput[],
  userId: string,
) {
  return apiFetch<components["schemas"]["PhaseTemplate"][]>(`/api/templates/${categoryId}`, {
    body: JSON.stringify({ phases }),
    method: "PUT",
    userId,
  });
}

export function getTemplate(categoryId: string) {
  return apiFetch<components["schemas"]["PhaseTemplate"][]>(`/api/templates/${categoryId}`);
}

export function createClient(input: components["schemas"]["ClientCreate"], userId: string) {
  return apiFetch<ApiClient>("/api/clients", {
    body: JSON.stringify(input),
    method: "POST",
    userId,
  });
}

export function updateClient(
  clientId: string,
  input: components["schemas"]["ClientUpdate"],
  userId: string,
) {
  return apiFetch<ApiClient>(`/api/clients/${clientId}`, {
    body: JSON.stringify(input),
    method: "PUT",
    userId,
  });
}

export function deleteClient(clientId: string, userId: string) {
  return apiFetch<void>(`/api/clients/${clientId}`, {
    method: "DELETE",
    userId,
  });
}

export function createPractice(input: components["schemas"]["CreatePracticeRequest"], userId: string) {
  return apiFetch<ApiCreatePracticeResponse>("/api/practices", {
    body: JSON.stringify(input),
    method: "POST",
    userId,
  });
}

export function ensurePractice(
  input: components["schemas"]["EnsurePracticeRequest"],
  userId: string,
) {
  return apiFetch<ApiEnsurePracticeResponse>("/api/practices/ensure", {
    body: JSON.stringify(input),
    method: "POST",
    userId,
  });
}

export function deletePractice(practiceId: string, userId: string) {
  return apiFetch<void>(`/api/practices/${practiceId}`, {
    method: "DELETE",
    userId,
  });
}

export function updatePracticeStatus(
  practiceId: string,
  status: Extract<PracticeStatus, "aperta" | "sospesa" | "chiusa">,
  userId: string,
) {
  return apiFetch<components["schemas"]["Practice"]>(`/api/practices/${practiceId}`, {
    body: JSON.stringify({ status }),
    method: "PUT",
    userId,
  });
}

export function updatePhase(phaseId: string, input: components["schemas"]["UpdatePhaseRequest"], userId: string) {
  return apiFetch<ApiPracticePhase>(`/api/phases/${phaseId}`, {
    body: JSON.stringify(input),
    method: "PUT",
    userId,
  });
}

export function completePhase(phaseId: string, userId: string) {
  return apiFetch<ApiPracticePhase>(`/api/phases/${phaseId}/complete`, {
    body: JSON.stringify({
      actual_end: new Date().toISOString().slice(0, 10),
      create_reminder: false,
      note: "Completata da UI demo E.Practice.",
      reminder_days_before: 0,
    }),
    method: "POST",
    userId,
  });
}

export function skipPhase(phaseId: string, userId: string) {
  return apiFetch<ApiPracticePhase>(`/api/phases/${phaseId}/skip`, {
    body: JSON.stringify({ skip_reason: "Saltata da UI demo E.Practice." }),
    method: "POST",
    userId,
  });
}

export function updatePhaseAssignee(phaseId: string, assigneeId: string, userId: string) {
  return updatePhase(phaseId, { assignee_id: assigneeId }, userId);
}

export type ApiPhaseStatus = "pending" | "in_progress" | "completed" | "skipped" | "blocked";

export function setPhaseStatus(phaseId: string, statusValue: ApiPhaseStatus, userId: string) {
  return apiFetch<ApiPracticePhase>(`/api/phases/${phaseId}/status`, {
    body: JSON.stringify({ status: statusValue }),
    method: "POST",
    userId,
  });
}

export function createNote(input: components["schemas"]["NoteCreate"], userId: string) {
  return apiFetch<ApiNote>("/api/notes", {
    body: JSON.stringify(input),
    method: "POST",
    userId,
  });
}

export function updateNote(noteId: string, input: components["schemas"]["UpdateNoteRequest"], userId: string) {
  return apiFetch<ApiNote>(`/api/notes/${noteId}`, {
    body: JSON.stringify(input),
    method: "PUT",
    userId,
  });
}

export function createEvent(input: components["schemas"]["CreateEventRequest"], userId: string) {
  return apiFetch<ApiPracticeEvent>("/api/events", {
    body: JSON.stringify(input),
    method: "POST",
    userId,
  });
}

export function updateEvent(eventId: string, input: components["schemas"]["PracticeEventUpdate"], userId: string) {
  return apiFetch<ApiPracticeEvent>(`/api/events/${eventId}`, {
    body: JSON.stringify(input),
    method: "PUT",
    userId,
  });
}

export function uploadAttachment(file: File, userId: string) {
  const formData = new FormData();
  formData.append("file", file);
  return apiFetch<ApiAttachment>("/api/attachments", {
    body: formData,
    method: "POST",
    userId,
  });
}

export function attachAttachment(id: string, practiceId: string, phaseId: string | null, userId: string) {
  return apiFetch<ApiAttachment>(`/api/attachments/${id}/attach`, {
    body: JSON.stringify({ phase_id: phaseId, practice_id: practiceId }),
    method: "POST",
    userId,
  });
}

export function deleteAttachment(id: string, userId: string) {
  return apiFetch<void>(`/api/attachments/${id}`, {
    method: "DELETE",
    userId,
  });
}

export function listAttachments(practiceId?: string) {
  const params = new URLSearchParams();
  if (practiceId) params.set("practice_id", practiceId);
  const suffix = params.size ? `?${params.toString()}` : "";
  return apiFetch<ApiAttachment[]>(`/api/attachments${suffix}`);
}
