"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { EWorkShell } from "@/components/shell/EWorkShell";
import { HelpButton } from "@/components/ui/help-button";
import { getUsers, type ApiUser } from "@/lib/api";
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

function initials(user: ApiUser) {
  return `${user.nome.slice(0, 1)}${user.cognome.slice(0, 1)}`.toUpperCase();
}

async function patchUser(userId: string, body: Partial<Pick<ApiUser, "role" | "status">>, activeUserId: string) {
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
  const usersQuery = useQuery({
    queryFn: () => getUsers(),
    queryKey: ["users"],
  });
  const users = usersQuery.data ?? [];

  async function updateUser(userId: string, body: Partial<Pick<ApiUser, "role" | "status">>) {
    await patchUser(userId, body, activeUser.id);
    await queryClient.invalidateQueries({ queryKey: ["users"] });
  }

  return (
    <EWorkShell code="Utenti">
      <main className="min-h-[calc(100vh-120px)] bg-surface px-6 py-6 md:px-10">
        <div>
          <div className="mb-5 flex items-start gap-3">
            <HelpButton title="Utenti" subtitle="Gestione dei collaboratori e dei ruoli">
              <section>
                <p>La pagina elenca gli utenti dello studio con avatar, email e ruolo. Solo gli utenti con ruolo <strong className="text-foreground">Admin</strong> possono modificare ruoli e stato degli altri.</p>
              </section>
              <section>
                <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">Ruoli disponibili</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li><strong className="text-foreground">Admin</strong>: visibilità totale, gestisce studio e utenti.</li>
                  <li><strong className="text-foreground">Operatore</strong>: lavora sulle pratiche, può creare/editare.</li>
                  <li><strong className="text-foreground">Centralino</strong>: gestisce note, telefonate e contatti senza editare le fasi.</li>
                  <li><strong className="text-foreground">Esterno</strong>: collaboratore in sola lettura.</li>
                </ul>
              </section>
              <section>
                <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">Azioni</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li><strong className="text-foreground">Cambia ruolo</strong>: dropdown nella colonna Ruolo.</li>
                  <li><strong className="text-foreground">Attiva/sospendi</strong>: click sul badge Stato.</li>
                </ul>
              </section>
            </HelpButton>
            <h1 className="font-display text-3xl font-semibold text-foreground">Utenti</h1>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-border bg-surface-low">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead className="bg-surface-container text-left font-display text-[11px] uppercase tracking-[0.14em] text-muted">
                <tr>
                  <th className="px-4 py-3">Avatar</th>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Ruolo</th>
                  <th className="px-4 py-3">Stato</th>
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
                        onChange={(event) => updateUser(user.id, { role: uiToApiRole[event.target.value as keyof typeof uiToApiRole] })}
                        title={canEdit ? "Modifica ruolo utente" : "Solo Admin puo modificare gli utenti"}
                        value={roleMap[user.role]}
                      >
                        <option>Admin</option>
                        <option>Operatore</option>
                        <option>Centralino</option>
                        <option>Esterno</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="rounded-full"
                        disabled={!canEdit}
                        onClick={() => updateUser(user.id, { status: user.status === "attivo" ? "sospeso" : "attivo" })}
                        title={canEdit ? "Attiva/sospendi utente" : "Solo Admin puo modificare gli utenti"}
                        type="button"
                      >
                        <Badge variant={user.status === "attivo" ? "success" : "warning"}>
                          {user.status === "attivo" ? "Attivo" : "Sospeso"}
                        </Badge>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </EWorkShell>
  );
}
