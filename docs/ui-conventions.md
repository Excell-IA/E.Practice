# Convenzioni UI E.Practice / E.Work

> Decisioni di design system consolidate sulla demo Studio Leali (V0).
> Da riutilizzare in tutti i moduli E.Work, salvo motivi forti per derogare.
> Ogni regola è accompagnata dal _perché_ deciso e da un esempio.

Riferimenti correlati:
- Memory: `frontend_kowy_daisy.md` (scaffold Next.js / temi).
- Memory: `commit_granularity.md` (granularità commit).
- File codice citati: i percorsi sono relativi a `E.Practice/frontend/`.

---

## 1. Header di pagina

**Regola.**
```
[HelpButton ?]  H1 (font-display, text-3xl, font-semibold)
```
- `?` sempre **a sinistra** del titolo, in tutte le pagine.
- **Niente "breadcrumb azzurrino"** sopra il titolo (es. `HOME`, `STUDIO`, `MODULO`): il breadcrumb in alto basta, doppiarlo sotto il titolo è ridondante.
- Il titolo va **statico**: non si trasforma mai in indicatore di stato o di selezione (es. il titolo colonna `CLIENTE` non diventa il nome del cliente filtrato).
- Sottotitolo opzionale subito sotto h1 (`text-sm text-muted`), solo se aggiunge contesto.

**Container del titolo.** Su layout con elementi grossi a destra (es. box Avanzamento) dare **più spazio alla colonna informativa** (`360px` invece di `260px`), così la riga del titolo respira.

**Esempio.** `components/practice/PracticeHeader.tsx`, `components/practice/ClientsListClient.tsx`.

---

## 2. HelpButton

**Regola.** Componente unico `components/ui/help-button.tsx`. Apre uno `Sheet` con il contenuto passato come `children`. Sezioni interne con `<section>` separate e mini-label `font-display text-[10px] uppercase tracking-[0.16em] text-electric` per i sotto-paragrafi (es. _Azioni rapide_, _Colonne_).

**Posizione.** Sempre a sinistra del titolo H1. Mai a destra o sopra.

**Perché.** L'occhio scorre da sinistra a destra: l'utente arriva al `?` prima del titolo se è in dubbio.

---

## 3. Tag / Badge

**Variant disponibili.** `info` (electric/azzurro), `success` (verde), `warning` (giallo/arancio), `danger` (rosso), `default` (grigio).

**Convenzione semantica.**
- **Stato pratica**:
  - Aperta → `info`
  - In corso → `info`
  - In attesa / Sospesa → `warning`
  - Chiusa → `success`
  - Bloccata (fase) → `danger`
- **Categoria pratica**: colore dalla `categoryColor` della categoria stessa (`info|success|warning|danger`), non un colore neutro.
- **Stato utente / file**: `success` attivo, `warning` sospeso/in attesa.

**Layout stacked.** Quando più badge stanno vicini (es. badge Status + badge Categoria nel `PracticeHeader`), impilarli verticalmente a destra del titolo:
```tsx
<div className="flex shrink-0 flex-col items-end gap-1">
  <StatusBadge />
  <CategoryBadge />
</div>
```
**Niente** "rigone" di tag sotto il titolo se i tag sono già rappresentati altrove.

---

## 4. Sidebar (EWorkShell)

**Convenzione.**
- Prima sezione **senza etichetta**: il modulo si autoesplicita dalle voci del menu. La label `MODULO` toglieva spazio senza dare info.
- Seconda sezione `CONFIGURAZIONI` (non `STUDIO`, che è ambiguo per moduli non-studio).
- Voce ingranaggio chiamata `Opzioni` (non `Configurazione`, che duplica il nome sezione).
- Badge numerico a destra della voce solo se rappresenta uno "stock attivo da gestire" (es. `Pratiche 8`, `Scadenze 7`). Mai uno status.
- Voce attiva: barra sottile electric a sinistra + `bg-surface-high`. Niente bordi spessi.

**Logo top-bar.** Altezza max coerente col container (`120px` su EWorkShell). Se l'immagine sborda, **aggiungere `py-6` al `<main>`** della pagina per evitare overlap col contenuto (vedi bug `/pratiche` di maggio).

---

## 5. Tabelle

**Header colonna.** Componente `ColumnHeader` con due responsabilità separate:
- **Click sul titolo** → sort della colonna (toggle asc/desc). Indicatore `ArrowUp` / `ArrowDown` accanto al testo.
- **Click sulla freccia/icona accanto** → apre dropdown filtri.

Il titolo **non cambia mai** in base al valore selezionato. L'indicatore del filtro attivo va su un'icona separata (`Filter` colorata electric + badge col count).

**Tipografia header.** `font-display text-[11px] uppercase tracking-[0.14em] text-muted`. Quando sortato attivo: passa a `text-foreground`.

**Riga cliccabile.** Tutta la riga apre il dettaglio (`<tr onClick={() => router.push(href)} role="button" tabIndex={0}>`), ma i singoli elementi cliccabili al suo interno (link al codice, bottoni azione) usano `event.stopPropagation()` per evitare doppia navigazione.

**Minimum width.** `min-w-[1080px]` sul `<table>` + `overflow-x-auto` sul wrapper, per evitare layout rotti su viewport stretti.

**Esempio.** `components/practice/PracticesListClient.tsx`.

---

## 6. Filtri colonna (dropdown multi-select)

**Regole.**
- Multi-selezione **sempre** (mai single-select su filtri di lista): l'utente può combinare più valori sulla stessa colonna.
- In cima al dropdown due bottoni sempre visibili:
  - `Seleziona tutto` (sinistra, `text-electric`)
  - `Pulisci` (destra, `text-muted`)
- Lista opzioni con **checkbox custom** (non `<input type=checkbox>` con `<label>` perché interferisce con outside-click): `<button onClick>` + `<span>` con icona check.
- **Le opzioni del dropdown sono sempre TUTTE** quelle disponibili nei dati grezzi. **Non filtrarle** in base alle altre selezioni: l'utente deve poter capire cosa è selezionabile.

**Posizionamento.** Renderizzare **in portal** (`createPortal(document.body)`) con `position: fixed` calcolato da `getBoundingClientRect()` del trigger. **Perché**: il `<th>` è dentro `overflow-x-auto`, e un dropdown `position: absolute` viene clippato dal wrapper della tabella (sintomo: "scrolla solo dentro un container piccolo").

**Outside click.** Verificare che il target del `mousedown` non sia né nel trigger né nel dropdown ref (entrambi tracciati con `useRef`).

**Esempio.** `ColumnHeader` in `components/practice/PracticesListClient.tsx`.

---

## 7. Card

**Regola.** `components/ui/card.tsx`. Bordo `border-border` (1px), sfondo `bg-surface-low`, radius `rounded-2xl`. `padding` interno via `CardContent` (`p-5` default).

**Stato hover** se cliccabile: `hover:border-electric/40 hover:bg-surface-high`. Cursor `cursor-pointer`.

**Stato "in arrivo V1"**: wrapper con `V1Hint` + `border-dashed`. Niente disabilita visivamente, mostra tooltip "Componente da sviluppare".

---

## 8. Sheet (drawer laterale)

**Componente.** `components/ui/sheet.tsx`. Apertura da destra, larghezza default `max-w-md` o `max-w-lg` quando il contenuto è form-heavy.

**Struttura interna.**
```tsx
<SheetHeader>
  <SheetTitle>{titolo}</SheetTitle>
  <SheetDescription>{contesto opzionale}</SheetDescription>
</SheetHeader>
<div className="space-y-4">{contenuto}</div>
<div className="mt-auto flex flex-col gap-2 pt-6">
  <Button primario />
  <Button ghost annulla />
</div>
```

**Bottoni in basso.** Azione primaria full-width sopra, "Annulla" `variant="ghost"` sotto. Mai mettere "Annulla" come bottone solido prominente.

---

## 9. Bottoni

**Gerarchia.**
- **Primario**: `<Button variant="default">` → `bg-brand` (gradient azzurro pieno). Usato per l'azione principale della pagina.
- **Secondario stessa famiglia**: per azioni alternative ma non distruttive nella stessa schermata (es. "Crea pratica" vs "Allega a pratica esistente"), usare bg `electric/15` + `border-electric/40` + `text-electric` (non grigio, non beige — _stessa famiglia di colore del primario, intensità minore_):
  ```tsx
  className="w-full !bg-electric/15 !text-electric !shadow-none border border-electric/40 hover:!bg-electric/25"
  ```
- **Ghost**: `variant="ghost"` per Annulla / azioni passive.
- **Outline**: `variant="outline"` per azioni neutre (filtri, navigazione).
- **Distruttivo**: bg `!bg-danger !text-white hover:!bg-danger/80` solo dentro Sheet di conferma elimina.

**Perché.** Lo stesso bottone "secondario" deve restare nella **stessa famiglia visiva** del primario, altrimenti l'utente non capisce il rapporto gerarchico.

---

## 10. Progress / counter

**Formato standard.** `X/Y · Z%` (es. `3/6 · 50%`).
- `X` = fasi completed + skipped.
- `Y` = totale fasi.
- `Z` = round(100 * X / Y).
- Formula **unica** lato backend (`PracticeService.progress_stats`) e lato frontend (`withProgress` in `lib/demo-state.ts`).

**Layout cella tabella.**
```tsx
<div className="flex items-center gap-2">
  <div className="h-2 w-24 overflow-hidden rounded-full bg-surface-high">
    <div className="h-full rounded-full bg-brand" style={{ width: `${progress}%` }} />
  </div>
  <span className="font-label whitespace-nowrap text-xs font-semibold text-muted">
    {phasesClosed}/{phasesTotal} · {progress}%
  </span>
</div>
```

**Mai mostrare solo `%`** senza il rapporto X/Y: l'utente non capisce su quante fasi è calcolata.

---

## 11. Modal di conferma

**Quando.**
- Azioni irreversibili o ad alto impatto: elimina cliente, elimina pratica, chiusura pratica automatica.
- Mai per azioni rapide reversibili (cambio stato fase intermedio, modifica nota).

**Implementazione semplice.** `window.confirm(...)` per V0 demo. Migrabile a Sheet di conferma in V1 senza cambio API.

**Testo conferma.** Frase completa, esplicita _cosa_ accade. Esempi:
- `"Eliminare la pratica PR-2026-005 (Bilancio)?\n\nL'azione è irreversibile e cancella anche fasi, eventi, note e allegati collegati."`
- `"Confermi che questa pratica e' stata chiusa? Lo stato pratica passera' automaticamente a Chiusa."`

---

## 12. Status pratica derivato

**Regola.** Lo status della pratica non è modificabile manualmente: viene **derivato** dallo stato delle fasi:
- Una fase `blocked` → `sospesa`.
- Tutte le fasi `completed` o `skipped` → `chiusa` (set `completed_at`).
- Almeno una `in_progress/completed/skipped` → `in_corso`.
- Tutte `pending` (o nessuna fase) → `aperta`.

Hook backend: `PracticeService.recompute_status` chiamato dopo `complete`, `skip`, `set_status` su fase. Frontend invalida `practice-detail` + `practices` dopo ogni transizione.

**Niente selettore stato** nell'header pratica. Solo badge informativo.

---

## 13. Form

**Etichette.** `font-label text-xs font-semibold uppercase tracking-wide text-muted` sopra l'input.

**Input.** `h-10 rounded-xl border-border bg-surface-low px-3 text-sm` con focus `focus:border-electric`.

**Date.** Sempre `<input type="date" lang="it-IT">` per evitare il formato US su browser embedded.

**Validazione errori.** Banner `border-danger/30 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger` sopra il bottone Salva.

---

## 14. Spaziatura e bordi

**Bordi.** **Pochi** (`border-border` 1px), mai doppi. Niente outer + inner border. Niente shadow forti: solo `shadow-electric` o `shadow-lg` per surfaces flottanti (Sheet, dropdown).

**Spacing.** Padding pagina: `px-6 md:px-10 py-6`. Card padding interno: `p-5`. Gap form: `space-y-4`. Gap inline: `gap-2`/`gap-3`.

**Radius.** Default `rounded-xl` per input/button, `rounded-2xl` per card/sheet, `rounded-full` per badge e avatar.

---

## 15. Colori semantici (Tailwind tokens custom)

| Token | Uso |
|---|---|
| `electric` | Accenti, link, focus, info |
| `brand` | Bottone primario (gradient) |
| `foreground` | Testo principale |
| `foreground-variant` | Testo secondario |
| `muted` | Testo accessorio, etichette |
| `surface` | Sfondo pagina |
| `surface-low` | Sfondo card |
| `surface-container` | Sfondo dropdown, input |
| `surface-high` | Sfondo hover, riga selezionata |
| `border` | Bordo standard |
| `success` / `warning` / `danger` | Stati semantici |

---

## 16. Tipografia

- `font-display` per titoli e label uppercase.
- `font-label` per testo dato (numeri, codici, badge).
- Body: sans-serif di default.

**Tracking** (letter-spacing): uppercase con `tracking-[0.14em]` (header tabella) o `tracking-[0.16em]` (mini-label sezioni). Tracking maggiore solo su uppercase corte.

---

## 17. i18n (V0)

Italiano di default. Niente library i18n in V0. Stringhe inline nei componenti. Convenzione: usare apostrofi `e'` invece di `è` per evitare problemi di encoding dove non garantito (es. window.confirm su VSCode preview).

---

## Cose da NON fare (lessons learned)

- **Mai** sostituire il titolo statico di una colonna col valore selezionato.
- **Mai** usare `single-select` su filtri di lista che hanno più valori naturali.
- **Mai** mockare progressi in fallback "variegati": calcolarli sempre dai dati reali (fasi).
- **Mai** rendere il dropdown filtro figlio diretto di un container con `overflow-hidden` o `overflow-x-auto` senza portal.
- **Mai** aggiungere paragrafi breadcrumb sopra l'H1 quando il breadcrumb in top bar c'è già.
- **Mai** rendere "Annulla" un bottone più prominente dell'azione primaria.
