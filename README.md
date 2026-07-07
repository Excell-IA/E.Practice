# E.Practice

Modulo di **case management** della suite [E.Work](https://www.notion.so/Excell-IA) di ExcellIA.
Prima incarnazione: gestione pratiche per studi professionali (commercialisti, consulenti, avvocati).
Riuso strategico futuro: ticketing e workflow per PMI manifatturiere.

> Stato: **V0 in costruzione** — mockup demo navigabile per Studio Leali, target consegna 13-14 maggio 2026.

---

## Cosa fa

Governa il lavoro attorno alle **pratiche** di uno studio professionale. Una pratica è un lavoro commissionato da un cliente (es. *"Apertura P.IVA Torchio Davide"*) e ha:

- Fasi ordinate da un **template** per tipologia
- Responsabile e collaboratori assegnati
- Scadenze, allegati, note
- Una **vista albero** con la storia di eventi accaduti durante l'esecuzione (il differenziatore)
- Un **registro attività immutabile** (chi ha fatto cosa, quando)

Non sostituisce il gestionale fiscale del cliente: importa l'anagrafica in sola lettura, vive parallelo.

## Stack (V0)

| Layer        | Tecnologia                                |
| ------------ | ----------------------------------------- |
| Backend      | Python 3.11 + FastAPI 0.115               |
| Data V0      | dict in memoria seedati da `data/seed.json` |
| Validation   | Pydantic 2.10                              |
| Frontend     | Next.js 14 (App Router) + TypeScript      |
| Styling      | Tailwind 3.x + design system 3 temi       |
| State        | TanStack Query 5 + Zustand                |
| UI primitives | shadcn/ui + lucide-react                  |
| Vista albero | SVG puro (react-flow in V1)               |
| Hosting      | Vercel (FE) + Render (BE)                 |

Dettagli completi: [Stack Tecnologico](https://www.notion.so/35a04286090381ecb618f497c6002628) su Notion.

## Struttura repo

```
e-practice/
├── backend/        FastAPI + repository pattern + seed in-memory
├── frontend/       Next.js 14 + Tailwind
├── shared/         Codice condiviso (V0: vuoto)
├── data/           Seed JSON (V0)
├── docs/           Documentazione operativa
└── .github/        CI workflows + CODEOWNERS
```

Workflow modulo in 3 fasi (Decisione Architettura Frontend [E.Work](https://www.notion.so/35a04286090381c783e4f6ad46467882)):
- **Fase 1 — Costruzione**: frontend e backend qui insieme
- **Fase 2 — Spostamento**: frontend migra a `E.Work/frontend/modules/practice/`
- **Fase 3 — Manutenzione**: workspace multi-root

## Quick start (sviluppo locale, V0)

> Comandi definitivi disponibili dopo lo scaffold (PR014 in poi).

```bash
# Backend
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows PowerShell
pip install -r requirements.txt
uvicorn app.main:app --reload   # http://localhost:8000

# Frontend
cd frontend
npm install
npm run dev                     # http://localhost:3000
```

Sviluppo integrato con E.Work:

```bash
# E.Work backend:  http://localhost:8000
# E.Contacts API:  http://localhost:8001
# E.Practice API:  http://localhost:8002
cd backend
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8002

cd frontend
$env:NEXT_PUBLIC_API_URL="http://localhost:8002"
npm run dev
```

Demo locale via Docker (vedi PR007):
```bash
docker compose up
```

## Convenzioni

- Branch principale: `main`
- Branch lavoro: `feature/epractice-v<versione>-f<fase>-<descrizione>`
- Commit format: `<Fase>: <verbo> <oggetto>` (es. `F2: scaffold FastAPI app`)
- Costante codice: `MODULE_NAME = "e-practice"` (kebab nel codice, anche se repo GitHub è `E.Practice` CamelCase)
- Naming Python: snake_case file, PascalCase classi
- Naming React: PascalCase componenti, camelCase utility
- Endpoint REST: kebab-case plurale (`/api/practices`, `/api/practice-events`)

## Fonte di verità

Tutto il dettaglio architetturale, di scope e di pianificazione vive su **Notion**:

- [E.Practice — pagina madre](https://www.notion.so/E-Practice-35a042860903809c9f6bf383a64b3e20)
- [Vision](https://www.notion.so/35d04286090380b1ae13fafe9020782a)
- [Architettura del Modulo](https://www.notion.so/35a042860903819d9ec2da1b3ebe1c0e)
- [Architettura Database](https://www.notion.so/35a0428609038102b7f6d99ed0103cd6)
- [Architettura Codice](https://www.notion.so/35a04286090381c783e4f6ad46467882)
- [Stack Tecnologico](https://www.notion.so/35a04286090381ecb618f497c6002628)
- [Timeline (265 task su 38 fasi)](https://www.notion.so/35d042860903814a87c3fbd0d6bfca47)

## License

[MIT](./LICENSE) — Copyright (c) 2026 Davide Torchio / ExcellIA.
