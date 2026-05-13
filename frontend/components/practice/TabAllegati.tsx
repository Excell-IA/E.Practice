"use client";

import { Download, FileText, UploadCloud } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { V1Hint } from "@/components/ui/v1-hint";
import { DEMO_USERS } from "@/lib/demo-state";
import { cn } from "@/lib/utils";

const MOCK_ATTACHMENTS = [
  {
    author: DEMO_USERS[1],
    id: "a1",
    name: "Bilancio_2025_bozza.pdf",
    phase: "Redazione bozza",
    size: "1.2 MB",
    uploadedAt: "2026-03-12",
  },
  {
    author: DEMO_USERS[2],
    id: "a2",
    name: "Scritture_assestamento.xlsx",
    phase: "Scritture assestamento",
    size: "680 KB",
    uploadedAt: "2026-02-12",
  },
  {
    author: DEMO_USERS[1],
    id: "a3",
    name: "Riconciliazione_banche.xlsx",
    phase: "Riconciliazione conti",
    size: "410 KB",
    uploadedAt: "2026-02-05",
  },
  {
    author: DEMO_USERS[0],
    id: "a4",
    name: "Estratto_camera_di_commercio.pdf",
    phase: "Raccolta scritture",
    size: "220 KB",
    uploadedAt: "2026-01-22",
  },
];

function avatarClass(userId: string) {
  if (userId.endsWith("0001")) return "bg-[#14532d]";
  if (userId.endsWith("0002")) return "bg-[#0f766e]";
  if (userId.endsWith("0003")) return "bg-[#ea580c]";
  return "bg-[#6b7280]";
}

export function TabAllegati() {
  return (
    <section className="rounded-2xl border border-border bg-surface-low p-5">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Allegati</p>
          <h3 className="font-display text-xl font-semibold text-foreground">Documenti pratica</h3>
        </div>
        <V1Hint label="Disponibile in V1">
          <div className="flex items-center gap-2 rounded-2xl border border-dashed border-electric/35 bg-electric/5 px-4 py-3 text-sm font-semibold text-electric">
            <UploadCloud className="h-4 w-4" />
            Trascina qui un file
          </div>
        </V1Hint>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-separate border-spacing-y-2 text-left">
          <thead className="text-[11px] uppercase tracking-[0.14em] text-muted">
            <tr>
              <th className="px-3 py-2 font-semibold">File</th>
              <th className="px-3 py-2 font-semibold">Dimensione</th>
              <th className="px-3 py-2 font-semibold">Fase</th>
              <th className="px-3 py-2 font-semibold">Autore</th>
              <th className="px-3 py-2 font-semibold">Data</th>
              <th className="px-3 py-2 text-right font-semibold">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_ATTACHMENTS.map((attachment) => (
              <tr className="rounded-2xl bg-surface-container text-sm text-foreground-variant" key={attachment.id}>
                <td className="rounded-l-2xl px-3 py-3">
                  <span className="flex items-center gap-2 font-mono text-xs text-foreground">
                    <FileText className="h-4 w-4 text-electric" />
                    {attachment.name}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <Badge>{attachment.size}</Badge>
                </td>
                <td className="px-3 py-3">{attachment.phase}</td>
                <td className="px-3 py-3">
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full font-display text-[10px] font-bold text-white",
                        avatarClass(attachment.author.id),
                      )}
                    >
                      {attachment.author.initials}
                    </span>
                    {attachment.author.name}
                  </span>
                </td>
                <td className="px-3 py-3">{new Intl.DateTimeFormat("it-IT").format(new Date(attachment.uploadedAt))}</td>
                <td className="rounded-r-2xl px-3 py-3 text-right">
                  <V1Hint label="Disponibile in V1">
                    <Button size="sm" type="button" variant="outline">
                      <Download className="h-4 w-4" />
                      Scarica
                    </Button>
                  </V1Hint>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
