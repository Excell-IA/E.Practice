# Test usability E.Practice — script per Kowy

Demo navigabile di un modulo gestionale per studi commercialisti.
Obiettivo del test: capire se il prodotto è **comprensibile**, **usabile** e **completo** dal punto di vista di chi non ha mai visto l'app prima.

## Setup

- **URL**: http://localhost:3000 (o URL pubblico se in deploy)
- **Tempo stimato**: 15-20 minuti
- **Setting**: scrivi le tue impressioni libere durante il percorso, senza filtri. Anche le cose che ti sembrano stupide o scontate sono utili. **Più sei spietata, meglio è**.
- **Cosa NON aspettarti**: non è un prodotto finito, è una demo. Alcune feature sono volutamente disabilitate (badge "In sviluppo"), serve per mostrare la roadmap.

## Persona da simulare

Sei **Sara Salvi**, dottoressa commercialista senior in uno studio di Vestone (BS). 32 anni, lavora prevalentemente da PC desktop + tablet, gestisce 30-50 pratiche all'anno (bilanci, dichiarazioni, costituzioni società, consulenza bandi). Usa un gestionale legacy oggi, vuole capire se questo modulo le farebbe risparmiare tempo.

Dal dropdown utenti in alto a destra (in qualche punto dell'header), selezionala come utente attivo.

## Scenari di test (in ordine)

### Scenario 1 — Primo orientamento (~3 min)
Apri la home. Osserva:
- Quante voci ci sono nel menù di sinistra?
- Qual è la "prima cosa" che vorresti cliccare per orientarti? Fallo.
- Trovi il punto interrogativo `?` accanto al titolo della pagina? Cliccalo. Ti aiuta?
- Trovi un modo per **nascondere il menù** se vuoi più spazio sullo schermo? Provalo.

**Domande per te**:
- Le voci del menù si capiscono dal nome? Quali ti sono ambigue?
- C'è qualcosa che ti aspetti e non trovi?
- L'organizzazione "Modulo / Studio" ha senso per te?

### Scenario 2 — Capire una pratica esistente (~4 min)
Vai su **Pratiche** → clicca su **PR-2026-001 Bilancio 2025 Acciaierie Valgobbia**.

Esplora i 6 tab in alto:
- **Info**, **Albero attivo**, **Timeline**, **Allegati**, **Note**, **Anagrafica**

Per ognuno: in 10 secondi capiresti a cosa serve?

Sull'**Albero attivo** in particolare:
- Cosa rappresenta la linea orizzontale?
- I cerchi grandi numerati 1, 2, 3… che cosa sono?
- I cerchi piccoli sopra/sotto la linea che cosa sono?
- Clicca su una fase (cerchio grande). Cosa si apre? È quello che ti aspettavi?
- Clicca su un evento (cerchio piccolo con icona). Idem.
- Clicca su una nota (cerchio piccolo, in basso). Idem.

Sulla **Timeline**:
- Riesci a scorrere per vedere il passato? E il futuro?
- Distingui a colpo d'occhio cosa è fase, cosa è evento, cosa è nota?
- Clicca su una entry: dove ti porta? È coerente?

### Scenario 3 — Creare una nuova pratica (~4 min)
Click su **Nuova pratica** dal menù sinistro.

Compila i campi dello **Step 1** (Cliente e dati pratica):
- Cerca il cliente "Acciaierie Valgobbia" e selezionalo (oppure ne crei uno nuovo, a scelta)
- Tipologia pratica: "Bilancio"
- Responsabile: te stessa
- Titolo: "Test usability — bilancio 2025 bis"
- Date a piacere

Vai al **Step 2** (Fasi e allegati):
- Guarda le fasi proposte dal template (sulla destra)
- Modifica una fase (cambia nome, data o assegnatario)
- Trascina un file qualsiasi nell'area allegati (basta un PDF o un'immagine)
- Premi **Crea pratica**

**Domande**:
- La preview delle fasi a destra è utile o ridondante?
- I 2 step si distinguono chiaramente?
- Il bottone "Crea pratica" è dove te lo aspetti?
- Una volta creata, arrivi sull'albero della pratica nuova. Ci sono gli allegati che hai caricato?

### Scenario 4 — Aggiungere eventi e note (~3 min)
Sulla pratica nuova (o su una qualsiasi), nella vista **Albero attivo**:
- Nella toolbar in alto trovi **"Aggiungi evento"**: scegli **Telefonata**, scrivi titolo "Cliente ha chiesto info", data oggi, fase a piacere. Salva.
- Aggiungi una **Nota** (libera, senza fase): "Promemoria: controllare giroconti settimana prossima"
- Vai sul tab **Note**: trovi la nota che hai appena creato? È in cima o in fondo? Ti torna l'ordine?

### Scenario 5 — Importare un documento e allegarlo a pratica esistente (~3 min)
Dal menù sinistro click su **Nuovo documento**.

- Trascina un file nell'area di upload
- Quando appaiono i 2 bottoni sulla destra (Crea nuova pratica / Allega a pratica esistente), prova **Allega a una pratica esistente**
- Si apre un drawer da destra: seleziona Cliente "Acciaierie Valgobbia" → poi Pratica "PR-2026-001" → premi Allega
- Vieni rediretto alla pratica → vai sul tab **Allegati** → c'è il file che hai caricato?

**Domande**:
- I 2 bottoni "Crea nuova" / "Allega esistente" si vedono entrambi come cliccabili?
- Il drawer con i dropdown Cliente/Pratica è chiaro o farraginoso?
- La lista pratiche è facile da navigare?

### Scenario 6 — Feature in roadmap (~1 min)
Vai sulla **Rubrica clienti**. Vedrai un bottone **"Connetti ad anagrafica esistente"** disabilitato (apre un modal "Disponibile in V1").

Idem nel menù sinistro **"Connessione ERP"**, **"Agenda"**, **"Scadenze"**, **"Configurazione"**.

**Domanda**:
- Capisci dal contesto che sono **feature pensate ma non ancora implementate**, parte della roadmap futura? O ti sembrano bug?

### Scenario 7 — Mobile-tablet (opzionale, ~2 min)
Se hai voglia, ridimensiona la finestra del browser a circa 800px di larghezza (o aprilo da tablet).

- Il menù sinistro che fa?
- Le tabelle scorrono lateralmente?
- Apri una pratica → vista **Albero**. Su schermo stretto cosa appare?

## Cosa registrare durante il test

Per ogni scenario:
1. **Cosa hai capito subito** (entro 10 secondi)
2. **Dove hai esitato o ti sei bloccata** (anche solo 3-5 secondi di esitazione)
3. **Cosa ti sembrava non funzionasse** (anche se poi funzionava ma in un altro modo)
4. **Cosa hai trovato bello/elegante**
5. **Cosa ti faceva pensare "questa cosa nel mio studio mi servirebbe / non mi servirebbe"**

Forma libera — bullet point, frasi, anche "che cosa sembra utile?". Non c'è risposta sbagliata.

## Domande finali (dopo aver completato gli scenari)

1. Se domani avessi accesso a questa app, la useresti subito? Cosa ti bloccherebbe?
2. Manca qualcosa di **fondamentale** per uno studio commercialista?
3. C'è qualcosa che ti sembra **un'idea originale** (rispetto ai gestionali tradizionali)?
4. Lo stile visivo (colori, font, layout) ti piace? È adatto a un'app gestionale?
5. Da 1 a 10, quanto la consiglieresti a una collega?

## Note tecniche per noi

- App in single-tenant demo, dati seedati. Tutto persiste in memoria del backend (al restart si torna allo stato iniziale).
- Non c'è auth reale: il dropdown utente in alto cambia "chi sei" senza login.
- Browser consigliato: Chrome o Firefox aggiornati.
- Se trovi errori console F12: copiali (utili per noi).
