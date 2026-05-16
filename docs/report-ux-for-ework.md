# Report UX/UI E.Practice — soluzioni per E.Work design system

**Destinatario**: Claude (istanza che sta valutando una pagina di istruzioni UX/UI trasversali ai moduli E.Work)
**Mittente**: Claude (istanza che ha lavorato su E.Practice V0)
**Data**: 2026-05-16
**Scopo**: descrivere le soluzioni di design e implementazione adottate su E.Practice in modo che possano essere valutate, riprese o scartate. Non sono prescrizioni.

## 1. Contesto

E.Practice V0 è il mockup demo di gestione pratiche per studi commercialisti / consulenti, consegna Studio Leali (Vestone BS) maggio 2026. Stack:
- Frontend Next.js 14 + Tailwind 3 + React Query + Radix UI primitives (`@radix-ui/react-dialog` per Sheet, `react-tabs`, `react-select`)
- Backend FastAPI in-memory (V0), single tenant `demo`
- Tema dark "excellia" + tema light + tema dark generico, switch via `data-theme` attribute sul `<html>`

Audience originaria: titolare studio, senior, junior, esterno (4 ruoli demo). Density informativa medio-alta (tabelle pratiche, albero fasi, timeline cronologica). Si lavora prevalentemente da desktop e tablet; mobile è uso secondario.

## 2. Design tokens & temi

`frontend/styles/globals.css` definisce 3 set di CSS custom properties (uno per ogni tema). `tailwind.config.ts` mappa classi utility ai token (`bg-surface` → `var(--surface)` ecc.). Architettura ispirata a Material Design 3.

### Scala superfici (dark/excellia)
| Token | Valore | Uso |
|---|---|---|
| `--surface` | #0f131c | Sfondo base pagina |
| `--surface-container-lowest` | #0a0d14 | Header sticky, navbar |
| `--surface-container-low` | #181c24 | Card primarie, sidebar |
| `--surface-container` | #1c2028 | Inset, box dentro card |
| `--surface-container-high` | #262a33 | Hover/elevated |
| `--surface-container-highest` | #2f3540 | Tooltip, popover |

### Scala testo (gerarchia di contrasto)
| Token | Valore | Contrasto | Uso |
|---|---|---|---|
| `--on-surface` | #dae2fd | 14:1 | Titoli, body principale |
| `--on-surface-variant` | #a8b2cc | 7.5:1 | Sotto-titoli, descrizioni |
| `--on-surface-muted` | #6e7a96 | ~4:1 | Metadata, timestamps (ATTENZIONE: marginale per WCAG AA su testo small) |

### Brand
| Token | Valore | Uso |
|---|---|---|
| `--primary` / `--electric` | #92d9ff | Accenti, focus, link |
| `--primary-container` | #00c2ff | Gradient, badge "primary" |
| `--gradient-brand` | linear(#92d9ff → #00c2ff) | Bottoni primari, logo mark |

### Semantici
| Token | Valore | Uso |
|---|---|---|
| `--success` | #6dd3a8 | Stati done, conferme |
| `--warning` | #ffcf7a | Call/telefonate, warning |
| `--danger` | #ff9a94 | Errori, eliminazioni |
| `--info` | #92d9ff | Info, badge default |

### Tipografia
- `--font-display`: Space Grotesk (titoli H1-H3, label uppercase tracking)
- `--font-body`: Manrope (paragrafi, descrizioni)
- `--font-label`: Inter (form, tabelle, dati operativi)

Disciplina: i 3 font hanno usi specifici, ma nel codice ci sono casi dove vengono mischiati (es. badge in font-display dentro a card in font-body). Non rigorosa.

### Regola che abbiamo difeso (con falle)
> Mai colori hex hardcoded nel codice. Sempre token Tailwind.

Falle trovate e corrette in corsa: bottone secondario "Allega a pratica esistente" aveva `from-[#3a5f8f] to-[#5078b8]` hardcoded (poi sostituito con `variant="outline"`). Le icone palette (avatar utente) usano hex inline `bg-[#14532d]` ecc. — sono valori semantici stabili per identificazione utenti demo, ma andrebbero spostati a token `--user-color-1`, `--user-color-2`, …

## 3. Layout & ampiezza schermo

### Decisione iniziale (scartata)
Pattern "dashboard contained" con `max-w-7xl mx-auto` (Tailwind/Bootstrap convention, 1280px). Era stato applicato in modo uniforme su tutte le 8 pagine principali.

### Decisione finale
Full-bleed su dashboard/liste/tabelle. Su monitor 24"+ il pattern contained sprecava 250-300px per lato — controproducente per tabelle dense (10 colonne).

**Eccezioni mantenute**:
- `/pratiche/importa`: `max-w-7xl` (form a 2 colonne, 1280px è sufficiente, full-bleed disperde l'attenzione)
- `/tipologie/[id]`: `max-w-5xl` (editor template, form a singola colonna lunga)
- Landing page `/`: `max-w-4xl` (card di presentazione, riga di lettura prosa)

**Padding orizzontale standard**: `px-6 md:px-10` (24px mobile, 40px desktop).

### Riflessione
La convention "max-width per dashboard" è una scelta di default Tailwind/Bootstrap che non ha base in usability ricercata. Per app dense (Linear, Vercel, Stripe, Notion) il full-bleed è lo standard. Per form/prosa il contained ha senso. La distinzione che applicherei in E.Work: **dashboard = full-bleed, editor/form = contained**.

## 4. Sidebar SX (navigazione modulo)

### Pattern adottato
**Notion-style hamburger drawer**, presente a tutte le risoluzioni.

| Stato | Desktop (≥1024px) | Mobile/tablet (<1024px) |
|---|---|---|
| Default | Aperta (push reflow) | Chiusa |
| Hamburger button | Visibile solo quando chiusa | Sempre visibile quando chiusa |
| Apertura | Click hamburger | Click hamburger |
| Chiusura | Click X nel drawer | Click X, backdrop, ESC, navigate |
| Layout | Push: contenuto si sposta di 240px (`lg:pl-60`) | Overlay con backdrop scuro semi-trasparente |
| Persistenza | localStorage `eworkshell.sidebar` | Reset alla navigazione |

### Sintesi tecnica
- `<aside>` con `transform translate-x-0/-translate-x-full` + `transition-transform`
- Stato `sidebarOpen` in `EWorkShell` (locale, non in store globale)
- 3 `useEffect`: mount sync con localStorage + viewport, persistenza onChange, close on ESC
- Backdrop solo `lg:hidden`

### Valutazione
Pattern molto pulito e familiare per utenti business (Notion, Linear, Vercel lo usano). Il vantaggio rispetto al "sidebar fissa": l'utente può ampliare l'area di lavoro su demand. Anche su desktop, perché su 24" la sidebar a 240px è inutile se uno sta consultando una tabella larga.

**Da rivedere**: la sidebar in E.Practice contiene anche un "card stato demo" + bottone "Esci". In E.Work multi-modulo serve un secondo livello (selezione modulo). Pattern Notion: sidebar primaria stretta con icone + sidebar secondaria con sezioni. Da valutare.

## 5. Sidebar DX (edit drawer)

### Pattern adottato
**Sheet slide-from-right** per edit contestuale di un'entità (fase, evento, nota dell'albero; selezione pratica nel modal "Allega a pratica esistente").

Componente: `<Sheet>` basato su `@radix-ui/react-dialog` con animazione slide.

### Casi d'uso
1. Click su fase nell'albero → drawer di edit fase (stato, assegnatario, data, annotazioni)
2. Click su evento (call/mail) nell'albero → drawer di edit evento (titolo, descrizione, data)
3. Click su evento gruppo (più eventi stessa data) → drawer di selezione singolo evento
4. Drawer "Aggiungi evento" composer dall'albero
5. Drawer "Allega a una pratica esistente" da `/pratiche/importa` (dropdown cliente + pratica)

### Valutazione
Pattern molto efficace per **edit contestuale senza perdere il contesto**: l'utente vede la pratica/albero sullo sfondo mentre modifica il dettaglio. Alternativa scartata: modal centrato. Il modal interrompe il workflow, il drawer no.

**Larghezza standard**: `max-w-md` (~448px). Adeguata per form a 4-6 campi. Per form più complessi (es. wizard nuova pratica) si è scelta una pagina dedicata `/pratiche/nuova` invece del drawer.

## 6. Tabelle dense

### Pattern adottato
- Wrapper `div` con `overflow-x-auto` + `rounded-2xl border bg-surface-low`
- Tabella con `min-w-[NNNpx]` esplicito (1080 per pratiche, 920 per clienti, 760 per utenti)
- Niente alternate row striping (le righe sono separate da `border-b border-border`)
- Header `font-display text-[11px] uppercase tracking-[0.14em] text-muted`
- Body cells `text-foreground-variant` con celle "titolo" in `text-foreground`

### Comportamento responsive
Su `<md` (768px) la tabella scorre orizzontalmente dentro al wrapper. Su `md+` la tabella prende tutta la larghezza. Test sul tablet 768×1024: usabile, lo scroll orizzontale è scoperto in 1-2 secondi.

### Valutazione
Onesta: la scelta `overflow-x-auto` su mobile è la più semplice ma non la migliore. Pattern alternativi che varrebbe la pena valutare per E.Work:
- **Collassamento responsive** (card stacked su mobile, tabella su desktop): più lavoro, più curato
- **Colonne nascoste con priorità** (mostra le 3 colonne principali su mobile, swipe per le altre)
- **Frozen first column** (utile per tabelle larghe): mai implementato in E.Practice

Per V0 demo è sufficiente, per V1 ci si dovrebbe pensare.

## 7. Anchored Chronological Scroll

### Pattern adottato (nome dato)
**Anchored chronological scroll**: lista in ordine cronologico ASC, con auto-scroll iniziale che porta in cima al viewport l'**ancora** (entry più recente fino a oggi compreso). Ispirato a Slack/WhatsApp.

Applicato a:
- Tab Timeline (fasi + eventi + note tutti mischiati)
- Tab Note (note libere della pratica)
- Tab Allegati (file collegati alla pratica)

### Comportamento
| Scroll | Cosa si vede |
|---|---|
| ↑ (su) | Storico passato, dal più recente al più vecchio |
| Posizione iniziale | Ancora in cima viewport |
| ↓ (giù) | Futuro (se presente, solo Timeline lo ha) |

### Implementazione
- Container `<section flex flex-col lg:h-[calc(100dvh-280px)]>`
- Header (titolo + filtri) `shrink-0`
- Lista `lg:flex-1 lg:overflow-y-auto`
- Su `<lg`: nessun lock di altezza, scroll naturale di pagina (responsive friendly)
- `useEffect` con `ref` su anchor element → `scrollTop = anchor.offsetTop - container.offsetTop`

### Bonus su Note
Click su una nota dall'albero → callback `onRequestNoteFocus(noteId)` → state `focusNoteId` nel parent → `TabNotes` riceve la prop → `useEffect` scrolla alla nota e attiva editing inline. Pattern equivalent a "click un commento Slack → ti porta lì con compose aperto".

### Valutazione
Pattern molto solido e scalabile. L'utente l'ha definito come una delle cose più "giuste" del modulo. Da estrarre come **componente primitive** del design system E.Work: `<ChronoFeed>` o `<AnchoredList>` con prop `items`, `anchorDate`, `renderItem`. Attualmente la logica è duplicata in 3 file con piccole varianti — opportunity di refactor.

## 8. Vista albero (SVG custom)

### Decisione architetturale
SVG puro, no `react-flow` o librerie graph. Width fissa 3200px (più di 1 anno di pratica typical), scroll orizzontale dentro un container `overflow-x-auto`. Height 470px.

### Rendering
| Elemento | Posizione | Aspetto |
|---|---|---|
| Tronco (timeline) | y=250 (centro) | Linea orizzontale con gradient `--success → --electric → --muted` |
| Fasi | sulla timeline | Cerchi grandi con numero, color = stato fase |
| Eventi (call/mail) | y=132 sopra timeline | Cerchio piccolo sulla timeline + BezierEdge + cerchio outer con icona + label box |
| Note libere | y=360 sotto timeline | Stessa struttura degli eventi ma electric tone |
| Annotazioni (note con phase_id) | non sull'albero | Visibili solo nel drawer della fase |
| Marker "OGGI" | linea verticale dotted | Badge "OGGI" in cima |
| Marker mese | linea verticale dotted | Label mese in cima (y=56) |

### Anti-overlap (2 lane)
Per evitare sovrapposizione di label box quando eventi/note sono vicini orizzontalmente (entro 110px), si scaglionano su 2 lane:
- Eventi: y=132 (lane 0), y=180 (lane 1)
- Note: y=360 (lane 0), y=312 (lane 1)

Implementato con un loop che traccia `lastX` e ribalta `lane` se la distanza è inferiore alla soglia.

### Mobile portrait
Su `<md` portrait l'albero è sostituito da un overlay "Ruota il telefono" con icona Smartphone ruotata. Quando l'utente ruota il telefono in landscape la viewport supera 768px e l'albero compare automaticamente.

### Valutazione
La vista albero è il **differenziatore visivo** del modulo E.Practice. SVG puro è stato la scelta giusta per V0: zero dipendenze, controllo pixel-perfect, performance ok per ~50 nodi. Pro: niente librerie pesanti. Contro: ogni interazione (hover, click, zoom) andava implementata a mano.

Per V1 (pratiche con 200+ fasi/eventi) probabilmente serve react-flow o d3-zoom + virtualizzazione. Per il modulo "albero" di E.Work in generale, dipende dal dominio (org chart, workflow, ecc.).

**Cosa funziona bene**: la separazione concettuale **eventi sopra / note sotto / fasi sulla linea**. Pulita, leggibile, scalabile.

**Cosa rivedrei**: il composer "Aggiungi evento" è dentro PracticeTree (toolbar in cima all'SVG) ma usa state separato da NodeDrawer. Sarebbe da unificare in un Form context o estrarre in un componente `<TreeComposer>` riutilizzabile.

## 9. Bottoni — varianti del design system

`components/ui/button.tsx` definisce 4 varianti:

| Variant | Aspetto | Uso |
|---|---|---|
| `default` | bg gradient brand, text on-primary, shadow electric-sm | CTA primario |
| `outline` | border, bg surface-low, text foreground-variant | CTA secondario |
| `ghost` | transparent, hover bg surface-high | Toolbar, icon buttons |
| `warning` | border warning, bg warning/10, text warning | Azioni a rischio |

Manca: `destructive` (delete). Attualmente le delete usano `ghost` con `hover:bg-danger/10 hover:text-danger`. Da consolidare.

Sizes: `default` (h-10), `sm` (h-8), `icon` (h-9 w-9 quadrato).

### Valutazione
Le 4 varianti coprono ~95% dei casi. La distinzione default/outline è semanticamente chiara: primary vs secondary. Aggiungerei `destructive` come variant esplicito per le delete.

Pattern usato: `<Button variant="..." size="..." asChild>` con `Slot` di Radix per polymorphism (es. `<Button asChild><Link href=...>label</Link></Button>`). Funziona bene.

## 10. Form patterns

### Input testuali
`<input className="h-10 w-full rounded-xl border border-border bg-surface-low px-3 text-sm text-foreground outline-none focus:border-electric">`

Pattern uniforme in tutto il modulo. Manca un componente `<Input>` riusabile — gli input sono inline.

### Select
Stesso pattern con `<select>` HTML nativo (Tailwind appearance-none non applicato). Su browser desktop usa il picker nativo, esteticamente non perfetto ma funzionale.

Esempio: dropdown Cliente / Pratica nel modal "Allega a pratica esistente".

### Date picker
`<input type="date">` nativo. Su tema dark applichiamo un filter CSS per invertire i colori del picker (vedi `:root[data-theme="dark"] input[type="date"]::-webkit-calendar-picker-indicator`). Workaround necessario.

### Textarea
Auto-resize via `min-h-N` + `resize-none`.

### Validation
Inline banner rosso `border-danger/30 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger`. Niente toast popup, niente overlay Next.js error. L'utente non viene mai interrotto da un modal di errore — il banner appare nel context del form.

### Valutazione
**Funziona bene per V0**: form sono diretti, niente sorprese. **Per V1 servirà**:
- Componente `<Input>` riusabile con label, error, helper text integrati
- Componente `<Select>` custom (no nativo) per dataset grandi con search
- Validation framework (zod + react-hook-form già installati ma usati solo in 1 punto)

## 11. Feedback inline (no toast popup)

### Decisione
Niente toast popup (Sonner installato ma non usato). Tutti gli errori/conferme sono inline:
- Banner rosso per errori (`border-danger/30 bg-danger/10`)
- Mini-pulse "Salvato" inline accanto al bottone (es. NodeDrawer)
- Refresh ottimistico via React Query `invalidateQueries`

### Razionale
Per un modulo gestionale dove l'utente sta facendo azioni mirate, il toast popup è rumoroso e distrae. Il feedback inline:
- Resta nel context dell'azione
- Non scompare in 3 secondi (l'utente può rileggerlo)
- Non occupa schermo "stack"

### Quando il toast popup ha senso
Azioni globali fuori dal context attuale (es. "Documento allegato alla pratica X" se l'utente sta facendo altro). Da introdurre solo se serve.

## 12. Stati cliccabili e affordance

### Regola
Tutto ciò che è cliccabile deve avere:
- `cursor: pointer`
- Hover state visibile (`hover:bg-surface-high`, `hover:text-foreground`)
- Focus ring per accessibilità (`focus-visible:ring-2 focus-visible:ring-electric`)
- `role="button"` + `tabIndex={0}` se non è un `<button>` nativo

### Falle trovate
- Card della Timeline: hover stato visibile solo dopo aver chiarito che TUTTE erano cliccabili (prima solo le note avevano hover, ma il click non funzionava → bug di affordance non rispettata)
- Tab focus indicators inconsistenti su alcuni campi (segnalato dall'utente, ancora da auditare sistematicamente)

### Lesson learned (mia)
> Se un elemento ha hover-state ma il click non fa nulla, è peggio che se non avesse hover. **Affordance promessa = azione richiesta.**

## 13. Componente `<V1Hint>`

Wrapper riusabile per feature marcate "in sviluppo" che restano cliccabili ma aprono un modal "Disponibile in V1" con descrizione della feature.

### Valutazione
Pattern molto utile in fase demo. **Vale la pena estrarlo come standard E.Work**: ogni modulo ha placeholder per feature future, il pattern standardizza il modo di gestirle.

## 14. Componente `<HelpButton>`

Icona "?" cliccabile in ogni schermata principale, apre drawer destro con istruzioni contestuali in 2-3 sezioni (passi base, dettagli, shortcuts).

### Valutazione
Riduce il bisogno di tutorial onboarding. L'utente le scopre durante il primo uso e impara man mano. **Da standardizzare in E.Work**.

## 15. Cross-tab state composition

Pattern: state condiviso al genitore comune, callback per richiesta cross-tab.

Esempi in E.Practice:
- Click evento/fase in Timeline → state `pendingTreeSelection` in `PracticeTabs` → `TabAlbero/PracticeTree` riceve la prop → useEffect applica selezione + apre drawer
- Click nota nell'albero → state `focusNoteId` → `TabNotes` riceve la prop → scroll + edit inline

### Implementazione
- Niente Redux/Zustand per stati UI cross-tab (eccezione: Zustand `useDemoStore` per stato demo come `activeUser`, `notes`, `applyAction`)
- Lifted state al primo parent comune (`PracticeTabs`)
- Callback `onRequest...` flowing down via props

### Valutazione
Funziona ma è verboso. Per E.Work multi-modulo, considerare un router-based approach: URL hash come state condiviso (es. `/pratiche/{code}#note=abc` → tab Note + focus su `abc`). Più dichiarativo, deep-linkable, bookmark-friendly.

## 16. Mobile vs desktop priorities

E.Practice V0 è **desktop-first**. Tablet supportato decentemente, mobile cellulare gestito ma non testato sistematicamente.

### Cosa abbiamo curato per tablet (768-1024px)
- Hamburger menu sempre disponibile
- Tabelle con `overflow-x-auto`
- Layout grid `[1fr_1.1fr]` invece di 50/50
- Drop area "trascina file" non esagerata

### Cosa abbiamo lasciato per mobile (<768px)
- Vista albero: overlay "Ruota il telefono"
- Tabelle: scroll orizzontale ok
- Scroll interno: disabilitato su mobile, scroll naturale di pagina

### Riflessione per E.Work
Per un gestionale studio professionale il mobile è **strumento di consultazione veloce**, non di lavoro. Optare per "**adaptive**" (UI radicalmente diversa per mobile) o "**responsive ridotto**" (stesse pagine, layout collassato) è una decisione di prodotto. La mia scelta in E.Practice è "responsive ridotto + degrade controllato" (alcuni componenti spariscono o si semplificano). Adeguato per V0.

## 17. Conversazioni laterali con l'utente (decisioni di prodotto)

### Standard di riferimento citati
- [Refactoring UI](https://refactoringui.com) — Adam Wathan, libro pratico
- [Nielsen Norman Group](https://www.nngroup.com/articles/) — ricerche empiriche UX
- [Material Design 3](https://m3.material.io) — sistema completo Google
- [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/) — pattern iOS/macOS
- [shadcn/ui](https://ui.shadcn.com) — component library usata da Vercel/Linear

### Siti benchmark citati
- Linear (linear.app)
- Stripe Dashboard
- Notion
- Vercel
- GitHub Primer

### Test usability automatici
- axe-core / Lighthouse: copertura accessibility WCAG, contrasto, ARIA
- Microsoft Clarity: heatmap session replay (gratis, post-deploy)
- Maze: test unmoderati remoti
- Real testing umano: imprescindibile (sessione Pamela 15/05 ha generato più insights di qualsiasi tool)

## 18. Cosa è andato bene (autovalutazione)

1. **Token system M3-style con 3 temi**: ottima base di partenza, estendibile, semanticamente solido. Non l'ho creato io (era già pronto), ma l'ho usato bene.
2. **Anchored chronological scroll**: pattern scalabile applicato consistentemente a 3 tab diversi. L'utente l'ha approvato esplicitamente.
3. **Hamburger sidebar Notion-style**: pattern moderno, l'utente l'ha definito "bellissima". Comportamento desktop+mobile coerente.
4. **Drawer destro per edit contestuale**: rispetta il flow dell'utente, no interruzioni modali.
5. **Click cross-tab con selezione applicata**: navigare tra tab senza perdere contesto.
6. **V1Hint per feature future**: gestisce la roadmap senza rompere la demo.
7. **HelpButton contestuale**: riduce friction onboarding.
8. **No toast popup**: feedback inline pulito e meno rumoroso.
9. **Full-bleed con eccezioni motivate**: la decisione di rompere la convention Tailwind `max-w-7xl` è giustificata dal dominio (dashboard dense).
10. **Distinzione semantic Note libere vs Annotazioni**: pulisce concettualmente cosa appare sull'albero e cosa nel drawer fase.

## 19. Cosa è andato meno bene (autovalutazione critica)

1. **Mancanza di scala spacing rigorosa**: a volte uso `py-2` a volte `py-3` per casi simili. Da disciplinare con scala 4/8/12/16/24/32.
2. **Scala tipografica non rigorosamente applicata**: troppe combinazioni di `text-xs`, `text-sm`, `text-base` ad hoc. Definirei classi semantiche `caption`, `body-sm`, `body`, `label`, `headline`.
3. **Anchored chronological scroll duplicato in 3 file**: opportunity di astrazione mancata. Servirebbe `<ChronoFeed items={...} anchorDate={...} renderItem={...}>`.
4. **Form senza componenti riusabili**: input/select/date inline ovunque. Per V1 va estratto.
5. **Tab focus indicators incompleti**: l'utente ha segnalato che alcuni campi del wizard non mostrano focus visibile al Tab keyboard. Non auditato sistematicamente.
6. **Backend type system vs frontend semantic mismatch**: il backend `event_type` ha 12 valori, il frontend usa solo 3 (`call/mail/warning`). Tutto il resto cadeva in fallback `warning`. Ho risolto in corsa convertendo 5 eventi seedati in note, ma il problema architetturale resta — andrebbe pulito a livello di model.
7. **`isUuid` come switch tra demo locale e backend reale**: pattern fragile usato in NodeDrawer/TabNotes per decidere se sincronizzare col backend. Da rivedere in V1 (probabilmente: tutto passa dal backend, niente fallback locale).
8. **Commit batch a fine sessione invece di per cambio**: errore di processo (mio). I commit dovrebbero essere piccoli e frequenti per consentire revert mirati. Lesson learned, applicato sistematicamente da fine 16/05.
9. **Sidebar SX non gestisce multi-modulo**: in E.Work serve un livello superiore (selezione modulo). Da progettare.
10. **Nomenclatura italiano/inglese mista**: "Annotazioni" in italiano, ma badge `EVENTO - TELEFONATA` in maiuscolo dash-separated stile inglese. Da unificare.
11. **Avatar color users hardcoded**: `bg-[#14532d]`, `bg-[#0f766e]` ecc. inline in 4-5 file. Da estrarre come token `--user-color-N`.
12. **Composer "Aggiungi evento" non riusabile**: state dentro PracticeTree, accoppiamento forte con SVG tree. Da estrarre in `<EventComposer>`.

## 20. Suggerimenti per E.Work design system (non prescrittivi)

Cose che potrebbero valere la pena considerare nel pattern trasversale, basate sulla mia esperienza qui:

### Primitives da estrarre
- `<ChronoFeed>` — pattern anchored chronological scroll
- `<HelpButton>` — drawer contestuale di help
- `<V1Hint>` — wrapper per feature in roadmap
- `<Input>`, `<Select>`, `<Textarea>`, `<DateInput>` — form components riusabili
- `<EmptyState>` — banner "nessun dato" coerente
- `<ModuleShell>` — variante multi-modulo di EWorkShell (con sidebar primaria narrow + secondaria sezioni)

### Pattern da standardizzare
- Hamburger sidebar SX a tutte le risoluzioni con localStorage
- Drawer destro Sheet per edit contestuale di entità
- Affordance: hover state = azione obbligatoria
- Form errors inline, no toast popup
- Token-only per colori, mai hex inline
- Scala spacing 4/8/12/16/24/32
- Scala tipografica con classi semantiche (caption/body/label/headline/display)
- Vista albero/grafico: SVG puro per <100 nodi, libreria solo se serve zoom/pan/virtualizzazione

### Decisioni architetturali aperte
- Routing-based state cross-tab (URL hash) vs lifted state in parent
- Mobile-first vs desktop-first per moduli gestionali
- Tema custom per modulo (es. E.Practice "electric") vs tema unico E.Work

### Audit periodico
- Hex inline → token
- Tab keyboard navigation → focus ring visibile
- Contrast ratio WCAG AA su testo small
- Click target ≥ 44×44px (Apple HIG)

## 21. Repo path

- Modulo: [d:\Davide\Documents\ExcellIA\Progetti\E.Practice\E.Practice\](d:/Davide/Documents/ExcellIA/Progetti/E.Practice/E.Practice/)
- Token: [frontend/styles/globals.css](frontend/styles/globals.css), [frontend/tailwind.config.ts](frontend/tailwind.config.ts)
- Shell: [frontend/components/shell/EWorkShell.tsx](frontend/components/shell/EWorkShell.tsx)
- Tree: [frontend/components/tree/](frontend/components/tree/)
- Drawer pattern: [frontend/components/ui/sheet.tsx](frontend/components/ui/sheet.tsx)
- Help drawer: [frontend/components/ui/help-button.tsx](frontend/components/ui/help-button.tsx)
- V1Hint: [frontend/components/ui/v1-hint.tsx](frontend/components/ui/v1-hint.tsx)
- Chronological lists: [frontend/components/practice/TabTimeline.tsx](frontend/components/practice/TabTimeline.tsx), [TabNotes.tsx](frontend/components/practice/TabNotes.tsx), [TabAllegati.tsx](frontend/components/practice/TabAllegati.tsx)

Buon lavoro a chi raccoglie.
