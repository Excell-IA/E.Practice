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
  onRequestNoteFocus?: (noteId: string) => void;
};

export function TabAlbero({ practice, phases, events, onSwitchTab, pendingSelection, onTreeSelectionApplied, onRequestNoteFocus }: TabAlberoProps) {
  return (
    <PracticeTree
      events={events}
      onRequestNoteFocus={onRequestNoteFocus}
      onSwitchTab={onSwitchTab}
      onTreeSelectionApplied={onTreeSelectionApplied}
      pendingSelection={pendingSelection}
      phases={phases}
      practice={practice}
    />
  );
}
