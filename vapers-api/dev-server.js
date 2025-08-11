require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());

// CORS para front local
app.use(cors()); // permite cualquier origen en local


const N8N_BASE_URL = process.env.N8N_BASE_URL || '';
const N8N_CHAT_VENTAS_PATH = process.env.N8N_CHAT_VENTAS_PATH || '/webhook/chat-ventas';
const N8N_URL = `${N8N_BASE_URL}${N8N_CHAT_VENTAS_PATH}`;

app.get('/', (_req, res) => res.send('API local OK')); // sanity check

// GET helper para que no te salga "Cannot GET" al probar en navegador
app.get('/api/chat-ventas', (_req, res) => {
  res
    .status(405)
    .set('Content-Type', 'application/json')
    .send(JSON.stringify({ ok: false, error: 'Usa POST en /api/chat-ventas' }));
});

// Ruta POST real
app.post('/api/chat-ventas', async (req, res) => {
  try {
    const payload = req.body || {};
    console.log('> /api/chat-ventas payload:', payload);

    const headers = { 'Content-Type': 'application/json' };
    if (process.env.N8N_AUTH_HEADER && process.env.N8N_AUTH_VALUE) {
      headers[process.env.N8N_AUTH_HEADER] = process.env.N8N_AUTH_VALUE;
    }

    console.log(`> Proxy → ${N8N_URL}`);
    const r = await fetch(N8N_URL, { method: 'POST', headers, body: JSON.stringify(payload) });

    const text = await r.text();
    console.log('> Respuesta n8n status:', r.status);
    console.log('> Respuesta n8n body:', text.slice(0, 800)); // muestra primeros 800 chars

    let data;
    try { data = JSON.parse(text); } catch (e) {
      console.error('> Error parse JSON n8n:', e);
      data = { ok: false, error: 'Respuesta no JSON desde n8n', raw: text };
    }

    res.status(r.ok ? 200 : (r.status || 500)).json(data);
  } catch (err) {
    console.error('> Error interno proxy chat-ventas:', err);
    res.status(500).json({ ok: false, error: 'Error interno proxy chat-ventas', detail: String(err?.message || err) });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Dev server escuchando en http://localhost:${port}`));
