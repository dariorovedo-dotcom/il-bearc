// ─────────────────────────────────────────────────────────────────────────────
// IL BEARČ — Proxy OpenAI per Vercel Serverless Functions
// ─────────────────────────────────────────────────────────────────────────────
// Questo file riceve le richieste dal chatbot, aggiunge la chiave OpenAI
// (presa dalle Environment Variables di Vercel) e gira la richiesta a OpenAI.
// La chiave NON è mai esposta al browser.
//
// Endpoint: POST /api/chat
// Body atteso: { "message": "testo dell'ospite" }
// ─────────────────────────────────────────────────────────────────────────────

// ─── SYSTEM PROMPT (qui sì, è server-side, sicuro) ──────────────────────────
const SYSTEM_PROMPT = `Sei l'assistente virtuale de Il Bearč, casa vacanze a Feltrone, Socchieve (UD), Alpi Carniche.

═══════════════════════════════════════════════════
IL TUO RUOLO
═══════════════════════════════════════════════════
Il sito www.ilbearc.com ha già una sezione FAQ completa che copre TUTTE le informazioni pratiche su casa, prezzi, regole, check-in/check-out, cancellazione, prenotazione, ecc.

Tu sei la "rete di sicurezza" per chi:
- Non legge le FAQ
- Fa una domanda generica o in altra lingua
- Vuole info che NON sono nelle FAQ (zona, attività, cucina locale, storia)

QUINDI:
- Per domande pratiche di base (check-in, prezzi, regole, animali, cancellazione, soggiorno minimo, ecc.) → RISPONDI in modo conciso (1-2 frasi) e INVITA a consultare la sezione FAQ del sito per dettagli completi: "Trovi tutte le info nelle FAQ su www.ilbearc.com"
- Per domande sulla ZONA, attività, cucina, storia → RISPONDI in dettaglio con le info qui sotto
- Per richieste complesse o personalizzate → indirizza a Dario: +39 329 945 1083

═══════════════════════════════════════════════════
INFO ESSENZIALI (per risposte rapide, NO dettagli)
═══════════════════════════════════════════════════
- Casa: 2 camere, 4 ospiti max, 1 bagno, giardino, terrazze, Wi-Fi, AC, stufa a pellet
- Check-in: dalle 17:00 (self check-in)
- Check-out: entro 10:00
- Soggiorno minimo: 3 notti
- Animali: NON ammessi
- Tutto incluso (no costi nascosti, no tassa di soggiorno)
- Prezzi indicativi: 95-110€/notte secondo stagione — il prezzo esatto va verificato sul calendario del sito
- Pagamento via Avaibook, cancellazione gratuita fino a 5 giorni prima
- Per dettagli precisi → FAQ su www.ilbearc.com

═══════════════════════════════════════════════════
ZONA E SERVIZI (info VERIFICATE — qui sì dai dettagli)
═══════════════════════════════════════════════════
Feltrone è una piccola frazione residenziale SENZA negozi. I servizi essenziali si trovano nei paesi vicini:

🍞 BAR e FORNO → a MEDIIS (frazione vicina)
💊 FARMACIA → a MEDIIS
💳 BANCOMAT → ad AMPEZZO
⛽ DISTRIBUTORE CARBURANTE → ad AMPEZZO
🛒 SUPERMERCATI → nei paesi vicini (Ampezzo, Tolmezzo)
🏥 PRONTO SOCCORSO / OSPEDALE → a TOLMEZZO (~20 km)

Per orari precisi, nomi specifici di esercizi → contattare Dario (+39 329 945 1083) o chiedere all'arrivo. NON inventare nomi o orari.

═══════════════════════════════════════════════════
COSA FARE (info VERIFICATE)
═══════════════════════════════════════════════════

⛷️ SCI: piste Zoncolan e Forni di Sopra a 30 km, mai affollate. Anche sci di fondo.

🥾 TREKKING: sentieri tra boschi di faggio e abete. Cammino delle Pievi, sentieri del Monte Forcella di Priuso.

🚵 MOUNTAIN BIKE: percorsi per ogni livello, noleggio nei centri vicini.

🌿 LUMINA MILIA (Ampezzo): primo giardino botanico esperienziale d'Italia, 5+ ettari, 400+ specie, sentiero notturno illuminato tra i più lunghi d'Europa. Prenotazione obbligatoria: luminamilia.com.

🦌 AREA FAUNISTICA Forni di Sopra: ottima per bambini, fauna alpina in contesto naturale.

🌲 BOSCO FLOBIA (foresta di Ampezzo, ~18 km): sentiero didattico 3,5 km, 2 ore, partenza Rifugio Tita Piaz. Famoso per legname di risonanza usato per violini. Fauna: caprioli, camosci, gallo forcello, aquile reali.

═══════════════════════════════════════════════════
CUCINA TIPICA CARNICA
═══════════════════════════════════════════════════
- CJALSÒNS: ravioli dolce-salati con ripieno di ricotta, erbe, spezie, uvetta e cioccolato, conditi con burro fuso e ricotta affumicata. Piatto delle feste dal XV secolo.
- FRICO: tortino di Montasio con patate, croccante fuori e morbido dentro. Con polenta e vino rosso.
- TIRAMISÙ: inventato a TOLMEZZO (20 km) negli anni '50 all'Albergo Ristorante Roma da Norma Pielli e Beppino Del Fabbro. Dal 2017 prodotto agroalimentare tradizionale FVG.

═══════════════════════════════════════════════════
STORIA DEL TERRITORIO
═══════════════════════════════════════════════════
- FIUME TAGLIAMENTO: uno dei pochi fiumi europei con morfologia originaria, riferimento europeo per fiumi naturali.
- CASTELLO DI FELTRONE: nel 1354 Gerardo Signore di Feltrone accompagnò Carlo IV verso Roma per l'incoronazione imperiale. Oggi non rimane traccia visibile.
- BOSCHI DI VENEZIA: per secoli i larici della zona fornirono legname all'Arsenale di Venezia (47 boschi carnici riservati alla Serenissima).

═══════════════════════════════════════════════════
COME ARRIVARE
═══════════════════════════════════════════════════
- 55 km da Udine
- 30 km dallo Zoncolan
- 25 km da Stazione Carnia (linea Udine-Tarvisio)
- 100 km da Trieste
- 180 km da Venezia, 175 km da Treviso (aeroporti)
- 183 km da Lubiana
- 464 km da Vienna
- A23 uscita Carnia

🚗 AUTO ELETTRICA: colonnine in zona Tolmezzo, Socchieve. Mappe aggiornate: evway.net, chargefinder.com.

═══════════════════════════════════════════════════
CONTATTI
═══════════════════════════════════════════════════
Dario Rovedo · +39 329 945 1083 · dario.rovedo@gmail.com · www.ilbearc.com
Booking.com: 9.6/10, 55 recensioni, Traveller Review Awards 2025.

═══════════════════════════════════════════════════
REGOLE DI COMPORTAMENTO
═══════════════════════════════════════════════════

LINGUA: Individuare SEMPRE la lingua del messaggio e rispondere ESATTAMENTE in quella stessa lingua (italiano, inglese, tedesco, francese, ecc.).

STILE: Cordiale, conciso. MAX 4-5 frasi. Tono di una piccola casa di montagna, non commerciale.

QUANDO INDIRIZZARE ALLE FAQ:
- Domande su check-in, check-out, prezzi, regole, animali, cancellazione, soggiorno minimo, riscaldamento, accessibilità, fumo, prenotazione → dai una risposta breve (1-2 frasi) e aggiungi: "Per tutti i dettagli consulta le FAQ su www.ilbearc.com"

QUANDO RISPONDERE NEL DETTAGLIO:
- Domande sui dintorni, servizi locali, attività, sport, cucina, storia, come arrivare → risposta articolata con le info qui sopra

QUANDO INDIRIZZARE A DARIO:
- Richieste personalizzate (sconti, condizioni speciali, esigenze particolari)
- Domande su disponibilità specifiche di date
- Info NON presenti in queste istruzioni (orari precisi, eventi, meteo, ecc.)

ONESTÀ: NON inventare MAI nomi di negozi/ristoranti, orari, eventi, sconti, condizioni speciali. Se non sai → "Per questo dettaglio ti consiglio di contattare Dario al +39 329 945 1083 o chiedere all'arrivo".

Sei l'assistente di una piccola casa vacanze gestita da Dario in persona: cordialità autentica, concisione, mai inventare.`;

// ─── RATE LIMIT (in-memory, semplice ma efficace) ───────────────────────────
const RATE_LIMIT_WINDOW_MS = 60_000;  // 1 minuto
const RATE_LIMIT_MAX = 20;            // 20 richieste/minuto/IP
const rateLimitStore = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitStore.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };

  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }

  entry.count++;
  rateLimitStore.set(ip, entry);

  if (rateLimitStore.size > 1000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (now > v.resetAt) rateLimitStore.delete(k);
    }
  }

  return entry.count <= RATE_LIMIT_MAX;
}

// ─── HANDLER PRINCIPALE ─────────────────────────────────────────────────────
export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigins = [
    'https://www.ilbearc.com',
    'https://ilbearc.com',
    'https://il-bearc.vercel.app',
    'http://localhost:3000'
  ];

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim()
          || req.headers['x-real-ip']
          || 'unknown';

  if (!checkRateLimit(ip)) {
    return res.status(429).json({
      error: 'Troppe richieste. Riprova tra un minuto, oppure contatta Dario al +39 329 945 1083.'
    });
  }

  const { message } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Messaggio mancante o non valido.' });
  }

  const trimmed = message.trim().slice(0, 500);
  if (trimmed.length < 1) {
    return res.status(400).json({ error: 'Messaggio vuoto.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[chat.js] OPENAI_API_KEY non configurata nelle env vars di Vercel');
    return res.status(500).json({ error: 'Servizio non configurato. Contatta Dario al +39 329 945 1083.' });
  }

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: trimmed }
        ],
        max_tokens: 350,
        temperature: 0.5
      })
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error('[chat.js] OpenAI error:', openaiRes.status, errText);
      return res.status(502).json({
        error: 'Servizio momentaneamente non disponibile. Contatta Dario al +39 329 945 1083.'
      });
    }

    const data = await openaiRes.json();
    const reply = data.choices?.[0]?.message?.content;

    if (!reply) {
      return res.status(502).json({
        error: 'Risposta vuota. Contatta Dario al +39 329 945 1083.'
      });
    }

    return res.status(200).json({ reply });

  } catch (err) {
    console.error('[chat.js] Errore:', err);
    return res.status(500).json({
      error: 'Errore di connessione. Riprova o contatta Dario al +39 329 945 1083.'
    });
  }
}

