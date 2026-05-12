# backend/

App FastAPI di E.Practice.

V0: stato in memoria seedato da `../data/seed.json`. V1: PostgreSQL + SQLAlchemy async + Alembic.

Scaffold reale in **F2** (Backend scaffolding FastAPI — PR011 in poi).

## Struttura prevista (V0)

```
backend/
├── app/
│   ├── main.py           FastAPI app, CORS, lifecycle
│   ├── config.py         Settings via Pydantic
│   ├── constants.py      MODULE_NAME = "e-practice"
│   ├── deps.py           Dependencies (current_user, repos)
│   ├── routers/          Endpoint REST (clients, practices, phases, events, …)
│   ├── models/           Pydantic L1/L2/L3
│   ├── repositories/     base.py + memory.py (V0) + sql.py (V1)
│   ├── services/         Business logic
│   ├── provisioning.py   PracticeProvisioning.create_tables (scheletro V0)
│   └── logging_setup.py  structlog
├── tests/
├── requirements.txt
└── pyproject.toml
```

Dettaglio: [Architettura Codice](https://www.notion.so/35a04286090381c783e4f6ad46467882) su Notion.
