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
  const { idVaper, cantidad, precioUnitario } = req.body;

  const { data, error } = await supabase
    .from('compras')
    .insert([{ id_vaper: idVaper, cantidad, precio_unitario: precioUnitario }]);

  if (error) return res.status(500).json({ error: error.message });

  // Opcional: actualizar el stock
  await supabase.rpc('incrementar_stock', { vid: idVaper, cantidad_comprada: cantidad });

  res.json({ mensaje: 'Compra registrada', data });
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
  const { idVaper, cantidad, precioUnitario } = req.body;

  try {
    // Insertar la venta
    const { data, error } = await supabase
      .from('ventas')
      .insert([{
        id_vaper: idVaper,
        cantidad,
        precio_unitario: precioUnitario,
        cliente
      }]);

    if (error) {
      console.error('Error al insertar venta:', error);
      return res.status(500).json({ error: error.message });
    }

    // Lógica opcional: reducir el stock
    await supabase.rpc('reducir_stock', {
      vid: idVaper,
      cantidad_vendida: cantidad
    });

    res.status(201).json({ mensaje: 'Venta registrada', data });

  } catch (err) {
    console.error('Error inesperado al registrar venta:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});
