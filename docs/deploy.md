# Deploy runbook V0 — Studio Leali

Demo target **13-14 maggio 2026**. Stack: backend FastAPI su **Render**, frontend Next.js su **Vercel**. Stato in memoria, niente DB.

## TL;DR

```
backend  →  https://e-practice-backend.onrender.com    (Render Web Service)
frontend →  https://e-practice.vercel.app              (Vercel)
```

CORS sul backend deve includere il dominio Vercel. Il frontend punta al backend via `NEXT_PUBLIC_API_URL`.

---

## 1. Backend → Render

### 1.1 Crea il Web Service

1. Dashboard Render → **New +** → **Web Service**
2. Connect repository GitHub `Excell-IA/E.Practice`
3. Branch: `main` (oppure `feature/epractice-v0-f2-backend-scaffold` finché non mergiamo)
4. **Root directory**: `backend`
5. **Runtime**: Python
6. **Build command**:
   ```
   pip install -r requirements.txt
   ```
7. **Start command**:
   ```
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
8. **Plan**: Free (per demo) o Starter (sempre attivo)
9. **Auto-deploy**: On

### 1.2 Environment Variables

| Variable | Valore demo |
| --- | --- |
| `MODULE_NAME` | `e-practice` |
| `TENANT_ID` | `demo` |
| `ENVIRONMENT` | `production` |
| `STORAGE_MODE` | `memory` |
| `SEED_PATH` | `../data/seed.json` |
| `CORS_ORIGINS` | `["https://e-practice.vercel.app"]` (JSON array stringa) |
| `LOG_LEVEL` | `INFO` |
| `LOG_FORMAT` | `json` |
| `TENANT_SALT` | (genera random a 32 char, es. `openssl rand -hex 16`) |
| `BASIC_AUTH_USER` | `leali` (opzionale, blocca accesso pubblico) |
| `BASIC_AUTH_PASS` | (password random, comunicala solo a Leali) |

### 1.3 Verifica deploy

```bash
curl -s https://e-practice-backend.onrender.com/healthz
# atteso: {"status":"ok"}

curl -s https://e-practice-backend.onrender.com/api/health
# atteso: {"status":"ok","module":"e-practice", "environment":"production", ...}

curl -s https://e-practice-backend.onrender.com/api/users
# atteso: array di 4 utenti seedati
```

Se `/api/users` ritorna `[]` o errore: il seed non si è caricato. Vedi i log Render → cerca `seed_loaded` o `seed_load_failed`.

### 1.4 Cold start (piano Free)

Free su Render spegne il service dopo 15 min di inattività. Prima dell'apertura del meeting demo: tieni una tab del browser aperta su `/healthz` con auto-refresh, oppure upgrada a Starter ($7/mese) per evitare il fastidio.

---

## 2. Frontend → Vercel

### 2.1 Importa il progetto

1. Dashboard Vercel → **Add New** → **Project**
2. Import `Excell-IA/E.Practice`
3. **Root Directory**: `frontend`
4. **Framework Preset**: Next.js (auto-detected)
5. **Build Command**: `npm run build` (default)
6. **Output Directory**: `.next` (default)
7. **Install Command**: `npm ci` (auto)

### 2.2 Environment Variables

| Variable | Valore |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://e-practice-backend.onrender.com` |

> NB: tutto ciò che comincia con `NEXT_PUBLIC_` è esposto al browser. Non mettere segreti qui.

### 2.3 Production domain

- Vercel assegna auto `e-practice.vercel.app`. Va benissimo per la demo.
- Se vuoi `e-practice.excellia.io` o simile: aggiungi dominio + DNS CNAME → `cname.vercel-dns.com`.

### 2.4 Verifica deploy

Apri `https://e-practice.vercel.app/` → deve aprirsi la landing (selettore utente).

Se la landing si apre ma le chiamate API falliscono con CORS: torna su Render, aggiungi il dominio Vercel a `CORS_ORIGINS`, redeploy.

---

## 3. Configurazione client (Studio Leali)

Prima della demo manda a Mario Bonometti (Studio Leali):

- URL: `https://e-practice.vercel.app`
- Credenziali Basic Auth (se attivate): `leali / <password>`
- Suggerimento utente con cui entrare: **Mario Bonometti — titolare** (ha visibilità totale)

---

## 4. Aggiornamenti post-demo

Per cambiare il seed:

1. Modifica `data/seed.json` localmente
2. Commit + push
3. Render auto-redeploy → al boot il `seed_loader` rilegge il file

Per cambiare codice backend:

1. Commit + push su `main`
2. Render auto-deploy (~2-3 minuti)

Per cambiare codice frontend:

1. Commit + push su `main`
2. Vercel auto-deploy (~1-2 minuti)

---

## 5. Rigenerare i tipi TypeScript per il frontend

Quando il backend cambia gli endpoint/schemi, rigenera i tipi per il frontend:

```bash
# 1. Dump dell'OpenAPI dal backend
cd backend
.venv/Scripts/python.exe scripts/dump_openapi.py ../frontend/openapi.json

# 2. Genera i tipi TypeScript con openapi-typescript (Node)
cd ../frontend
npx openapi-typescript openapi.json -o lib/api-types.ts
```

Da committare entrambi: `frontend/openapi.json` (sorgente verità) + `frontend/lib/api-types.ts` (consumato da TanStack Query).

---

## 6. Rollback rapido

- **Vercel**: dashboard → progetto → Deployments → click su deploy precedente → "Promote to production"
- **Render**: dashboard → service → Events → "Rollback to this deploy"

Entrambi richiedono ~30 secondi.

---

## 7. Troubleshooting

| Sintomo | Causa probabile | Fix |
| --- | --- | --- |
| `/api/users` ritorna `[]` | seed non caricato | Log Render: cerca `seed_loader_not_available` o `seed_load_failed`. Verifica `SEED_PATH=../data/seed.json` |
| CORS error nel browser console | dominio frontend non in CORS_ORIGINS | aggiungi su Render env, redeploy |
| 502 Bad Gateway su Render | Render sleeping (Free plan) | apri `/healthz` per svegliarlo, poi riprova |
| Frontend mostra dati vecchi | cache Vercel | hard refresh (Ctrl+Shift+R) o redeploy |
| Lifespan log dice `seed_loader_not_available` | `seed_loader.py` non nel repo (F4 non mergiata) | merge F4 prima di re-deployare |

---

## 8. Limiti V0 (da comunicare al cliente)

- **Stato in memoria**: restart del backend (deploy, cold start) ricarica il seed → tutte le modifiche di sessione si perdono. È **per design** in V0. Persistenza reale in V1 (PostgreSQL, agosto-settembre 2026).
- **Single tenant**: tutti gli utenti vedono gli stessi dati (`tenant_id=demo`). Multi-tenant attivo in V2.
- **Niente auth reale**: il dropdown utente in alto cambia identità senza password. Basic Auth a livello dominio è l'unica protezione in V0.
- **Allegati simulati**: il file uploader non scrive su storage persistente; mostra metadati ma il file non si scarica.
