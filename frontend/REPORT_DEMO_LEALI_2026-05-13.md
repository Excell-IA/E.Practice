# Report Demo Leali - E.Practice

Data: 2026-05-13, notte tra 12 e 13 maggio.
Branch di lavoro: `feature/epractice-v0-f7-dettaglio-pratica`.

## Stato attuale

La schermata principale demo e' il dettaglio pratica:

`http://127.0.0.1:3000/pratiche/PR-2026-042`

La vista non e' piu' solo mockup statico: ora ha uno stato demo locale centralizzato in `frontend/lib/demo-state.ts` tramite Zustand e `applyAction(...)`.

## Cosa e' stato costruito

- Shell demo E.Work allineata visivamente alla shell vera di `E.Work/work-core`.
- Header 60px, logo testuale `E.`, breadcrumb con slash, sidebar 240px, AWU pill.
- Dettaglio pratica con header, tab, albero, drawer e mock dati Studio Leali.
- Albero orizzontale scrollabile centrato su OGGI.
- Eventi come micro-nodi temporali sulla timeline, con freccia verso icona evento.
- Guide mensili leggere.
- Hover data su fasi/eventi.
- Drawer fase/evento chiuso di default e aperto su click nodo.

## Interazioni locali gia' funzionanti

Tutte passano da `applyAction(...)` in `frontend/lib/demo-state.ts`.

- Cambio utente demo nella shell.
- Permessi demo:
  - Mario Bonometti: admin.
  - Sara Salvi: editor.
  - Luca Ferrari: editor.
  - Paolo Verdi: viewer.
- Completa fase.
- Riapri fase.
- Salta fase.
- Cambia stato fase.
- Assegna fase solo admin.
- Aggiungi nota e salvala in locale.
- Crea telefonata.
- Crea mail.
- Crea warning/attesa cliente.
- Centra su oggi.
- Centra su fase corrente.
- Drawer da fase/evento.

## Cosa e' volutamente provvisorio

- `demo-state.ts` e' un ponte demo, non la persistenza finale.
- I dati iniziali sono ancora mock locali, anche se usano gli UUID seed indicati da Cody.
- Le azioni locali non persistono dopo refresh.
- La shell demo verra' buttata quando E.Practice migrera' nella shell vera E.Work.
- Zoom + / - e fit restano V1, volutamente disabilitati.

## Cosa non va buttato

- Semantica UX della timeline.
- Componenti visuali tree/drawer/header/tabs.
- Pattern `applyAction(...)` come punto unico azioni.
- Tipi UI in `frontend/lib/types.ts` finche' non c'e' mapper API stabile.
- Distinzione `types.ts` UI model vs `api-types.ts` generato da OpenAPI.

## Handoff da Cody ricevuto

Cody ha generato su base `origin/feature/epractice-v0-f2-backend-scaffold`:

- `frontend/lib/api-types.ts`
- generato da `frontend/openapi.json`
- commit `d3dd1dd`

Accordo:

- Non modificare `frontend/lib/types.ts` automaticamente.
- Usare `api-types.ts` come contratto backend.
- Scrivere poi mapper `api -> UI`.

## Aggiornamento Cody backend - commit `6ef98c0`

Cody ha pushato su `origin/feature/epractice-v0-f2-backend-scaffold` i fix da gap-analysis sui mockup.

Nuovi endpoint utili per F8/F9:

- `GET /api/templates/category/{id}/preview`
  - anteprima fasi;
  - `scadenza_calcolata`;
  - `total_duration_days`;
  - utile per modal Nuova Pratica step 2/3.
- `GET /api/clients/search?q=&limit=`
  - combobox cliente modal step 1;
  - include `practice_count`, `cliente_dal_anno`, `indirizzo`.
- Dashboard enriched:
  - `top_urgenti` con `client_ragione_sociale` e `responsible`;
  - `ultime_attivita` con `actor` e `entity_label` leggibile;
  - `carico_per_utente` con `role_label` e `load_pct`.
- `CreatePracticeRequest` arricchito:
  - `create_default_reminders`;
  - `label_ids[]`;
  - attach automatico via bridge.

Verifiche Cody:

- `backend/scripts/demo_smoke.py`: 21 endpoint OK via TestClient.
- `ruff`, `ruff format`, `mypy` verdi.
- 36 route esposte.

Asset dati per Codex:

- `mockups/dashboard-demo-data.json`
  - dump reale di `/api/dashboard`;
  - 10.7 KB;
  - da usare per dashboard mock F8/F9 senza inventare numeri.
- `frontend/openapi.json` rigenerato:
  - 26 paths;
  - 49 schemas.
- `frontend/lib/api-types.ts` rigenerato:
  - 2585 righe.

Dati dashboard reali dal seed:

- `totale_pratiche = 8`
- `in_ritardo = 1`
- `top_urgenti = 3`
- `ultime_attivita = 10`
- `carico_per_utente = 3 utenti con pratiche`

Nota operativa:

- Per dashboard F8/F9 usare `mockups/dashboard-demo-data.json` come mock locale.
- Per tipi usare `frontend/lib/api-types.ts`, in particolare `DashboardKPI`, `TemplatePreview`, `ClientSearchHit`.
- Per modal Nuova Pratica, quando integrato, usare `GET /api/templates/category/{id}/preview?apertura=...`.

## Prossima mattina: ordine consigliato

1. Chiedere a Cody conferma endpoint backend disponibili per:
   - detail pratica enriched;
   - completa/riapri/salta fase;
   - aggiungi nota;
   - crea evento;
   - assegna fase.
2. Aggiornare la branch F7/F8 incorporando `api-types.ts` dalla base.
3. Scrivere mapper `frontend/lib/mappers/practice.ts`.
4. Sostituire dati iniziali mock con read API, mantenendo fallback demo.
5. Migrare 2-3 azioni chiave a mutation reale, lasciando il resto locale:
   - completa fase;
   - aggiungi nota;
   - crea evento.
6. Se resta tempo, tradurre dashboard mock con shape `DashboardKPI`.

## Rischi

- Troppe azioni finte possono sembrare bottoni rotti se non hanno feedback.
- API integration senza micro-interazioni non produce effetto demo.
- Micro-interazioni senza API rischiano di sembrare ancora un mockup.

Serve quindi una via mista: read API + 2/3 mutation reali + resto demo locale.

## Target realistico

Demo mandabile entro domani sera:

- Dettaglio pratica dentro shell E.Work demo.
- Dati caricati dal backend o fallback demo.
- Albero vivo.
- Note/eventi/fase corrente almeno parzialmente persistenti o simulate con feedback chiaro.
- Dashboard mock opzionale se avanza tempo.
