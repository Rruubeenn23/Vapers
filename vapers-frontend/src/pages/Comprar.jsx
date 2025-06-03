import { useState, useEffect } from 'react';
import '../styles/Comprar.css';

function Comprar() {
  const [vapers, setVapers] = useState([]);
  const [selectedVaper, setSelectedVaper] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    cantidad: 1,
    precio_unitario: 0
  });

  // Obtener vapers de la API
  useEffect(() => {
    const fetchVapers = async () => {
      try {
        const res = await fetch('https://api-vapers.onrender.com/');
        const data = await res.json();
        setVapers(data);
      } catch (error) {
        console.error('Error fetching vapers:', error);
      }
    };
    fetchVapers();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: name === 'cantidad' ? parseInt(value) : parseFloat(value),
      total: name === 'cantidad' 
        ? (form.precio_unitario * value).toFixed(2)
        : (value * form.cantidad).toFixed(2)
    });
  };

  const handleSubmitCompra = async (e) => {
    e.preventDefault();
    
    try {
      const res = await fetch('https://api-vapers.onrender.com/compras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_vaper: selectedVaper.id,
          cantidad: form.cantidad,
          precio_unitario: form.precio_unitario,
          total: form.precio_unitario * form.cantidad,
          fecha: new Date().toISOString()
        })
      });

      if (res.ok) {
        alert('Compra registrada correctamente');
        setShowModal(false);
        // Actualizar stock
        await fetch(`https://api-vapers.onrender.com/${selectedVaper.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stock: selectedVaper.stock + form.cantidad
          })
        });
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="comprar-container">
      <h2>Comprar Vapers</h2>
      
      <div className="vaper-grid">
        {vapers.map(vaper => (
          <div key={vaper.id} className="vaper-card" onClick={() => {
            setSelectedVaper(vaper);
            setForm({
              cantidad: 1,
              precio_unitario: vaper.precio_unitario || 0,
              total: vaper.precio_unitario || 0
            });
            setShowModal(true);
          }}>
            <img src={vaper.imagen} alt={vaper.nombre} />
            <h3>{vaper.nombre}</h3>
            <p>Stock: {vaper.stock}</p>
          </div>
        ))}
      </div>

      {/* Modal para comprar */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Comprar {selectedVaper?.nombre}</h3>
            <form onSubmit={handleSubmitCompra}>
              <div className="form-group">
                <label>Cantidad:</label>
                <input
                  type="number"
                  name="cantidad"
                  min="1"
                  value={form.cantidad}
                  onChange={handleInputChange}
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
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Total:</label>
                <input
                  type="text"
                  value={form.total || (form.precio_unitario * form.cantidad).toFixed(2)}
                  readOnly
                />
              </div>
              
              <div className="modal-buttons">
                <button type="button" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit">Confirmar Compra</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Comprar;