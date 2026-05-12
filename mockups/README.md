# mockups/

Mockup HTML autocontenuti (CSS + JS inline) consegnati da Daisy nei 3 temi
del design system E.Practice. Sono la **reference autoritativa** di layout +
colori + tipografia + componenti, da cui Kowy/Codex traducono in React
dentro `../frontend/`.

NON sono serviti in produzione. NON sono importati dal build Next.js.

## Convenzione naming

`<pagina>-<tema>.html` con `tema ∈ { excellia, light, dark }`.

Tutti e tre i temi sono **uguali per layout/struttura HTML** — cambia solo
il blocco `:root[data-theme=...]` con le CSS vars. Per tradurre in React
basta partire da uno qualunque (di solito `*-excellia.html`).

## Pagine consegnate

| File | Pagina target frontend | Stato |
| --- | --- | --- |
| `landing-{tema}.html` | `app/page.tsx` — selettore utente V0 | da tradurre |
| `pratica-{tema}.html` | `app/pratiche/[numero]/page.tsx` — Dettaglio + vista albero | ✅ tradotto in F7 (`feature/epractice-v0-f7-dettaglio-pratica`) |
| `dashboard-{tema}.html` | `app/dashboard/page.tsx` — Home con KPI | da tradurre |
| `modal-nuova-pratica-{tema}.html` | componente modale `components/modals/NuovaPratica.tsx` | da tradurre |

Altri mockup arrivano man mano (rubrica clienti, scheda cliente, agenda,
scadenziario, configurazione, anteprima utenti studio).

## Workflow

1. **Daisy** disegna un mockup in 3 temi, lo consegna come `*.html` qui dentro
2. Eventuale verifica visiva: aprire un `*.html` in browser
3. **Codex/Claude** crea task Notion `PRxxx` per la conversione React in `../frontend/`
4. Conversione: tradurre 1:1 il markup in componenti React typizzati;
   le CSS vars dei 3 temi vivono in `../frontend/styles/globals.css`
   (già sincronizzate da `pratica-excellia.html` — se Daisy cambia colori
   in un nuovo mockup, aggiornare anche `globals.css`)
5. Il `.html` resta qui come reference: se in futuro il design cambia,
   la fonte di verità è il mockup, non il React

## Per Codex

Quando devi convertire una nuova pagina:
- apri `mockups/<pagina>-excellia.html` per il markup di riferimento
- struttura componenti come da Architettura Codice (Notion)
- riusa shell + atomi già esistenti in `frontend/components/`
- NON copiare CSS vars dei temi dentro la pagina: vivono solo in `globals.css`
- segui [Architettura Codice](https://www.notion.so/35a04286090381c783e4f6ad46467882)
  e mantieni la stessa nomenclatura dei componenti
