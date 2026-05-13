import { CalendarDays, Landmark, UserRound } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Practice } from "@/lib/types";

type TabInfoProps = {
  practice: Practice;
};

export function TabInfo({ practice }: TabInfoProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Landmark className="h-4 w-4 text-electric" />
            Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-foreground-variant">
          <p className="font-semibold text-foreground">{practice.client.name}</p>
          <p>{practice.client.industry}</p>
          <p>{practice.client.vatNumber}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserRound className="h-4 w-4 text-electric" />
            Responsabile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-foreground-variant">
          <p className="font-semibold text-foreground">{practice.responsible.name}</p>
          <p>{practice.responsible.role}</p>
          <p>Owner pratica</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4 text-electric" />
            Pianificazione
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-foreground-variant">
          <p>Avvio {new Intl.DateTimeFormat("it-IT").format(new Date(practice.startDate))}</p>
          <p>Scadenza {new Intl.DateTimeFormat("it-IT").format(new Date(practice.dueDate))}</p>
          <p>{practice.progress}% completato</p>
        </CardContent>
      </Card>
    </div>
  );
}
