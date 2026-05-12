import {
  Bell,
  CalendarDays,
  ChevronRight,
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

import { cn } from "@/lib/utils";

type EWorkShellProps = {
  children: ReactNode;
  code: string;
};

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Rubrica", icon: UsersRound },
  { label: "Pratiche", icon: Gauge, active: true },
  { label: "Agenda", icon: CalendarDays },
  { label: "Scadenze", icon: Clock3 },
  { label: "Utenti", icon: UserSquare2 },
  { label: "Config", icon: Settings },
];

function LogoMark() {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand shadow-[var(--shadow-electric-sm)]">
      <span className="font-display text-sm font-bold text-[var(--on-primary)]">E</span>
    </div>
  );
}

export function EWorkShell({ children, code }: EWorkShellProps) {
  return (
    <div className="min-h-screen bg-surface text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-surface-low/80 backdrop-blur-xl lg:flex lg:flex-col">
        <div className="flex h-16 items-center gap-3 border-b border-border px-4">
          <LogoMark />
          <div>
            <p className="font-display text-sm font-semibold">ExcellIA Work</p>
            <p className="font-label text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Studio Leali</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={cn(
                  "flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left font-display text-sm font-medium text-muted transition-colors",
                  item.active && "bg-electric/12 text-electric",
                  !item.active && "hover:bg-surface-high hover:text-foreground",
                )}
                key={item.label}
                title="In sviluppo"
                type="button"
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-border p-4">
          <div className="rounded-2xl bg-surface-container p-3">
            <p className="font-display text-xs font-semibold text-foreground">Demo Leali</p>
            <p className="mt-1 text-xs leading-5 text-muted">Ambiente statico V0, pronto per walkthrough prodotto.</p>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-surface/70 px-4 backdrop-blur-xl md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="lg:hidden">
              <LogoMark />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 overflow-hidden whitespace-nowrap font-label text-xs font-semibold text-muted">
                <span>ExcellIA Work</span>
                <ChevronRight className="h-3 w-3 shrink-0" />
                <span>E.Practice</span>
                <ChevronRight className="h-3 w-3 shrink-0" />
                <span>Pratiche</span>
                <ChevronRight className="h-3 w-3 shrink-0" />
                <span className="text-electric">{code}</span>
              </div>
              <p className="mt-1 truncate font-display text-sm font-semibold text-foreground">Tenant Studio Leali</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              aria-label="Cerca"
              className="hidden h-9 w-9 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-high hover:text-foreground md:inline-flex"
              title="In sviluppo"
              type="button"
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              aria-label="Notifiche"
              className="relative hidden h-9 w-9 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-high hover:text-foreground md:inline-flex"
              title="In sviluppo"
              type="button"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-warning" />
            </button>
            <div className="hidden h-9 items-center gap-1 rounded-xl border border-border bg-surface-low px-1 md:flex">
              <button className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-high text-electric" type="button">
                <Sun className="h-3.5 w-3.5" />
              </button>
              <button className="flex h-7 w-7 items-center justify-center rounded-lg text-muted" type="button">
                <span className="font-label text-[11px] font-bold">E</span>
              </button>
              <button className="flex h-7 w-7 items-center justify-center rounded-lg text-muted" type="button">
                <Moon className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="hidden h-9 items-center rounded-xl border border-border bg-surface-low px-3 font-label text-xs font-semibold text-foreground md:flex">
              IT
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-low py-1 pl-2 pr-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand font-label text-xs font-bold text-[var(--on-primary)]">
                MB
              </div>
              <div className="hidden leading-tight sm:block">
                <p className="font-label text-xs font-semibold text-foreground">Mario Bonometti</p>
                <p className="text-[11px] text-muted">Titolare</p>
              </div>
            </div>
          </div>
        </header>

        <div>{children}</div>
      </div>
    </div>
  );
}
