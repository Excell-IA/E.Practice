"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Mail, MessageSquareText, PhoneCall, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createEvent,
  ensurePractice,
  getCategories,
  getPracticeDetail,
  getPractices,
  type ApiContactSummary,
} from "@/lib/api";

type TimelineWidgetProps = {
  targetId: string;
  targetType: ApiContactSummary["target_type"];
  subjectName: string;
  userId: string;
  compact?: boolean;
  readOnly?: boolean;
};

type QuickEventType = "telefonata_out" | "email_out" | "incontro" | "nota_interna";

const eventOptions: { icon: typeof PhoneCall; label: string; value: QuickEventType }[] = [
  { icon: PhoneCall, label: "Telefonata", value: "telefonata_out" },
  { icon: Mail, label: "Email", value: "email_out" },
  { icon: Users, label: "Incontro", value: "incontro" },
  { icon: MessageSquareText, label: "Nota", value: "nota_interna" },
];

function eventLabel(value: string) {
  return eventOptions.find((item) => item.value === value)?.label ?? value.replaceAll("_", " ");
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function TimelineWidget({
  compact = false,
  readOnly = false,
  subjectName,
  targetId,
  targetType,
  userId,
}: TimelineWidgetProps) {
  const queryClient = useQueryClient();
  const [composerOpen, setComposerOpen] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [eventType, setEventType] = useState<QuickEventType>("telefonata_out");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState(todayIso);

  const practicesQuery = useQuery({
    queryFn: () => getPractices(undefined, { targetId, targetType }),
    queryKey: ["practices", "target", targetType, targetId],
  });
  const categoriesQuery = useQuery({
    enabled: composerOpen && !practicesQuery.data?.items.length,
    queryFn: getCategories,
    queryKey: ["categories"],
  });
  const practice = practicesQuery.data?.items[0] ?? null;
  const detailQuery = useQuery({
    enabled: Boolean(practice),
    queryFn: () => getPracticeDetail(practice?.id ?? ""),
    queryKey: ["practice-detail", practice?.id],
  });

  useEffect(() => {
    if (!categoryId && categoriesQuery.data?.[0]) {
      setCategoryId(categoriesQuery.data[0].id);
    }
  }, [categoriesQuery.data, categoryId]);

  const entries = useMemo(() => {
    const detail = detailQuery.data;
    if (!detail) return [];
    const events = detail.events.map((item) => ({
      author: item.author ? `${item.author.nome} ${item.author.cognome}` : "Utente",
      date: item.event.event_date,
      id: item.event.id,
      kind: eventLabel(item.event.event_type),
      title: item.event.title,
    }));
    const notes = detail.notes.map((item) => ({
      author: item.author ? `${item.author.nome} ${item.author.cognome}` : "Utente",
      date: item.note.occurred_at ?? item.note.created_at,
      id: item.note.id,
      kind: "Nota",
      title: item.note.content,
    }));
    return [...events, ...notes]
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
      .slice(0, compact ? 5 : 10);
  }, [compact, detailQuery.data]);

  const createContactMutation = useMutation({
    mutationFn: async () => {
      let practiceId = practice?.id;
      let practiceCode = practice?.code;
      if (!practiceId) {
        if (!categoryId) {
          throw new Error("Seleziona la tipologia della pratica da aprire.");
        }
        const ensured = await ensurePractice(
          {
            apertura: eventDate,
            category_id: categoryId,
            create_default_reminders: false,
            description: `Storico relazioni con ${subjectName}`,
            priority: "media",
            responsible_id: userId,
            scadenza: null,
            target_id: targetId,
            target_type: targetType,
            title: `Relazione cliente - ${subjectName}`,
          },
          userId,
        );
        practiceId = ensured.practice.id;
        practiceCode = ensured.practice.code;
      }
      await createEvent(
        {
          author_id: userId,
          description: description.trim() || null,
          event_date: eventDate,
          event_time: null,
          event_type: eventType,
          participant_id: targetId,
          participant_type: targetType,
          phase_id: null,
          practice_id: practiceId,
          title: title.trim(),
          visual_position: "top",
        },
        userId,
      );
      return { practiceCode, practiceId };
    },
    onSuccess: async ({ practiceId }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["practices"] }),
        queryClient.invalidateQueries({
          queryKey: ["practices", "target", targetType, targetId],
        }),
        queryClient.invalidateQueries({ queryKey: ["practice-detail", practiceId] }),
      ]);
      setComposerOpen(false);
      setDescription("");
      setTitle("");
      setEventDate(todayIso());
    },
  });

  return (
    <Card className="border-electric/20">
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">
            E.Practice embedded
          </p>
          <CardTitle className="mt-1">Storico relazioni</CardTitle>
        </div>
        {!readOnly ? (
          <Button onClick={() => setComposerOpen((current) => !current)} size="sm" type="button">
            <Plus className="h-4 w-4" />
            Registra contatto
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {practicesQuery.isError ? (
          <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            Storico non disponibile. E.Practice non ha creato alcun dato locale sostitutivo.
          </p>
        ) : null}

        {composerOpen ? (
          <div className="space-y-3 rounded-xl border border-border bg-surface-container p-3">
            {!practice ? (
              <label className="block text-sm">
                <span className="text-muted">Tipologia pratica da aprire al primo contatto</span>
                <select
                  className="mt-1 h-10 w-full rounded-xl border border-border bg-surface-low px-3 text-foreground outline-none focus:border-electric"
                  onChange={(event) => setCategoryId(event.target.value)}
                  value={categoryId}
                >
                  <option value="">Seleziona tipologia</option>
                  {(categoriesQuery.data ?? []).map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="text-muted">Tipo</span>
                <select
                  className="mt-1 h-10 w-full rounded-xl border border-border bg-surface-low px-3 text-foreground outline-none focus:border-electric"
                  onChange={(event) => setEventType(event.target.value as QuickEventType)}
                  value={eventType}
                >
                  {eventOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="text-muted">Data</span>
                <input
                  className="mt-1 h-10 w-full rounded-xl border border-border bg-surface-low px-3 text-foreground outline-none focus:border-electric"
                  onChange={(event) => setEventDate(event.target.value)}
                  type="date"
                  value={eventDate}
                />
              </label>
            </div>
            <label className="block text-sm">
              <span className="text-muted">Titolo</span>
              <input
                className="mt-1 h-10 w-full rounded-xl border border-border bg-surface-low px-3 text-foreground outline-none focus:border-electric"
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Es. Richiesta documenti"
                value={title}
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted">Descrizione</span>
              <textarea
                className="mt-1 min-h-20 w-full rounded-xl border border-border bg-surface-low px-3 py-2 text-foreground outline-none focus:border-electric"
                onChange={(event) => setDescription(event.target.value)}
                value={description}
              />
            </label>
            {createContactMutation.error ? (
              <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                {createContactMutation.error.message}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button onClick={() => setComposerOpen(false)} type="button" variant="ghost">
                Annulla
              </Button>
              <Button
                disabled={
                  !title.trim() ||
                  (!practice && !categoryId) ||
                  createContactMutation.isPending
                }
                onClick={() => createContactMutation.mutate()}
                type="button"
              >
                {createContactMutation.isPending ? "Salvataggio..." : "Salva contatto"}
              </Button>
            </div>
          </div>
        ) : null}

        {practice ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface-container px-3 py-2">
            <div>
              <p className="font-label text-xs font-semibold text-electric">{practice.code}</p>
              <p className="text-sm font-semibold text-foreground">{practice.title}</p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href={`/pratiche/${practice.code}`}>Apri pratica</Link>
            </Button>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border bg-surface-container px-3 py-4 text-sm text-muted">
            Nessuna pratica relazionale ancora aperta. La semplice consultazione non crea record:
            la pratica nasce al primo contatto registrato.
          </p>
        )}

        {entries.length ? (
          <ol className="space-y-2">
            {entries.map((entry) => (
              <li
                className="flex items-start justify-between gap-3 rounded-xl border border-border bg-surface-low px-3 py-2"
                key={`${entry.kind}-${entry.id}`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="info">{entry.kind}</Badge>
                    <p className="truncate text-sm font-semibold text-foreground">{entry.title}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted">{entry.author}</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {new Date(entry.date).toLocaleDateString("it-IT")}
                </span>
              </li>
            ))}
          </ol>
        ) : practice && !detailQuery.isLoading ? (
          <p className="text-sm text-muted">Nessun contatto registrato per questa pratica.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
