"use client";

import { CheckCircle2, FileSpreadsheet, UploadCloud, XCircle } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ImportRow = {
  id: string;
  fileName: string;
  client: string;
  practice: string;
  status: "valid" | "warning";
};

function rowsFromFiles(files: File[]): ImportRow[] {
  return files.map((file, index) => ({
    client: index % 2 === 0 ? "Acciaierie Valgobbia SRL" : "Officine Meccaniche Brescia",
    fileName: file.name,
    id: `${file.name}-${file.lastModified}`,
    practice: index % 2 === 0 ? "Bilancio 2025" : "Liquidazione IVA Q2",
    status: file.name.toLowerCase().endsWith(".csv") || file.name.toLowerCase().endsWith(".xlsx") ? "valid" : "warning",
  }));
}

export function ImportPracticeClient() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [rows, setRows] = useState<ImportRow[]>([
    {
      client: "Acciaierie Valgobbia SRL",
      fileName: "scadenziario-bilanci-studio-leali.xlsx",
      id: "seed-1",
      practice: "Bilancio 2025",
      status: "valid",
    },
    {
      client: "Panificio San Faustino SNC",
      fileName: "lipe-q2.csv",
      id: "seed-2",
      practice: "LIPE Q2",
      status: "valid",
    },
  ]);
  const validCount = useMemo(() => rows.filter((row) => row.status === "valid").length, [rows]);

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    setRows((current) => [...rowsFromFiles(Array.from(fileList)), ...current]);
  }

  return (
    <main className="min-h-[calc(100vh-60px)] bg-surface">
      <header className="border-b border-border bg-surface-low/80 px-6 py-6 md:px-10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">
              Import pratiche
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-foreground md:text-4xl">
              Carica scadenziari e bozze pratica
            </h1>
          </div>
          <Badge variant="info">{validCount} righe pronte</Badge>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-5 px-6 py-6 md:px-10 lg:grid-cols-[1fr_360px]">
        <Card
          className={isDragging ? "border-electric bg-electric/10" : undefined}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            addFiles(event.dataTransfer.files);
          }}
        >
          <CardContent className="flex min-h-[360px] flex-col items-center justify-center gap-5 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-electric/10 text-electric">
              <UploadCloud className="h-8 w-8" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-semibold text-foreground">Trascina qui un file</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
                V0 salva la selezione in memoria locale della demo. CSV e XLSX vengono marcati come pronti.
              </p>
            </div>
            <input
              accept=".csv,.xlsx,.xls,.pdf"
              className="hidden"
              multiple
              onChange={(event) => addFiles(event.target.files)}
              ref={inputRef}
              type="file"
            />
            <Button onClick={() => inputRef.current?.click()} type="button">
              <FileSpreadsheet className="h-4 w-4" />
              Seleziona file
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Anteprima import</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rows.map((row) => (
              <div className="rounded-xl border border-border bg-surface-container p-3" key={row.id}>
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-label text-sm font-semibold text-foreground">{row.fileName}</p>
                    <p className="mt-1 text-xs text-muted">{row.client}</p>
                  </div>
                  {row.status === "valid" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-warning" />
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-foreground-variant">{row.practice}</span>
                  <Badge variant={row.status === "valid" ? "success" : "warning"}>
                    {row.status === "valid" ? "Pronto" : "Da verificare"}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
