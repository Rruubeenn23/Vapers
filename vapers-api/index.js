const express = require('express');
const cors = require('cors');
require('dotenv').config();
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const supabase = require('./lib/supabase');

const app = express();

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'https://vapers-78l8.vercel.app',
];
app.use(cors({
  origin(origin, cb) {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origen no permitido: ${origin}`), false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json());

// ─── EMAIL ───────────────────────────────────────────────────────────────────
const mailer = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendEmail(subject, html) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[email] EMAIL_USER / EMAIL_PASS no configurados — omitiendo envío');
    return;
  }
  await mailer.sendMail({
    from: `"Vapers de Rubén" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_TO || process.env.EMAIL_USER,
    subject,
    html,
  });
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function computeMetrics(sales) {
  const ingresoTotal = sales.reduce((s, v) => s + (v.total ?? 0), 0);
  const unidades = sales.reduce((s, v) => s + (v.cantidad ?? 0), 0);
  const numVentas = sales.length;
  const ticketMedio = unidades ? ingresoTotal / unidades : 0;
  return { ingresoTotal, unidades, numVentas, ticketMedio };
}

function getTopCliente(sales) {
  const map = {};
  sales.forEach(v => {
    if (!v.cliente) return;
    map[v.cliente] = (map[v.cliente] || 0) + (v.total ?? 0);
  });
  const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
  if (!sorted.length) return null;
  return { nombre: sorted[0][0], gasto: sorted[0][1] };
}

function getTopProductos(sales, vapers) {
  const nameMap = Object.fromEntries((vapers || []).map(v => [v.id, v.nombre]));
  const map = {};
  sales.forEach(v => {
    const key = v.id_vaper;
    if (!map[key]) map[key] = { producto: nameMap[key] || String(key), unidades: 0, ingresos: 0 };
    map[key].unidades += v.cantidad ?? 0;
    map[key].ingresos += v.total ?? 0;
  });
  return Object.values(map).sort((a, b) => b.unidades - a.unidades).slice(0, 5);
}

async function getWeeklySummary(days = 7) {
  const now = new Date();
  const from = new Date(now - days * 24 * 60 * 60 * 1000);

  const [{ data: ventas }, { data: vapers }] = await Promise.all([
    supabase.from('ventas').select('*').gte('fecha', from.toISOString()).order('fecha', { ascending: false }),
    supabase.from('vapers').select('id, nombre, stock'),
  ]);

  const sales = ventas || [];
  const metrics = computeMetrics(sales);
  const topCliente = getTopCliente(sales);
  const topProductos = getTopProductos(sales, vapers || []);

  return {
    period: { from: from.toISOString(), to: now.toISOString(), days },
    metrics,
    topCliente,
    topProductos,
    totalProductos: (vapers || []).length,
    stockTotal: (vapers || []).reduce((s, v) => s + (v.stock ?? 0), 0),
  };
}

function buildEmailHtml(summary) {
  const { period, metrics, topCliente, topProductos } = summary;
  const from = new Date(period.from).toLocaleDateString('es-ES');
  const to = new Date(period.to).toLocaleDateString('es-ES');

  const topProdRows = (topProductos || [])
    .map(p => `<tr><td>${p.producto}</td><td>${p.unidades}</td><td>€${p.ingresos.toFixed(2)}</td></tr>`)
    .join('');

  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#1a1a1a;color:#f1f5f9;padding:32px;border-radius:16px">
      <h1 style="color:#a78bfa;margin:0 0 4px">Vapers de Rubén</h1>
      <p style="color:#94a3b8;margin:0 0 24px">Resumen ${period.days} días · ${from} – ${to}</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px">
        <div style="background:#242424;border-radius:12px;padding:16px">
          <div style="color:#94a3b8;font-size:13px">Ingresos</div>
          <div style="font-size:24px;font-weight:700;color:#22c55e">€${metrics.ingresoTotal.toFixed(2)}</div>
        </div>
        <div style="background:#242424;border-radius:12px;padding:16px">
          <div style="color:#94a3b8;font-size:13px">Unidades</div>
          <div style="font-size:24px;font-weight:700">${metrics.unidades}</div>
        </div>
        <div style="background:#242424;border-radius:12px;padding:16px">
          <div style="color:#94a3b8;font-size:13px">Ventas</div>
          <div style="font-size:24px;font-weight:700">${metrics.numVentas}</div>
        </div>
        <div style="background:#242424;border-radius:12px;padding:16px">
          <div style="color:#94a3b8;font-size:13px">Ticket medio</div>
          <div style="font-size:24px;font-weight:700">€${metrics.ticketMedio.toFixed(2)}</div>
        </div>
      </div>
      ${topCliente ? `<p><strong>Top cliente:</strong> ${topCliente.nombre} — €${topCliente.gasto.toFixed(2)}</p>` : ''}
      ${topProdRows ? `
        <h3 style="color:#a78bfa">Top productos</h3>
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="color:#94a3b8"><th style="text-align:left;padding:8px 0">Producto</th><th>Uds</th><th>€</th></tr></thead>
          <tbody>${topProdRows}</tbody>
        </table>` : ''}
      <p style="margin-top:24px;color:#64748b;font-size:12px">Enviado automáticamente · Vapers de Rubén</p>
    </div>`;
}

// ─── EXISTING ENDPOINTS ───────────────────────────────────────────────────────

// Legacy root
app.get('/', async (req, res) => {
  const { data, error } = await supabase.from('vapers').select('*');
  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json(data);
});

// Vapers list
app.get('/api/vapers', async (req, res) => {
  try {
    const { data, error } = await supabase.from('vapers').select('id, nombre, imagen, stock');
    if (error) return res.status(500).json({ ok: false, error: error.message });
    res.json((data || []).map(v => ({ ...v, stock: Number(v.stock ?? 0) })));
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Single vaper
app.get('/api/vapers/:id', async (req, res) => {
  const { data, error } = await supabase.from('vapers').select('*').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ ok: false, error: 'No encontrado' });
  res.json({ ok: true, data });
});

// Create vaper
app.post('/vapers', async (req, res) => {
  const { nombre, imagen, stock } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ ok: false, error: 'El nombre es obligatorio' });
  if (isNaN(stock) || stock < 0) return res.status(400).json({ ok: false, error: 'Stock debe ser un número positivo' });

  const { data, error } = await supabase.from('vapers').insert([{
    nombre: nombre.trim(),
    imagen: imagen?.trim() || 'https://placehold.co/150x150/1a1a1a/a78bfa?text=Vaper',
    stock: parseInt(stock),
  }]).select();

  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.status(201).json({ ok: true, data: data[0] });
});

// Edit vaper
app.put('/api/vapers/:id', async (req, res) => {
  const { nombre, imagen, stock } = req.body;
  const updates = {};
  if (nombre !== undefined) updates.nombre = nombre.trim();
  if (imagen !== undefined) updates.imagen = imagen.trim() || 'https://placehold.co/150x150/1a1a1a/a78bfa?text=Vaper';
  if (stock !== undefined) updates.stock = parseInt(stock);

  const { data, error } = await supabase.from('vapers').update(updates).eq('id', req.params.id).select();
  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json({ ok: true, data: data[0] });
});

// Delete vaper
app.delete('/api/vapers/:id', async (req, res) => {
  const { error } = await supabase.from('vapers').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json({ ok: true });
});

// Auto order ID
app.get('/api/next-order-id', async (req, res) => {
  const { data, error } = await supabase.from('ventas').select('order_id').order('order_id', { ascending: false }).limit(1);
  if (error) return res.status(500).json({ ok: false, error: error.message });
  const max = data?.[0]?.order_id ?? 0;
  res.json({ ok: true, nextOrderId: max + 1 });
});

// Sales
app.get('/api/ventas', async (req, res) => {
  try {
    const { data: ventas, error: e1 } = await supabase.from('ventas').select('*').order('fecha', { ascending: false });
    if (e1) return res.status(500).json({ ok: false, error: e1.message });

    const ids = [...new Set((ventas || []).map(v => v.id_vaper).filter(Boolean))];
    let nameMap = {};
    if (ids.length) {
      const { data: vapers } = await supabase.from('vapers').select('id, nombre').in('id', ids);
      nameMap = Object.fromEntries((vapers || []).map(v => [v.id, v.nombre]));
    }

    res.json((ventas || []).map(v => ({
      ...v,
      producto_nombre: nameMap[v.id_vaper] ?? null,
      producto: { id: v.id_vaper, nombre: nameMap[v.id_vaper] ?? null },
    })));
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Register sale
app.post('/ventas', async (req, res) => {
  try {
    const { id_vaper, cantidad, precio_unitario, cliente } = req.body;
    const orderId = Number(req.body.order_id);

    if (!id_vaper || !cantidad || precio_unitario == null || !cliente)
      return res.status(400).json({ ok: false, error: 'Faltan datos requeridos' });
    if (!Number.isFinite(orderId) || orderId < 1)
      return res.status(400).json({ ok: false, error: 'order_id inválido' });

    const { data, error } = await supabase.from('ventas').insert([{
      id_vaper, cantidad, precio_unitario, cliente, order_id: orderId,
    }]).select('*');

    if (error) return res.status(500).json({ ok: false, error: 'Error insertando venta' });

    const { error: stockErr } = await supabase.rpc('reducir_stock', { vid: id_vaper, cantidad_vendida: cantidad });
    if (stockErr) return res.status(500).json({ ok: false, error: 'Error reduciendo stock' });

    res.status(201).json({ ok: true, data: data?.[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Purchases
app.post('/compras', async (req, res) => {
  const { id_vaper, cantidad, precio_unitario, total, fecha } = req.body;
  if (!id_vaper || !cantidad || !precio_unitario || !total)
    return res.status(400).json({ ok: false, error: 'Faltan campos obligatorios' });

  const { data, error } = await supabase.from('compras').insert([{ id_vaper, cantidad, precio_unitario, total, fecha }]).select();
  if (error) return res.status(500).json({ ok: false, error: error.message });

  // Update stock
  await supabase.rpc('aumentar_stock', { vid: id_vaper, cantidad_comprada: cantidad }).catch(() => {});

  res.status(201).json({ ok: true, data: data?.[0] });
});

app.get('/api/compras', async (req, res) => {
  try {
    const { data: compras, error } = await supabase.from('compras').select('*').order('fecha', { ascending: false });
    if (error) return res.status(500).json({ ok: false, error: error.message });

    const ids = [...new Set((compras || []).map(c => c.id_vaper).filter(Boolean))];
    let nameMap = {};
    if (ids.length) {
      const { data: vapers } = await supabase.from('vapers').select('id, nombre').in('id', ids);
      nameMap = Object.fromEntries((vapers || []).map(v => [v.id, v.nombre]));
    }

    res.json((compras || []).map(c => ({ ...c, producto_nombre: nameMap[c.id_vaper] ?? null })));
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Finances
app.get('/api/finanzas', async (req, res) => {
  const { data, error } = await supabase.from('finanzas').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json(data);
});

app.post('/api/finanzas', async (req, res) => {
  const { titulo, precio, descripcion, tag } = req.body;
  if (!titulo || !precio || !tag)
    return res.status(400).json({ ok: false, error: 'Faltan campos obligatorios' });

  const mes = new Date().toISOString().slice(0, 7);
  const { data, error } = await supabase.from('finanzas').insert([{ titulo, precio, descripcion, tag, mes }]).select();
  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.status(201).json({ ok: true, data: data?.[0] });
});

app.delete('/api/finanzas/:id', async (req, res) => {
  const { error } = await supabase.from('finanzas').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json({ ok: true });
});

// ─── NEW ENDPOINTS ────────────────────────────────────────────────────────────

// Low stock
app.get('/api/low-stock', async (req, res) => {
  const threshold = parseInt(req.query.threshold ?? process.env.LOW_STOCK_THRESHOLD ?? 3);
  const { data, error } = await supabase.from('vapers').select('id, nombre, stock, imagen').lte('stock', threshold).order('stock');
  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json({ ok: true, data: data || [], threshold });
});

// Restock suggestions (by sales velocity)
app.get('/api/restock-suggestions', async (req, res) => {
  try {
    const [{ data: ventas }, { data: vapers }] = await Promise.all([
      supabase.from('ventas').select('id_vaper, cantidad, fecha'),
      supabase.from('vapers').select('id, nombre, stock'),
    ]);

    const now = Date.now();
    const velocityMap = {};

    (ventas || []).forEach(v => {
      if (!v.id_vaper) return;
      if (!velocityMap[v.id_vaper]) velocityMap[v.id_vaper] = { total: 0, days: new Set() };
      velocityMap[v.id_vaper].total += v.cantidad ?? 0;
      if (v.fecha) {
        const dayKey = v.fecha.slice(0, 10);
        velocityMap[v.id_vaper].days.add(dayKey);
      }
    });

    const suggestions = (vapers || []).map(vaper => {
      const entry = velocityMap[vaper.id];
      const daysActive = entry?.days?.size || 1;
      const totalSold = entry?.total || 0;
      const velocity = totalSold / daysActive; // units per day
      return { ...vaper, velocity: +velocity.toFixed(2), totalSold, daysActive };
    })
      .filter(v => v.velocity > 0)
      .sort((a, b) => b.velocity - a.velocity)
      .slice(0, 8);

    res.json({ ok: true, data: suggestions });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Weekly summary
app.get('/api/weekly-summary', async (req, res) => {
  try {
    const days = parseInt(req.query.days ?? 7);
    const summary = await getWeeklySummary(days);
    res.json({ ok: true, ...summary });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// CSV exports
function toCSV(rows, cols) {
  const header = cols.map(c => c.label).join(',');
  const body = rows.map(r => cols.map(c => {
    const val = r[c.key] ?? '';
    const str = String(val).replace(/"/g, '""');
    return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
  }).join(',')).join('\n');
  return `${header}\n${body}`;
}

app.get('/api/export/ventas.csv', async (req, res) => {
  const { data: ventas } = await supabase.from('ventas').select('*').order('fecha', { ascending: false });
  const ids = [...new Set((ventas || []).map(v => v.id_vaper).filter(Boolean))];
  let nameMap = {};
  if (ids.length) {
    const { data: vapers } = await supabase.from('vapers').select('id, nombre').in('id', ids);
    nameMap = Object.fromEntries((vapers || []).map(v => [v.id, v.nombre]));
  }
  const rows = (ventas || []).map(v => ({ ...v, producto: nameMap[v.id_vaper] ?? v.id_vaper }));
  const csv = toCSV(rows, [
    { key: 'id', label: 'ID' },
    { key: 'fecha', label: 'Fecha' },
    { key: 'cliente', label: 'Cliente' },
    { key: 'producto', label: 'Producto' },
    { key: 'cantidad', label: 'Cantidad' },
    { key: 'precio_unitario', label: 'Precio unitario' },
    { key: 'total', label: 'Total' },
    { key: 'order_id', label: 'Pedido' },
  ]);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="ventas.csv"');
  res.send('\uFEFF' + csv);
});

app.get('/api/export/compras.csv', async (req, res) => {
  const { data: compras } = await supabase.from('compras').select('*').order('fecha', { ascending: false });
  const ids = [...new Set((compras || []).map(c => c.id_vaper).filter(Boolean))];
  let nameMap = {};
  if (ids.length) {
    const { data: vapers } = await supabase.from('vapers').select('id, nombre').in('id', ids);
    nameMap = Object.fromEntries((vapers || []).map(v => [v.id, v.nombre]));
  }
  const rows = (compras || []).map(c => ({ ...c, producto: nameMap[c.id_vaper] ?? c.id_vaper }));
  const csv = toCSV(rows, [
    { key: 'id', label: 'ID' },
    { key: 'fecha', label: 'Fecha' },
    { key: 'producto', label: 'Producto' },
    { key: 'cantidad', label: 'Cantidad' },
    { key: 'precio_unitario', label: 'Precio unitario' },
    { key: 'total', label: 'Total' },
  ]);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="compras.csv"');
  res.send('\uFEFF' + csv);
});

app.get('/api/export/finanzas.csv', async (req, res) => {
  const { data } = await supabase.from('finanzas').select('*').order('created_at', { ascending: false });
  const csv = toCSV(data || [], [
    { key: 'id', label: 'ID' },
    { key: 'created_at', label: 'Fecha' },
    { key: 'titulo', label: 'Título' },
    { key: 'precio', label: 'Precio' },
    { key: 'tag', label: 'Tag' },
    { key: 'mes', label: 'Mes' },
    { key: 'descripcion', label: 'Descripción' },
  ]);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="finanzas.csv"');
  res.send('\uFEFF' + csv);
});

// ─── AI CHAT (native Groq — no n8n) ──────────────────────────────────────────
app.post('/api/ventas-chat', async (req, res) => {
  try {
    const { prompt, days = 7 } = req.body;
    if (!prompt?.trim()) return res.status(400).json({ ok: false, error: 'El prompt es obligatorio' });

    if (!process.env.GROQ_API_KEY) {
      return res.status(503).json({ ok: false, error: 'GROQ_API_KEY no configurado en el servidor' });
    }

    const now = new Date();
    const from = new Date(now - days * 24 * 60 * 60 * 1000);

    const [{ data: allVentas }, { data: vapers }, { data: finanzas }] = await Promise.all([
      supabase.from('ventas').select('*').order('fecha', { ascending: false }),
      supabase.from('vapers').select('*'),
      supabase.from('finanzas').select('*').order('created_at', { ascending: false }),
    ]);

    const recentSales = (allVentas || []).filter(v => !v.fecha || new Date(v.fecha) >= from);
    const metrics = computeMetrics(recentSales);
    const topCliente = getTopCliente(recentSales);
    const topProductos = getTopProductos(recentSales, vapers || []);

    const text = (prompt || '').toLowerCase();
    let intent = 'ventas';
    if (/(inventario|stock|producto|vaper)/.test(text)) intent = 'vapers';
    if (/(finanza|gasto|beneficio|coste|ingreso)/.test(text)) intent = 'finanzas';

    const ctx = {
      ventas: recentSales.slice(0, 100),
      vapers: vapers || [],
      finanzas: (finanzas || []).slice(0, 50),
    };

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2,
        max_tokens: 900,
        messages: [
          {
            role: 'system',
            content: 'Eres un asistente de negocio para una tienda de vapes. Responde siempre en español, de forma concisa y útil, usando solo el contexto proporcionado.',
          },
          { role: 'user', content: prompt },
          {
            role: 'user',
            content: `CONTEXTO ${intent.toUpperCase()} (últimos ${days} días): ${JSON.stringify(ctx[intent])}`,
          },
        ],
      }),
    });

    const groqData = await groqRes.json();
    const answer = groqData.choices?.[0]?.message?.content || 'Sin respuesta';

    res.json({
      ok: true,
      answer,
      intent,
      period: { from: from.toISOString(), to: now.toISOString() },
      metrics,
      topCliente,
      topProductos,
    });
  } catch (err) {
    console.error('Error /api/ventas-chat:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── EMAIL DIGEST (native — no n8n) ──────────────────────────────────────────
app.post('/api/resumen-7dias-email', async (req, res) => {
  try {
    const days = parseInt(req.body?.days ?? 7);
    const summary = await getWeeklySummary(days);
    const html = buildEmailHtml(summary);
    await sendEmail(`Resumen ventas últimos ${days} días — Vapers de Rubén`, html);
    res.json({ ok: true, message: `Email enviado a ${process.env.EMAIL_TO || process.env.EMAIL_USER}` });
  } catch (err) {
    console.error('Error /api/resumen-7dias-email:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── SCHEDULED JOBS ───────────────────────────────────────────────────────────

// Every Monday at 09:00 — weekly digest
cron.schedule('0 9 * * 1', async () => {
  console.log('[cron] Enviando resumen semanal...');
  try {
    const summary = await getWeeklySummary(7);
    await sendEmail('Resumen semanal — Vapers de Rubén', buildEmailHtml(summary));
    console.log('[cron] Resumen semanal enviado');
  } catch (err) {
    console.error('[cron] Error resumen semanal:', err.message);
  }
}, { timezone: 'Europe/Madrid' });

// Every day at 20:00 — low stock check
cron.schedule('0 20 * * *', async () => {
  const threshold = parseInt(process.env.LOW_STOCK_THRESHOLD ?? 3);
  const { data } = await supabase.from('vapers').select('nombre, stock').lte('stock', threshold);
  if (!data?.length) return;

  const list = data.map(v => `• ${v.nombre}: ${v.stock} uds`).join('\n');
  const html = `
    <div style="font-family:sans-serif;background:#1a1a1a;color:#f1f5f9;padding:24px;border-radius:12px">
      <h2 style="color:#f59e0b">⚠️ Alerta stock bajo</h2>
      <p>Los siguientes productos tienen stock ≤ ${threshold}:</p>
      <pre style="background:#242424;padding:16px;border-radius:8px">${list}</pre>
    </div>`;

  await sendEmail('⚠️ Stock bajo — Vapers de Rubén', html).catch(err => {
    console.error('[cron] Error alerta stock:', err.message);
  });
  console.log(`[cron] Alerta stock enviada: ${data.length} productos`);
}, { timezone: 'Europe/Madrid' });

// ─── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
