import { useState, useEffect } from 'react';
import '../styles/Vender.css';

function Vender() {
  const [vapers, setVapers] = useState([]);
  const [selectedVaper, setSelectedVaper] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    cantidad: 1,
    precio_unitario: 0
  });

  // Obtener vapers desde la API
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
    setForm((prev) => ({
      ...prev,
      [name]: name === 'cantidad' ? parseInt(value) : parseFloat(value),
      total: name === 'cantidad'
        ? (prev.precio_unitario * value).toFixed(2)
        : (value * prev.cantidad).toFixed(2)
    }));
  };

  const handleSubmitVenta = async (e) => {
    e.preventDefault();

    if (form.cantidad > selectedVaper.stock) {
        alert('No hay suficiente stock disponible.');
        return;
    }

    try {
        const res = await fetch('https://api-vapers.onrender.com/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id_vaper: selectedVaper.id,
            cantidad: form.cantidad,
            precio_unitario: form.precio_unitario
        })
        });


        if (!res.ok) {
        const text = await res.text(); // En vez de .json()
        throw new Error(`Error ${res.status}: ${text}`);
        }
        
        alert('Venta registrada correctamente');
        setShowModal(false);

        // Actualizar lista de vapers localmente (para reflejar el nuevo stock)
        setVapers(prev =>
        prev.map(v =>
            v.id === selectedVaper.id
            ? { ...v, stock: v.stock - form.cantidad }
            : v
        )
        );

    } catch (error) {
        console.error('Error registrando venta:', error);
        alert('Hubo un error al registrar la venta.');
    }
    };


  return (
    <div className="vender-container">
      <h2>Vender Vapers</h2>

      <div className="vaper-grid">
        {vapers.map(vaper => (
          <div
            key={vaper.id}
            className="vaper-card"
            onClick={() => {
              setSelectedVaper(vaper);
              setForm({
                cantidad: 1,
                precio_unitario: vaper.precio_unitario || 0,
                total: (vaper.precio_unitario || 0).toFixed(2)
              });
              setShowModal(true);
            }}
          >
            <img src={vaper.imagen} alt={vaper.nombre} />
            <h3>{vaper.nombre}</h3>
            <p>Stock: {vaper.stock}</p>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Vender {selectedVaper?.nombre}</h3>
            <form onSubmit={handleSubmitVenta}>
              <div className="form-group">
                <label>Cantidad:</label>
                <input
                  type="number"
                  name="cantidad"
                  min="1"
                  max={selectedVaper.stock}
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
                <button type="submit">Confirmar Venta</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Vender;
