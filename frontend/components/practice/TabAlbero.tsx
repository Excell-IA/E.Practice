import { PracticeTree } from "@/components/tree/PracticeTree";
import type { Practice, PracticeEvent, PracticePhase } from "@/lib/types";

import type { TreePendingSelection } from "./PracticeTabs";

type TabAlberoProps = {
  practice: Practice;
  phases: PracticePhase[];
  events: PracticeEvent[];
  onSwitchTab: (tab: "allegati" | "note") => void;
  pendingSelection?: TreePendingSelection;
  onTreeSelectionApplied?: () => void;
};

export function TabAlbero({ practice, phases, events, onSwitchTab, pendingSelection, onTreeSelectionApplied }: TabAlberoProps) {
  return (
    <PracticeTree
      events={events}
      onSwitchTab={onSwitchTab}
      onTreeSelectionApplied={onTreeSelectionApplied}
      pendingSelection={pendingSelection}
      phases={phases}
      practice={practice}
    />
  );
}
