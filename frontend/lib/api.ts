import type { components } from "@/lib/api-types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const DEFAULT_USER_ID = "11111111-1111-4111-8111-000000000001";

export type ApiPracticePage = components["schemas"]["Page_Practice_"];
export type ApiPracticeDetail = components["schemas"]["PracticeDetail"];
export type ApiPracticePhase = components["schemas"]["PracticePhase"];
export type ApiPracticeEvent = components["schemas"]["PracticeEvent"];
export type ApiNote = components["schemas"]["Note"];
export type ApiClient = components["schemas"]["Client"];
export type ApiClientSearchHit = components["schemas"]["ClientSearchHit"];
export type ApiCategory = components["schemas"]["Category"];
export type ApiUser = components["schemas"]["User"];
export type ApiTemplatePreview = components["schemas"]["TemplatePreview"];
export type ApiCreatePracticeResponse = components["schemas"]["CreatePracticeResponse"];

type ApiFetchOptions = RequestInit & {
  userId?: string;
};

function activeUserId(userId?: string) {
  if (userId) return userId;
  if (typeof window === "undefined") return DEFAULT_USER_ID;
  return window.localStorage.getItem("epractice:user-id") ?? DEFAULT_USER_ID;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  headers.set("X-User-Id", activeUserId(options.userId));

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`API ${response.status}: ${detail || response.statusText}`);
  }

  return (await response.json()) as T;
}

export function getPractices(q?: string) {
  const params = new URLSearchParams({ limit: "20", offset: "0" });
  if (q) params.set("q", q);
  return apiFetch<ApiPracticePage>(`/api/practices?${params.toString()}`);
}

export function getPracticeDetail(practiceId: string) {
  return apiFetch<ApiPracticeDetail>(`/api/practices/${practiceId}`);
}

export function searchClients(q: string) {
  const params = new URLSearchParams({ limit: "10", q });
  return apiFetch<ApiClientSearchHit[]>(`/api/clients/search?${params.toString()}`);
}

export function getCategories() {
  return apiFetch<ApiCategory[]>("/api/categories");
}

export function getUsers() {
  return apiFetch<ApiUser[]>("/api/users");
}

export function getTemplatePreview(categoryId: string, apertura: string) {
  const params = new URLSearchParams({ apertura });
  return apiFetch<ApiTemplatePreview>(`/api/templates/category/${categoryId}/preview?${params.toString()}`);
}

export function createClient(input: components["schemas"]["ClientCreate"], userId: string) {
  return apiFetch<ApiClient>("/api/clients", {
    body: JSON.stringify(input),
    method: "POST",
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
  return apiFetch<ApiPracticePhase>(`/api/phases/${phaseId}`, {
    body: JSON.stringify({ assignee_id: assigneeId }),
    method: "PUT",
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

export function createEvent(input: components["schemas"]["CreateEventRequest"], userId: string) {
  return apiFetch<ApiPracticeEvent>("/api/events", {
    body: JSON.stringify(input),
    method: "POST",
    userId,
  });
}
