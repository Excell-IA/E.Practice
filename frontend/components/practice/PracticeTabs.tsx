"use client";

import { ContactRound, FileText, Info, MessageSquareText, Paperclip, Route } from "lucide-react";

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

export function PracticeTabs({ practice, phases, events }: PracticeTabsProps) {
  return (
    <Tabs defaultValue="albero">
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
        <TabAlbero events={events} phases={phases} practice={practice} />
      </TabsContent>
      <TabsContent value="timeline">
        <TabTimeline events={events} phases={phases} />
      </TabsContent>
      <TabsContent value="allegati">
        <TabAllegati phases={phases} practice={practice} />
      </TabsContent>
      <TabsContent value="note">
        <TabNotes phases={phases} />
      </TabsContent>
      <TabsContent value="anagrafica">
        <TabAnagrafica practice={practice} />
      </TabsContent>
    </Tabs>
  );
}
