"use client";

import { ContactRound, FileText, Info, MessageSquareText, Paperclip, Route } from "lucide-react";
import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Practice, PracticeEvent, PracticePhase } from "@/lib/types";

import { TabAlbero } from "./TabAlbero";
import { TabAllegati } from "./TabAllegati";
import { TabAnagrafica } from "./TabAnagrafica";
import { TabInfo } from "./TabInfo";
import { TabNotes } from "./TabNotes";
import { TabTimeline } from "./TabTimeline";

type PracticeTabsProps = {
  practice: Practice;
  phases: PracticePhase[];
  events: PracticeEvent[];
};

type PracticeTabValue = "info" | "albero" | "timeline" | "allegati" | "note" | "anagrafica";

export type TreePendingSelection = { kind: "phase" | "event"; id: string } | null;

export function PracticeTabs({ practice, phases, events }: PracticeTabsProps) {
  const [activeTab, setActiveTab] = useState<PracticeTabValue>("albero");
  const [pendingTreeSelection, setPendingTreeSelection] = useState<TreePendingSelection>(null);
  const [focusNoteId, setFocusNoteId] = useState<string | null>(null);

  function requestTreeSelect(kind: "phase" | "event", id: string) {
    setPendingTreeSelection({ kind, id });
    setActiveTab("albero");
  }

  function requestNoteFocus(noteId: string) {
    setFocusNoteId(noteId);
    setActiveTab("note");
  }

  return (
    <Tabs onValueChange={(value) => setActiveTab(value as PracticeTabValue)} value={activeTab}>
      <div className="overflow-x-auto">
        <TabsList>
          <TabsTrigger value="info">
            <Info className="h-4 w-4" />
            Info
          </TabsTrigger>
          <TabsTrigger value="albero">
            <Route className="h-4 w-4" />
            Albero attivo
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <FileText className="h-4 w-4" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="allegati">
            <Paperclip className="h-4 w-4" />
            Allegati
          </TabsTrigger>
          <TabsTrigger value="note">
            <MessageSquareText className="h-4 w-4" />
            Note
          </TabsTrigger>
          <TabsTrigger value="anagrafica">
            <ContactRound className="h-4 w-4" />
            Anagrafica
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="info">
        <TabInfo practice={practice} />
      </TabsContent>
      <TabsContent value="albero">
        <TabAlbero
          events={events}
          onRequestNoteFocus={requestNoteFocus}
          onSwitchTab={setActiveTab}
          onTreeSelectionApplied={() => setPendingTreeSelection(null)}
          phases={phases}
          practice={practice}
          pendingSelection={pendingTreeSelection}
        />
      </TabsContent>
      <TabsContent value="timeline">
        <TabTimeline
          events={events}
          onRequestTreeSelect={requestTreeSelect}
          onSwitchTab={setActiveTab}
          phases={phases}
        />
      </TabsContent>
      <TabsContent value="allegati">
        <TabAllegati phases={phases} practice={practice} />
      </TabsContent>
      <TabsContent value="note">
        <TabNotes focusNoteId={focusNoteId} onFocusApplied={() => setFocusNoteId(null)} phases={phases} />
      </TabsContent>
      <TabsContent value="anagrafica">
        <TabAnagrafica practice={practice} />
      </TabsContent>
    </Tabs>
  );
}
