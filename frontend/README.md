# frontend/

App Next.js 14 (App Router) di E.Practice.

Tailwind 3 + design system [E.Work](https://www.notion.so/35a042860903813c85abd9821294845d) (3 temi: chiaro / scuro / excellia), shadcn/ui + lucide-react, TanStack Query 5 + Zustand, react-hook-form + Zod, next-intl (IT/EN header).

Scaffold reale in **F6** (Frontend scaffolding Next.js — PR084 in poi).

## Struttura prevista (V0)

```
frontend/
├── app/                 Next.js App Router
│   ├── layout.tsx       Header + Sidebar shell E.Work
│   ├── page.tsx         Selettore utente (landing)
│   ├── dashboard/
│   ├── clienti/         Rubrica + scheda cliente
│   ├── pratiche/        Lista + dettaglio (6 tab)
│   ├── agenda/
│   ├── scadenziario/
│   ├── utenti/
│   └── configurazione/  Categorie + template fasi + etichette
├── components/
│   ├── shell/           Header, Sidebar, Breadcrumb (replicano shell E.Work)
│   ├── ui/              shadcn/ui copiati
│   ├── tree/            PracticeTree, PhaseNode, EventNode, … (il differenziatore)
│   ├── practice/        Header, Tabs, TabTimeline, …
│   ├── client/
│   ├── modals/
│   ├── tables/
│   └── activity/        ActivityLogDrawer
├── lib/                 api.ts (TanStack Query), types, i18n, theme
├── styles/              globals.css (CSS vars 3 temi) + tokens.css
└── public/
```

## Workflow modulo (Decisione Architettura Frontend E.Work)

- **Fase 1 — Costruzione (oggi)**: la `frontend/` vive qui dentro al repo modulo.
- **Fase 2 — Spostamento**: a integrazione FE↔BE verde, sposta `frontend/` a `E.Work/frontend/modules/practice/`.
- **Fase 3 — Manutenzione**: workspace VS Code multi-root.

Dettaglio: [Architettura Codice](https://www.notion.so/35a04286090381c783e4f6ad46467882) su Notion.

## Come avviare in locale

```bash
npm install
npm run dev
```

Apri `http://localhost:3000/pratiche/PR-2026-042` per vedere il dettaglio pratica con vista albero.
