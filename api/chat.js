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
const SYSTEM_PROMPT = `Sei l'assistente virtuale de Il Bearč, casa vacanze a Feltrone, Socchieve (UD), Alpi Carniche, 716 m s.l.m., Carnia, Friuli Venezia Giulia.

CASA: 2 camere, 1 bagno, 4 ospiti max, 70 mq su più livelli. Giardino recintato, 2 terrazze con vista montagne. Wi-Fi, aria condizionata, cucina attrezzata (lavastoviglie, lavatrice, microonde), TV satellitare, parcheggio pubblico gratuito vicino. CIN: IT030110C2TSFD92GI.

REGOLE: Check-in dalle 17:00 (self check-in con cassetta portachiavi). Check-out entro 10:00. Soggiorno minimo 3 notti. Animali NON ammessi. Pagamento alla prenotazione via Avaibook.

CONTATTI: Proprietario Dario Rovedo · Tel +39 329 945 1083 · dario.rovedo@gmail.com · www.ilbearc.com

POSIZIONE: 55 km da Udine, 30 km dallo Zoncolan, 464 km da Vienna. Uscita A23 Carnia.

VALUTAZIONE: 9.6/10 su Booking.com, 55 recensioni, Traveller Review Awards 2025.

REGOLA LINGUISTICA IMPORTANTE: INDIVIDUARE SEMPRE la lingua del messaggio dell'utente e rispondere ESATTAMENTE in quella stessa lingua. Se l'utente scrive in inglese, rispondere in inglese. Se in tedesco, rispondere in tedesco. Se in francese, rispondere in francese. Se in italiano, rispondere in italiano. MAI rispondere in una lingua diversa da quella del messaggio dell'utente.

Siate cordiali e concisi (massimo 4-5 frasi). Se non conoscete qualcosa, suggerite di chiamare Dario al numero +39 329 945 1083. Non inventate informazioni non presenti in queste istruzioni.
`;

// ─── RATE LIMIT (in-memory, semplice ma efficace) ───────────────────────────
// Max 20 richieste al minuto per IP. La memoria viene resettata a ogni
// "cold start" del serverless, quindi nel peggiore dei casi un attaccante
// può fare ~20 req/min sostenute. Per il Bearč è più che sufficiente.
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

  // Pulizia periodica per evitare leak di memoria
  if (rateLimitStore.size > 1000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (now > v.resetAt) rateLimitStore.delete(k);
    }
  }

  return entry.count <= RATE_LIMIT_MAX;
}

// ─── HANDLER PRINCIPALE ─────────────────────────────────────────────────────
export default async function handler(req, res) {
  // CORS (per sicurezza, accetta solo richieste dal dominio del Bearč)
  const origin = req.headers.origin || '';
  const allowedOrigins = [
    'https://www.ilbearc.com',
    'https://ilbearc.com',
    'https://il-bearc.vercel.app',
    'http://localhost:3000'  // per test in locale, opzionale
  ];

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Solo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limit per IP
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim()
          || req.headers['x-real-ip']
          || 'unknown';

  if (!checkRateLimit(ip)) {
    return res.status(429).json({
      error: 'Troppe richieste. Riprova tra un minuto, oppure contatta Dario al +39 329 945 1083.'
    });
  }

  // Validazione input
  const { message } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Messaggio mancante o non valido.' });
  }

  // Limite lunghezza messaggio (anti-abuso: niente prompt da 10k token)
  const trimmed = message.trim().slice(0, 500);
  if (trimmed.length < 1) {
    return res.status(400).json({ error: 'Messaggio vuoto.' });
  }

  // Chiave dalle env vars di Vercel
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[chat.js] OPENAI_API_KEY non configurata nelle env vars di Vercel');
    return res.status(500).json({ error: 'Servizio non configurato. Contatta Dario al +39 329 945 1083.' });
  }

  // Chiamata a OpenAI
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
        max_tokens: 300,
        temperature: 0.7
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
