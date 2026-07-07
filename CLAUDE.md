# CLAUDE.md — E.Practice

Onboarding per agenti che lavorano su questo repo (Claude Code, Codex, futuri).
Riferimenti completi su Notion (vedi sezione finale).

## Cos'è

Modulo di **case management** della suite [E.Work](https://www.notion.so/Excell-IA) di ExcellIA.
Prima incarnazione: gestione pratiche per studi commercialisti / consulenti / avvocati.
V0 = mockup demo navigabile per Studio Leali, target consegna 13-14 maggio 2026.

Differenziatore: **vista albero della pratica** con eventi ad-hoc agganciati alle fasi del template.

## Repo

GitHub: `Excell-IA/E.Practice` (CamelCase + punto, eccezione vs kebab-case standard E.Work).
Locale: [d:\Davide\Documents\ExcellIA\Progetti\E.Practice\E.Practice\](d:/Davide/Documents/ExcellIA/Progetti/E.Practice/E.Practice/).
Costante codice: `MODULE_NAME = "e-practice"` (kebab nel codice, sempre).

## Struttura

```
backend/                FastAPI + Pydantic v2 (V0 in-memory, V1 PostgreSQL)
├── app/
│   ├── main.py         App FastAPI + CORS + /api/health + /healthz
│   ├── config.py       Settings via pydantic-settings (.env)
│   ├── constants.py    MODULE_NAME, DEMO_TENANT_ID, API_PREFIX, USER_HEADER
│   ├── deps.py         get_current_user_id (header X-User-Id → 401)
│   ├── logging_setup.py structlog + contextvars (tenant_id/user_id/practice_id)
│   ├── provisioning.py PracticeProvisioning stub (Standard E.Work)
│   ├── models/         Pydantic L1/L2/L3 (12 entità + Request/Response)
│   ├── repositories/   base.py (Repository[T] ABC) + memory.py (V0 in-memory)
│   ├── routers/        HTTP routers (F5)
│   └── services/       Business logic (tokenize.py, ...)
├── pyproject.toml      Deps + ruff + mypy + pytest config
├── requirements.txt    Mirror runtime per fallback Render
└── Dockerfile          Python 3.11-slim runtime image

frontend/               Next.js 14 + Tailwind + design system 3 temi (F6)
shared/                 Codice cross-stack (V0 vuoto, V2 shared/ai/)
data/                   seed.json V0 (F4)
docs/                   Documentazione operativa (deploy, runbook)
.github/workflows/      backend.yml (ruff+mypy) + frontend.yml (eslint+tsc)
docker-compose.yml      Demo locale standalone (backend porta 8002)
```

## Comandi (Windows PowerShell o Git Bash)

```bash
# Setup backend dev
cd backend
python -m venv .venv
.venv/Scripts/python.exe -m pip install -e ".[dev]"

# Run dev
.venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8002
# → http://localhost:8002/docs

# Lint + type-check (stessi check della CI)
.venv/Scripts/python.exe -m ruff check .
.venv/Scripts/python.exe -m ruff format --check .
.venv/Scripts/python.exe -m mypy app

# Containerized
docker compose up --build      # da root repo
```

## Convenzioni

### Branch
- `main` — solo merge da feature branch verdi
- `feature/epractice-v<versione>-f<fase>-<slug>` — un branch per fase Notion
  (es. `feature/epractice-v0-f2-backend-scaffold`, `feature/epractice-v0-f3-models`)

### Commit
Format: `<Fase>: <verbo> <oggetto>` — es. `F3: add Pydantic model Client`.
Append `Co-Authored-By:` quando ha senso (collaborazione fra agenti).

### Notion task lock
- Database **Timeline E.Practice v2** (id `f3aba65f-9399-4a06-a893-cadf379f099b`) è la single source of truth.
- Convenzione: `Cod` formato `PRNNN`, `Priorità` step 5 (più basso = più urgente),
  una sola riga `In progress` per agente, marca `Status=In progress` PRIMA di iniziare e
  `Status=Done` + `Data done` + `T.effettivo` a fine.
- Lock multi-agente: aggiungi `[agent: claude]` o `[agent: codex]` all'inizio del campo `Note`.

### Codice Python
- Naming file: snake_case (`practice_phase.py`). Classi: PascalCase. Endpoint: kebab plurali (`/api/practice-events`).
- Pydantic v2: `BaseModel`, `Field`, `ConfigDict(populate_by_name=True, from_attributes=True)`.
- `Literal["a","b","c"]` per enum stringa (NO `class Enum`).
- `Optional[X]` proibito (ruff UP007): usa `X | None`.
- Import da `collections.abc` per `Iterable`, `AsyncIterator` ecc. (NO da `typing`, ruff UP035).
- `isinstance(x, set | list | tuple)` (NO tuple di tipi, ruff UP038).
- Per `structlog.get_logger()` usa `typing.cast(structlog.stdlib.BoundLogger, ...)` (mypy strict).

### Classificazione DB (Standard E.Work — Architettura DB AI-Safe)
- **L1 PROTETTO** (PII): `clients`, `users` — mai esposte all'AI. Annota classe con `# L1 PROTETTO`.
- **L2 OPERATIVO** (FK tokenizzate → AI ok via view L3): `practices`, `practice_phases`, `practice_events`, ecc.
- **L3 VIEW AI-READY** (sanitizzate, V1+): `v_ai_practices_summary`, `v_ai_workload`, ecc.
- Tokenizzazione: `client_token = sha256(client_id + TENANT_SALT)` via `app.services.tokenize`.

## Workflow modulo (Decisione Architettura Frontend E.Work)

- **Fase 1 (oggi)**: `frontend/` qui dentro al repo modulo, sviluppo accoppiato BE↔FE.
- **Fase 2**: a integrazione verde, sposta `frontend/` → `E.Work/frontend/modules/practice/`.
- **Fase 3**: workspace VS Code multi-root (modulo + cartella frontend nella shell).

4 discipline ferree (non negoziabili): cartelle moduli isolate (zero import cross-module),
design system condiviso, CODEOWNERS, branch persistenti per modulo.

## Cosa NON c'è in V0

Single-tenant hardcoded `demo`, no auth reale (dropdown utente fittizio via `X-User-Id` header),
no PostgreSQL, no AI, no integrazione email, no Stripe, no connettori gestionali, no react-flow
(vista albero SVG puro). Tutti questi arrivano a V1 (agosto-settembre 2026) / V2 (ottobre-novembre 2026).

## Multi-agente

Su questo repo lavorano in parallelo Claude Code (questa chat) e Codex (chat panel VS Code).
Regole di non-collisione in `memory/sync_protocol_claude_codex.md` (locale Claude profile):
1. Branch dedicato per agente
2. Cartelle disjoint (no overlap)
3. Notion lock con `[agent: …]`
4. Working tree condivisa → `git add <path-espliciti>`, mai `.` o `-A`
5. Checkpoint espliciti prima del passaggio di lavoro

## Fonte di verità (Notion)

- [E.Practice — pagina madre](https://www.notion.so/E-Practice-35a042860903809c9f6bf383a64b3e20)
- [Vision](https://www.notion.so/35d04286090380b1ae13fafe9020782a)
- [Architettura del Modulo](https://www.notion.so/35a042860903819d9ec2da1b3ebe1c0e)
- [Architettura Database](https://www.notion.so/35a0428609038102b7f6d99ed0103cd6)
- [Architettura Codice](https://www.notion.so/35a04286090381c783e4f6ad46467882)
- [Stack Tecnologico](https://www.notion.so/35a04286090381ecb618f497c6002628)
- [Timeline E.Practice v2 (265 task)](https://www.notion.so/35d042860903814a87c3fbd0d6bfca47)

## License

MIT — Copyright (c) 2026 Davide Torchio / ExcellIA. Vedi `LICENSE`.
