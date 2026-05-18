"use client";

import { HelpCircle } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type HelpButtonProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  label?: string;
};

export function HelpButton({ children, label = "Guida", subtitle, title }: HelpButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        aria-label={`Apri guida: ${title}`}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-low text-muted transition-colors hover:border-electric/40 hover:bg-electric/10 hover:text-electric"
        onClick={() => setOpen(true)}
        title={label}
        type="button"
      >
        <HelpCircle className="h-5 w-5" />
      </button>

      <Sheet onOpenChange={setOpen} open={open}>
        <SheetContent>
          <SheetHeader>
            <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">{label}</p>
            <SheetTitle>{title}</SheetTitle>
            {subtitle ? <SheetDescription>{subtitle}</SheetDescription> : null}
          </SheetHeader>
          <div className="space-y-4 overflow-y-auto pr-2 text-sm leading-6 text-foreground-variant">
            {children}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
