"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { EWorkShell } from "@/components/shell/EWorkShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpButton } from "@/components/ui/help-button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  createUser,
  deleteUser,
  getUsers,
  type ApiUser,
  type UserCreateInput,
} from "@/lib/api";
import { useDemoStore } from "@/lib/demo-state";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const roleMap = {
  esterno: "Esterno",
  junior: "Centralino",
  senior: "Operatore",
  titolare: "Admin",
} as const;

const uiToApiRole = {
  Admin: "titolare",
  Centralino: "junior",
  Esterno: "esterno",
  Operatore: "senior",
} as const;

const roleOptions = ["Admin", "Operatore", "Centralino", "Esterno"] as const;

type UserRoleLabel = (typeof roleOptions)[number];

type NewUserDraft = {
  avatarColor: string;
  cognome: string;
  email: string;
  nome: string;
  role: UserRoleLabel;
};

const defaultUserDraft: NewUserDraft = {
  avatarColor: "#0f766e",
  cognome: "",
  email: "",
  nome: "",
  role: "Operatore",
};

const avatarColors = ["#14532d", "#0f766e", "#0ea5e9", "#7c3aed", "#ea580c", "#6b7280"];

function initials(user: Pick<ApiUser, "cognome" | "nome">) {
  return `${user.nome.slice(0, 1)}${user.cognome.slice(0, 1)}`.toUpperCase();
}

async function patchUser(userId: string, body: Partial<Pick<ApiUser, "role">>, activeUserId: string) {
  const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
    body: JSON.stringify(body),
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "X-User-Id": activeUserId,
    },
    method: "PATCH",
  });
  if (!response.ok) throw new Error(`Errore update utente: ${response.status}`);
  return (await response.json()) as ApiUser;
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const activeUser = useDemoStore((state) => state.activeUser);
  const canEdit = activeUser.permission === "admin";
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [newUser, setNewUser] = useState<NewUserDraft>(defaultUserDraft);
  const [creatingUser, setCreatingUser] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiUser | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const usersQuery = useQuery({
    queryFn: () => getUsers(),
    queryKey: ["users"],
  });
  const users = usersQuery.data ?? [];

  async function updateUser(userId: string, body: Partial<Pick<ApiUser, "role">>) {
    await patchUser(userId, body, activeUser.id);
    await queryClient.invalidateQueries({ queryKey: ["users"] });
  }

  async function submitNewUser() {
    if (!newUser.nome.trim() || !newUser.cognome.trim() || !newUser.email.trim()) return;
    setCreatingUser(true);
    setCreateError(null);
    const input: UserCreateInput = {
      avatar_color: newUser.avatarColor,
      cognome: newUser.cognome.trim(),
      email: newUser.email.trim(),
      nome: newUser.nome.trim(),
      role: uiToApiRole[newUser.role],
    };
    try {
      await createUser(input, activeUser.id);
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      setNewUser(defaultUserDraft);
      setNewUserOpen(false);
    } catch (err) {
      console.error("create_user_failed", err);
      setCreateError(err instanceof Error ? err.message : "Creazione utente non riuscita.");
    } finally {
      setCreatingUser(false);
    }
  }

  async function confirmDeleteUser() {
    if (!deleteTarget) return;
    setDeletingUser(true);
    setDeleteError(null);
    try {
      await deleteUser(deleteTarget.id, activeUser.id);
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      setDeleteTarget(null);
    } catch (err) {
      console.error("delete_user_failed", err);
      setDeleteError(err instanceof Error ? err.message : "Eliminazione utente non riuscita.");
    } finally {
      setDeletingUser(false);
    }
  }

  function openDeleteSheet(user: ApiUser) {
    setDeleteTarget(user);
    setDeleteError(null);
  }

  return (
    <EWorkShell code="Utenti">
      <main className="min-h-[calc(100vh-120px)] bg-surface px-6 py-6 md:px-10">
        <div>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <HelpButton title="Utenti" subtitle="Gestione dei collaboratori e dei ruoli">
                <section>
                  <p>
                    La pagina elenca gli utenti dello studio con avatar, email e ruolo. Solo gli utenti con ruolo{" "}
                    <strong className="text-foreground">Admin</strong> possono modificare ruoli e creare o eliminare utenti.
                  </p>
                </section>
                <section>
                  <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">
                    Ruoli disponibili
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li><strong className="text-foreground">Admin</strong>: visibilita totale, gestisce studio e utenti.</li>
                    <li><strong className="text-foreground">Operatore</strong>: lavora sulle pratiche, puo creare/editare.</li>
                    <li><strong className="text-foreground">Centralino</strong>: gestisce note, telefonate e contatti.</li>
                    <li><strong className="text-foreground">Esterno</strong>: collaboratore in sola lettura.</li>
                  </ul>
                </section>
              </HelpButton>
              <h1 className="font-display text-3xl font-semibold text-foreground">Utenti</h1>
            </div>
            <Button disabled={!canEdit} onClick={() => setNewUserOpen(true)} title={!canEdit ? "Solo Admin puo creare utenti" : undefined} type="button">
              <Plus className="h-4 w-4" />
              Nuovo utente
            </Button>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-border bg-surface-low">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead className="bg-surface-container text-left font-display text-[11px] uppercase tracking-[0.14em] text-muted">
                <tr>
                  <th className="px-4 py-3">Avatar</th>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Ruolo</th>
                  <th className="px-4 py-3 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr className="border-t border-border" key={user.id}>
                    <td className="px-4 py-3">
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-full font-display text-xs font-bold text-white"
                        style={{ backgroundColor: user.avatar_color ?? "#6b7280" }}
                      >
                        {initials(user)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">{user.nome} {user.cognome}</td>
                    <td className="px-4 py-3 text-foreground-variant">{user.email}</td>
                    <td className="px-4 py-3">
                      <select
                        className="h-9 rounded-xl border border-border bg-surface-container px-3 text-sm outline-none disabled:opacity-50"
                        disabled={!canEdit}
                        onChange={(event) => updateUser(user.id, { role: uiToApiRole[event.target.value as UserRoleLabel] })}
                        title={canEdit ? "Modifica ruolo utente" : "Solo Admin puo modificare gli utenti"}
                        value={roleMap[user.role]}
                      >
                        {roleOptions.map((role) => (
                          <option key={role}>{role}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        aria-label={`Elimina ${user.nome} ${user.cognome}`}
                        disabled={!canEdit}
                        onClick={() => openDeleteSheet(user)}
                        title={canEdit ? "Elimina utente" : "Solo Admin puo eliminare utenti"}
                        type="button"
                        variant="ghost"
                      >
                        <Trash2 className="h-4 w-4 text-danger" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Sheet onOpenChange={setNewUserOpen} open={newUserOpen}>
        <SheetContent className="max-w-md">
          <SheetHeader>
            <SheetTitle>Nuovo utente</SheetTitle>
            <SheetDescription>Aggiungi un collaboratore dello studio.</SheetDescription>
          </SheetHeader>
          <div className="space-y-3">
            {createError ? (
              <p className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">
                {createError}
              </p>
            ) : null}
            <input
              className="h-10 w-full rounded-xl border border-border bg-surface-low px-3 text-sm outline-none"
              onChange={(event) => setNewUser((draft) => ({ ...draft, nome: event.target.value }))}
              placeholder="Nome"
              value={newUser.nome}
            />
            <input
              className="h-10 w-full rounded-xl border border-border bg-surface-low px-3 text-sm outline-none"
              onChange={(event) => setNewUser((draft) => ({ ...draft, cognome: event.target.value }))}
              placeholder="Cognome"
              value={newUser.cognome}
            />
            <input
              className="h-10 w-full rounded-xl border border-border bg-surface-low px-3 text-sm outline-none"
              onChange={(event) => setNewUser((draft) => ({ ...draft, email: event.target.value }))}
              placeholder="Email"
              type="email"
              value={newUser.email}
            />
            <select
              className="h-10 w-full rounded-xl border border-border bg-surface-low px-3 text-sm outline-none"
              onChange={(event) => setNewUser((draft) => ({ ...draft, role: event.target.value as UserRoleLabel }))}
              value={newUser.role}
            >
              {roleOptions.map((role) => (
                <option key={role}>{role}</option>
              ))}
            </select>
            <div className="rounded-xl border border-border bg-surface-low p-3">
              <p className="mb-3 text-sm font-semibold text-muted">Colore avatar</p>
              <div className="flex flex-wrap items-center gap-2">
                {avatarColors.map((color) => (
                  <button
                    aria-label={`Colore avatar ${color}`}
                    className="h-8 w-8 rounded-full border-2 transition-transform hover:scale-105"
                    key={color}
                    onClick={() => setNewUser((draft) => ({ ...draft, avatarColor: color }))}
                    style={{
                      backgroundColor: color,
                      borderColor: newUser.avatarColor === color ? "var(--electric)" : "transparent",
                    }}
                    type="button"
                  />
                ))}
                <input
                  aria-label="Colore avatar personalizzato"
                  className="h-9 w-12 rounded-lg border border-border bg-surface-container p-1"
                  onChange={(event) => setNewUser((draft) => ({ ...draft, avatarColor: event.target.value }))}
                  type="color"
                  value={newUser.avatarColor}
                />
              </div>
            </div>
            <Button
              className="w-full"
              disabled={creatingUser || !newUser.nome.trim() || !newUser.cognome.trim() || !newUser.email.trim()}
              onClick={submitNewUser}
              type="button"
            >
              <Plus className="h-4 w-4" />
              {creatingUser ? "Creazione..." : "Salva utente"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet onOpenChange={(open) => !open && setDeleteTarget(null)} open={Boolean(deleteTarget)}>
        <SheetContent className="max-w-md">
          <SheetHeader>
            <SheetTitle>Eliminare utente?</SheetTitle>
            <SheetDescription>
              {deleteTarget
                ? `Confermi l'eliminazione di ${deleteTarget.nome} ${deleteTarget.cognome}? Se l'utente ha assegnazioni aperte il sistema blocchera l'operazione.`
                : "Confermi l'eliminazione dell'utente selezionato?"}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-3">
            {deleteError ? (
              <p className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">
                {deleteError}
              </p>
            ) : null}
            <Button
              className="w-full border border-danger/40 bg-danger/10 text-danger hover:bg-danger/15"
              disabled={deletingUser}
              onClick={confirmDeleteUser}
              type="button"
              variant="outline"
            >
              <Trash2 className="h-4 w-4" />
              {deletingUser ? "Eliminazione..." : "Conferma eliminazione"}
            </Button>
            <Button className="w-full" onClick={() => setDeleteTarget(null)} type="button" variant="ghost">
              Annulla
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </EWorkShell>
  );
}
