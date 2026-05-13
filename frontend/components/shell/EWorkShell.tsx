"use client";

import {
  Bell,
  CalendarDays,
  Clock3,
  Gauge,
  LayoutDashboard,
  Moon,
  Search,
  Settings,
  Sun,
  UsersRound,
  UserSquare2,
} from "lucide-react";
import type { ReactNode } from "react";

import { useDemoStore } from "@/lib/demo-state";
import { cn } from "@/lib/utils";

type EWorkShellProps = {
  children: ReactNode;
  code: string;
};

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, section: "Modulo" },
  { label: "Rubrica clienti", icon: UsersRound, section: "Modulo" },
  { label: "Pratiche", icon: Gauge, section: "Modulo", active: true, badge: 24 },
  { label: "Agenda", icon: CalendarDays, section: "Modulo" },
  { label: "Scadenze", icon: Clock3, section: "Modulo", badge: 7 },
  { label: "Utenti studio", icon: UserSquare2, section: "Studio" },
  { label: "Configurazione", icon: Settings, section: "Studio" },
];

function LogoMark() {
  return (
    <div className="relative flex h-10 w-10 items-center justify-center">
      <span className="bg-gradient-to-br from-primary to-[#00C2FF] bg-clip-text font-display text-[22px] font-bold tracking-[-0.04em] text-transparent">
        E.
      </span>
      <span className="absolute bottom-1 h-0.5 w-3.5 rounded-full bg-gradient-to-r from-primary to-[#00C2FF]" />
    </div>
  );
}

function avatarClass(userId: string) {
  if (userId.endsWith("0001")) return "bg-[#14532d]";
  if (userId.endsWith("0002")) return "bg-[#0f766e]";
  if (userId.endsWith("0003")) return "bg-[#ea580c]";
  return "bg-[#6b7280]";
}

export function EWorkShell({ children, code }: EWorkShellProps) {
  const activeUser = useDemoStore((state) => state.activeUser);
  const users = useDemoStore((state) => state.users);
  const applyAction = useDemoStore((state) => state.applyAction);

  return (
    <div className="min-h-screen bg-surface text-foreground">
      <aside className="fixed inset-y-[60px] left-0 z-40 hidden w-60 flex-col overflow-y-auto bg-surface-low px-3 py-5 lg:flex">
        <div className="mb-5 flex items-center gap-3 px-3">
          <LogoMark />
          <div>
            <p className="font-display text-sm font-semibold text-foreground">ExcellIA Work</p>
            <p className="font-label text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Studio Leali</p>
          </div>
        </div>

        <nav className="flex-1 space-y-6">
          {["Modulo", "Studio"].map((section) => (
            <div className="space-y-1" key={section}>
              <p className="px-3 pb-1 font-display text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
                {section}
              </p>
              {navItems
                .filter((item) => item.section === section)
                .map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      className={cn(
                        "relative flex h-9 w-full items-center gap-3 rounded-lg px-3 text-left text-[13.5px] font-medium text-foreground-variant transition-colors",
                        item.active && "bg-surface-high text-foreground",
                        !item.active && "hover:bg-surface-container hover:text-foreground",
                      )}
                      key={item.label}
                      title="In sviluppo"
                      type="button"
                    >
                      {item.active ? (
                        <span className="absolute bottom-2 left-0 top-2 w-0.5 rounded-r bg-gradient-to-b from-primary to-[#00C2FF]" />
                      ) : null}
                      <Icon className={cn("h-4 w-4 text-muted", item.active && "text-primary")} />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.badge ? (
                        <span className="rounded-full bg-primary/15 px-1.5 py-0.5 font-display text-[10px] font-semibold text-primary">
                          {item.badge}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
            </div>
          ))}
        </nav>

        <div className="border-t border-border pt-4">
          <div className="rounded-xl bg-surface-container p-3">
            <p className="font-display text-xs font-semibold text-foreground">Demo Leali</p>
            <p className="mt-1 text-xs leading-5 text-muted">Ambiente statico V0, pronto per walkthrough prodotto.</p>
          </div>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-[60px] items-center justify-between bg-surface-lowest/75 px-4 backdrop-blur-xl md:px-5">
          <div className="flex min-w-0 items-center gap-4">
            <div className="lg:hidden">
              <LogoMark />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap text-sm">
                <span className="font-display text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
                  ExcellIA Work
                </span>
                <span className="text-muted/60">/</span>
                <span className="font-medium text-foreground-variant">E.Practice</span>
                <span className="text-muted/60">/</span>
                <span className="font-medium text-foreground-variant">Pratiche</span>
                <span className="text-muted/60">/</span>
                <span className="font-medium text-foreground">{code}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="hidden items-center gap-2 rounded-full bg-surface-container px-3 py-1.5 md:flex">
              <span className="font-display text-[10px] font-medium uppercase tracking-[0.14em] text-muted">AWU</span>
              <div className="h-1 w-[60px] overflow-hidden rounded-full bg-surface-highest">
                <div className="h-full w-[43%] rounded-full bg-gradient-to-r from-primary to-[#00C2FF] shadow-[0_0_8px_rgba(146,217,255,0.5)]" />
              </div>
              <span className="font-display text-[11px] font-semibold text-foreground">43%</span>
            </div>
            <button
              aria-label="Cerca"
              className="hidden h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-high hover:text-foreground md:inline-flex"
              title="In sviluppo"
              type="button"
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              aria-label="Notifiche"
              className="relative hidden h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-high hover:text-foreground md:inline-flex"
              title="In sviluppo"
              type="button"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[#00C2FF] px-1 font-display text-[10px] font-semibold text-[var(--on-primary)]">
                3
              </span>
            </button>
            <div className="hidden h-8 items-center gap-1 rounded-full bg-surface-container px-1 md:flex">
              <button className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-high text-primary" type="button">
                <Sun className="h-3.5 w-3.5" />
              </button>
              <button className="flex h-6 w-6 items-center justify-center rounded-full text-muted" type="button">
                <span className="font-label text-[11px] font-bold">E</span>
              </button>
              <button className="flex h-6 w-6 items-center justify-center rounded-full text-muted" type="button">
                <Moon className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="hidden h-8 items-center rounded-full bg-surface-container px-3 font-label text-xs font-semibold text-foreground md:flex">
              IT
            </div>
            <div className="flex items-center gap-3" title="Cambia utente demo">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full font-display text-xs font-semibold text-white ring-0 transition-shadow hover:ring-2 hover:ring-primary/40",
                  avatarClass(activeUser.id),
                )}
              >
                {activeUser.initials}
              </div>
              <div className="hidden leading-tight sm:block">
                <select
                  aria-label="Utente demo"
                  className="w-36 bg-transparent font-label text-xs font-semibold text-foreground outline-none"
                  onChange={(event) => applyAction({ type: "set_user", userId: event.target.value })}
                  value={activeUser.id}
                >
                  {users.map((user) => (
                    <option className="bg-surface text-foreground" key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted">{activeUser.role}</p>
              </div>
            </div>
          </div>
        </header>

        <div>{children}</div>
      </div>
    </div>
  );
}
