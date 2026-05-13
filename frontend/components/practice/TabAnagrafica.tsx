"use client";

import { Building2, Mail, MapPin, Pencil, Phone, Tags } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { V1Hint } from "@/components/ui/v1-hint";
import type { Practice } from "@/lib/types";

type TabAnagraficaProps = {
  practice: Practice;
};

function EmptyValue() {
  return <span className="text-muted">-</span>;
}

export function TabAnagrafica({ practice }: TabAnagraficaProps) {
  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Anagrafica</p>
          <h3 className="font-display text-xl font-semibold text-foreground">{practice.client.name}</h3>
        </div>
        <V1Hint label="Disponibile in V1">
          <Button type="button" variant="outline">
            <Pencil className="h-4 w-4" />
            Modifica anagrafica
          </Button>
        </V1Hint>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-electric" />
              Ragione sociale
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-muted">Nominativo</p>
              <p className="font-semibold text-foreground">{practice.client.name}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-muted">P.IVA</p>
                <p className="font-semibold text-foreground">{practice.client.vatNumber || <EmptyValue />}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-muted">Codice fiscale</p>
                <EmptyValue />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-electric" />
              Sede
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-muted">Indirizzo / citta</p>
              <p className="font-semibold text-foreground">{practice.client.city || <EmptyValue />}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-muted">Settore</p>
              <p className="font-semibold text-foreground">{practice.client.industry || <EmptyValue />}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-electric" />
              Contatti
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-muted">Email</p>
              <p className="font-semibold text-foreground">
                <EmptyValue />
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-muted">Telefono</p>
              <p className="font-semibold text-foreground">
                <EmptyValue />
              </p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-xs uppercase tracking-[0.12em] text-muted">
                <Mail className="h-3.5 w-3.5" />
                PEC
              </p>
              <p className="font-semibold text-foreground">
                <EmptyValue />
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tags className="h-4 w-4 text-electric" />
              Etichette e pratiche
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
              {practice.labels.map((label) => (
                <Badge key={label.id} variant={label.tone === "neutral" ? "default" : label.tone}>
                  {label.name}
                </Badge>
              ))}
            </div>
            <div className="rounded-2xl border border-border bg-surface-container p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-muted">Pratiche aperte</p>
              <p className="font-semibold text-foreground">1 questa</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
