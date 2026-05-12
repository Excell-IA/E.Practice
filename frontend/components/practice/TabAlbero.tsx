import { PracticeTree } from "@/components/tree/PracticeTree";
import type { Practice, PracticeEvent, PracticePhase } from "@/lib/types";

type TabAlberoProps = {
  practice: Practice;
  phases: PracticePhase[];
  events: PracticeEvent[];
};

export function TabAlbero({ practice, phases, events }: TabAlberoProps) {
  return <PracticeTree events={events} phases={phases} practice={practice} />;
}
