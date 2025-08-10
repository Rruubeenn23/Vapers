const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Permitir estos orígenes (localhost para desarrollo y tu dominio en producción)
const allowedOrigins = [
  'http://localhost:5173',
  'https://vapers-78l8.vercel.app',  // frontend en Vercel
];

const corsOptions = {
  origin: function(origin, callback){
    // Permitir solicitudes sin origen (como Postman)
    if(!origin) return callback(null, true);
    if(allowedOrigins.indexOf(origin) === -1){
      const msg = `El CORS policy no permite el acceso desde el origen: ${origin}`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // si usas cookies o autorización
};

app.use(cors(corsOptions));

app.use(express.json());

const supabase = require('./lib/supabase');

app.get('/', async (req, res) => {
  const { data, error } = await supabase.from('vapers').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});

app.post('/compras', async (req, res) => {
  const { id_vaper, cantidad, precio_unitario, total, fecha } = req.body;

  if (!id_vaper || !cantidad || !precio_unitario || !total) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  // Insertar compra
  const { data, error } = await supabase
    .from('compras')
    .insert([{ 
      id_vaper, 
      cantidad, 
      precio_unitario, 
      total, 
      fecha 
    }]);

  if (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json({ mensaje: 'Compra registrada', data });
});


app.post('/vapers', async (req, res) => {
  const { nombre, imagen, stock, precio_unitario } = req.body;

  // Validación mejorada
  if (!nombre?.trim()) {
    return res.status(400).json({ error: 'El nombre es obligatorio' });
  }

  if (isNaN(stock) || stock < 0) {
    return res.status(400).json({ error: 'Stock debe ser un número positivo' });
  }

  if (isNaN(precio_unitario) || precio_unitario <= 0) {
    return res.status(400).json({ error: 'Precio debe ser mayor a 0' });
  }

  try {
    const { data, error } = await supabase
      .from('vapers')
      .insert([{
        nombre: nombre.trim(),
        imagen: imagen?.trim() || 'https://via.placeholder.com/150', // Valor por defecto si no se proporciona
        stock: parseInt(stock),
        precio_unitario: parseFloat(precio_unitario)
      }])
      .select();

    if (error) {
      console.error('Error Supabase:', error);
      return res.status(500).json({ 
        error: 'Error al crear vaper',
        details: error.message 
      });
    }

    return res.status(201).json({ 
      success: true,
      data: data[0] 
    });

  } catch (err) {
    console.error('Error inesperado:', err);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: err.message 
    });
  }
});

app.post('/ventas', async (req, res) => {
  try {
    console.log('REQ BODY:', req.body); // 👉 Verifica que todo llegue bien

    const { id_vaper, cantidad, precio_unitario, cliente } = req.body;

    if (!id_vaper || !cantidad || precio_unitario === undefined || precio_unitario === null || !cliente) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    const { data, error } = await supabase
      .from('ventas')
      .insert([{ id_vaper, cantidad, precio_unitario, cliente }]);

    if (error) {
      console.error('SUPABASE INSERT ERROR:', error);
      return res.status(500).json({ error: 'Error insertando venta' });
    }

    // Reducir stock
    const { error: stockError } = await supabase.rpc('reducir_stock', {
      vid: id_vaper,
      cantidad_vendida: cantidad
    });

    if (stockError) {
      console.error('SUPABASE RPC ERROR:', stockError);
      return res.status(500).json({ error: 'Error reduciendo stock' });
    }

    res.status(201).json({ message: 'Venta registrada correctamente', data });
  } catch (err) {
    console.error('UNEXPECTED ERROR:', err); // 👈 Aquí atrapamos cualquier error inesperado
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.get('/api/ventas', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('ventas')
      .select('*');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    console.error('Error fetching ventas:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/finanzas', async (req, res) => {
  const { titulo, precio, descripcion, tag } = req.body;

  if (!titulo || !precio || !tag) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  const mes = new Date().toISOString().slice(0, 7); // "2025-07"
  const { data, error } = await supabase
    .from('finanzas')
    .insert([{ titulo, precio, descripcion, tag, mes }]);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json({ message: 'Registro creado correctamente', data });
});

app.get('/api/finanzas', async (req, res) => {
  const { data, error } = await supabase
    .from('finanzas')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ============ n8n: proxy chat-ventas ============
// Variables n8n (puedes ponerlas al principio del archivo si prefieres)
const N8N_BASE_URL = process.env.N8N_BASE_URL || '';
const N8N_CHAT_VENTAS_PATH = process.env.N8N_CHAT_VENTAS_PATH || '/webhook/chat-ventas';
const N8N_URL = `${N8N_BASE_URL}${N8N_CHAT_VENTAS_PATH}`;

// Nota: en Node 18+ existe fetch global (Render usa Node 22), así que no importes node-fetch.

// Ruta proxy -> n8n
app.post('/api/chat-ventas', async (req, res) => {
  try {
    const payload = req.body || {};
    const headers = { 'Content-Type': 'application/json' };

    if (process.env.N8N_AUTH_HEADER && process.env.N8N_AUTH_VALUE) {
      headers[process.env.N8N_AUTH_HEADER] = process.env.N8N_AUTH_VALUE;
    }

    const r = await fetch(N8N_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const text = await r.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { ok: false, error: 'Respuesta no JSON desde n8n', raw: text };
    }

    res
      .status(r.ok ? 200 : (r.status || 500))
      .set({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      .json(data);
  } catch (err) {
    console.error('Error /api/chat-ventas:', err);
    res.status(500).json({ ok: false, error: 'Error interno proxy chat-ventas' });
  }
});
// ================================================
