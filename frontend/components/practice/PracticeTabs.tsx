"use client";

import { ContactRound, FileText, FolderOpen, Info, MessageSquareText, Paperclip, Route } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Practice, PracticeEvent, PracticePhase } from "@/lib/types";

import { TabAlbero } from "./TabAlbero";
import { TabInfo } from "./TabInfo";
import { TabNotes } from "./TabNotes";

type PracticeTabsProps = {
  practice: Practice;
  phases: PracticePhase[];
  events: PracticeEvent[];
};

function Placeholder({ icon: Icon, label }: { icon: typeof Info; label: string }) {
  return (
    <Card className="min-h-[280px]">
      <CardContent className="flex h-full min-h-[280px] items-center justify-center text-center">
        <div className="space-y-3">
          <Icon className="mx-auto h-8 w-8 text-electric" />
          <p className="font-display text-lg font-semibold text-foreground">{label}</p>
          <p className="max-w-md text-sm text-muted">Sezione predisposta nello scaffold, popolamento previsto nelle fasi successive.</p>
        </div>
      </CardContent>
    </Card>
  );
}

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
        <Placeholder icon={FolderOpen} label="Timeline pratica" />
      </TabsContent>
      <TabsContent value="allegati">
        <Placeholder icon={Paperclip} label="Allegati" />
      </TabsContent>
      <TabsContent value="note">
        <TabNotes phases={phases} />
      </TabsContent>
      <TabsContent value="anagrafica">
        <Placeholder icon={ContactRound} label="Anagrafica cliente" />
      </TabsContent>
    </Tabs>
  );
}
