import { PracticeTree } from "@/components/tree/PracticeTree";
import type { Practice, PracticeEvent, PracticePhase } from "@/lib/types";

type TabAlberoProps = {
  practice: Practice;
  phases: PracticePhase[];
  events: PracticeEvent[];
  onSwitchTab: (tab: "allegati" | "note") => void;
};

export function TabAlbero({ practice, phases, events, onSwitchTab }: TabAlberoProps) {
  return <PracticeTree events={events} onSwitchTab={onSwitchTab} phases={phases} practice={practice} />;
}
