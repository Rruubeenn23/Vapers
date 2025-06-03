import { useState } from 'react';
import '../styles/NuevoVaper.css';

function NuevoVaper() {
  const [form, setForm] = useState({
    nombre: '',
    imagen: 'https://static.vapsolo.com/uploads/sites/3/2024/02/BLUE-RAZZ-600x600.png',
    stock: 1,
    precio_unitario: 0
  });

  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validación
    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }

    if (form.stock <= 0) {
      setError('El stock debe ser mayor a 0');
      return;
    }

    if (form.precio_unitario <= 0) {
      setError('El precio debe ser mayor a 0');
      return;
    }

    try {
      const res = await fetch('https://vapers-api.onrender.com/vapers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          imagen: form.imagen.trim(), // Asegúrate de enviar la imagen
          stock: Number(form.stock),
          precio_unitario: Number(form.precio_unitario)
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || errorData.details || 'Error al guardar el vaper');
      }

      const data = await res.json();
      
      alert('¡Vaper guardado exitosamente!');
      setForm({
        nombre: '',
        imagen: 'https://static.vapsolo.com/uploads/sites/3/2024/02/BLUE-RAZZ-600x600.png',
        stock: 1,
        precio_unitario: 0
      });

    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'Ocurrió un error al guardar');
    }
  };

  return (
    <div className="nuevo-vaper">
      <h2>Añadir Nuevo Vaper</h2>
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Nombre:</label>
          <input
            type="text"
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label>URL de la imagen:</label>
          <input
            type="url"
            name="imagen"
            value={form.imagen}
            onChange={handleChange}
            required
            placeholder="https://ejemplo.com/imagen.jpg"
          />
          {form.imagen && (
            <div className="image-preview">
              <img src={form.imagen} alt="Vista previa" onError={(e) => {
                e.target.src = 'https://via.placeholder.com/150';
              }} />
            </div>
          )}
        </div>
        
        <div className="form-group">
          <label>Stock inicial:</label>
          <input
            type="number"
            name="stock"
            min="1"
            value={form.stock}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label>Precio unitario:</label>
          <input
            type="number"
            name="precio_unitario"
            min="0"
            step="0.01"
            value={form.precio_unitario}
            onChange={handleChange}
            required
          />
        </div>
        
        <button type="submit" className="submit-btn">Guardar Vaper</button>
        </form>
    </div>
  );
}

export default NuevoVaper;