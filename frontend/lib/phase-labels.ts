import type { PracticePhase } from "@/lib/types";

export const phaseStatusLabel: Record<PracticePhase["status"], string> = {
  pending: "Da fare",
  in_progress: "In corso",
  done: "Completata",
  skipped: "Saltata",
  blocked: "Bloccata",
};
