import { useState, useEffect } from 'react';
import '../styles/Comprar.css';

function Comprar() {
  const [vapers, setVapers] = useState([]);
  const [selectedVaper, setSelectedVaper] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    cantidad: 1,
    precio_unitario: '',
    total: 0,
  });

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
    const parsedValue = value === '' ? '' : (name === 'cantidad' ? parseInt(value) : parseFloat(value));

    const updatedForm = {
      ...form,
      [name]: parsedValue,
    };

    const cantidad = name === 'cantidad' ? parsedValue : form.cantidad;
    const precio_unitario = name === 'precio_unitario' ? parsedValue : form.precio_unitario;

    if (!isNaN(cantidad) && !isNaN(precio_unitario)) {
      updatedForm.total = (precio_unitario * cantidad).toFixed(2);
    } else {
      updatedForm.total = 0;
    }

    setForm(updatedForm);
  };

  const handleSubmitCompra = async (e) => {
    e.preventDefault();

    const precioUnitarioParsed = parseFloat(form.precio_unitario);

    if (
      selectedVaper === null ||
      form.cantidad <= 0 ||
      isNaN(precioUnitarioParsed) ||
      precioUnitarioParsed <= 0
    ) {
      alert('Debes ingresar una cantidad y un precio unitario válidos.');
      return;
    }

    try {
      const res = await fetch('https://api-vapers.onrender.com/compras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_vaper: selectedVaper.id,
          cantidad: form.cantidad,
          precio_unitario: precioUnitarioParsed,
          total: parseFloat((precioUnitarioParsed * form.cantidad).toFixed(2)),
          fecha: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error al registrar la compra');
      }

      alert('Compra registrada correctamente');

      await fetch(`https://api-vapers.onrender.com/${selectedVaper.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stock: selectedVaper.stock + form.cantidad,
        }),
      });

      const updatedRes = await fetch('https://api-vapers.onrender.com/');
      const updatedVapers = await updatedRes.json();
      setVapers(updatedVapers);

      setShowModal(false);
    } catch (error) {
      console.error('Error al registrar compra:', error);
      alert('Ocurrió un error: ' + error.message);
    }
  };

  return (
    <div className="comprar-container">
      <h2>Comprar Vapers</h2>

      <div className="vaper-grid">
        {vapers.map((vaper) => (
          <div
            key={vaper.id}
            className="vaper-card"
            onClick={() => {
              setSelectedVaper(vaper);
              setForm({
                cantidad: 1,
                precio_unitario: '',
                total: 0,
              });
              setShowModal(true);
            }}
          >
            <img src={vaper.imagen || 'https://via.placeholder.com/150'} alt={vaper.nombre} />
            <h3>{vaper.nombre}</h3>
            <p>Stock: {vaper.stock}</p>
          </div>
        ))}
      </div>

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
                <input type="text" value={form.total} readOnly />
              </div>

              <div className="modal-buttons">
                <button type="button" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
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
