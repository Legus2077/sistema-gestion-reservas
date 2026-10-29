import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import Modal from '../components/Modal.jsx';
import { PageLoader } from '../components/Spinner.jsx';
import { useToast } from '../components/Toast.jsx';
import { formatMoney } from '../utils.js';

const emptyForm = {
  number: '',
  type: 'Doble',
  capacity: '2',
  pricePerNight: '',
  active: true,
};

export default function AdminRooms() {
  const toast = useToast();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadRooms = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/admin/rooms');
      setRooms(data.rooms);
      setError(null);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(room) {
    setEditing(room);
    setForm({
      number: room.number,
      type: room.type,
      capacity: String(room.capacity),
      pricePerNight: String(room.pricePerNight),
      active: room.active,
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSave(event) {
    event.preventDefault();
    setFormError(null);
    setSaving(true);

    const body = {
      number: form.number,
      type: form.type,
      capacity: Number(form.capacity),
      pricePerNight: Number(form.pricePerNight),
      active: form.active,
    };

    try {
      if (editing) {
        await api(`/admin/rooms/${editing.id}`, { method: 'PATCH', body });
        toast('Habitación actualizada.');
      } else {
        await api('/admin/rooms', { method: 'POST', body });
        toast('Habitación creada.');
      }
      setModalOpen(false);
      await loadRooms();
    } catch (requestError) {
      setFormError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(room) {
    try {
      await api(`/admin/rooms/${room.id}`, {
        method: 'PATCH',
        body: { active: !room.active },
      });
      toast(room.active ? 'Habitación desactivada.' : 'Habitación activada.');
      await loadRooms();
    } catch (requestError) {
      toast(requestError.message, 'error');
    }
  }

  async function removeRoom(room) {
    if (
      !window.confirm(
        `¿Eliminar la habitación ${room.number}? Si tiene reservas, el sistema no lo permitirá.`,
      )
    ) {
      return;
    }

    try {
      await api(`/admin/rooms/${room.id}`, { method: 'DELETE' });
      toast('Habitación eliminada.');
      await loadRooms();
    } catch (requestError) {
      toast(requestError.message, 'error');
    }
  }

  return (
    <div className="container page">
      <div className="section-head">
        <div>
          <p className="eyebrow">Administración</p>
          <h1>Habitaciones y tarifas</h1>
          <p className="muted">La tarifa se usa para calcular nuevas reservas.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          + Nueva habitación
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}

      {loading ? (
        <PageLoader label="Cargando habitaciones…" />
      ) : rooms.length === 0 ? (
        <div className="empty-state">
          <h3>No hay habitaciones cargadas</h3>
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            Crear la primera
          </button>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Número</th>
                <th>Tipo</th>
                <th>Capacidad</th>
                <th>Tarifa / noche</th>
                <th>Estado</th>
                <th className="align-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.id}>
                  <td>
                    <strong>{room.number}</strong>
                  </td>
                  <td>{room.type}</td>
                  <td>
                    {room.capacity} {room.capacity === 1 ? 'huésped' : 'huéspedes'}
                  </td>
                  <td>{formatMoney(room.pricePerNight)}</td>
                  <td>
                    <span className={`badge ${room.active ? 'badge-confirmed' : 'badge-cancelled'}`}>
                      {room.active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => openEdit(room)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => toggleActive(room)}
                      >
                        {room.active ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => removeRoom(room)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Editar habitación ${editing.number}` : 'Nueva habitación'}
      >
        <form className="form" onSubmit={handleSave}>
          {formError && <div className="alert error">{formError}</div>}

          <div className="form-row">
            <label className="field">
              <span>Número</span>
              <input
                type="text"
                maxLength={10}
                value={form.number}
                onChange={(event) =>
                  setForm((current) => ({ ...current, number: event.target.value }))
                }
                required
              />
            </label>
            <label className="field">
              <span>Tipo</span>
              <input
                type="text"
                maxLength={60}
                value={form.type}
                onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
                required
              />
            </label>
          </div>

          <div className="form-row">
            <label className="field">
              <span>Capacidad máxima</span>
              <select
                value={form.capacity}
                onChange={(event) =>
                  setForm((current) => ({ ...current, capacity: event.target.value }))
                }
              >
                {[1, 2, 3, 4, 5, 6].map((capacity) => (
                  <option key={capacity} value={capacity}>
                    {capacity} {capacity === 1 ? 'huésped' : 'huéspedes'}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Precio por noche</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.pricePerNight}
                onChange={(event) =>
                  setForm((current) => ({ ...current, pricePerNight: event.target.value }))
                }
                required
              />
            </label>
          </div>

          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) =>
                setForm((current) => ({ ...current, active: event.target.checked }))
              }
            />
            <span>Habitación activa (visible en las búsquedas)</span>
          </label>

          <div className="modal-inline-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
