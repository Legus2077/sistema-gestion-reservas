import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { PageLoader } from '../components/Spinner.jsx';
import { useToast } from '../components/Toast.jsx';

const emptyForm = {
  hotelName: '',
  hotelEmail: '',
  checkInTime: '15:00',
  checkOutTime: '11:00',
  cancellationDays: '3',
  maxStayNights: '30',
  policyText: '',
};

export default function AdminSettings() {
  const toast = useToast();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    api('/admin/settings')
      .then((data) => {
        if (cancelled) return;
        setForm({
          hotelName: data.settings.hotelName,
          hotelEmail: data.settings.hotelEmail,
          checkInTime: data.settings.checkInTime,
          checkOutTime: data.settings.checkOutTime,
          cancellationDays: String(data.settings.cancellationDays),
          maxStayNights: String(data.settings.maxStayNights),
          policyText: data.settings.policyText,
        });
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    try {
      await api('/admin/settings', {
        method: 'PUT',
        body: {
          ...form,
          cancellationDays: Number(form.cancellationDays),
          maxStayNights: Number(form.maxStayNights),
        },
      });
      toast('Configuración guardada.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoader label="Cargando configuración…" />;

  return (
    <div className="container page">
      <div className="section-head">
        <div>
          <p className="eyebrow">Administración</p>
          <h1>Configuración del hotel</h1>
          <p className="muted">
            Horarios, política de cancelación y datos de contacto.
          </p>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      <form className="card form-card settings-form" onSubmit={handleSubmit}>
        <section>
          <h2>Datos del hotel</h2>
          <div className="form-row">
            <label className="field">
              <span>Nombre</span>
              <input
                type="text"
                maxLength={120}
                value={form.hotelName}
                onChange={(event) => update('hotelName', event.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>Email de contacto</span>
              <input
                type="email"
                value={form.hotelEmail}
                onChange={(event) => update('hotelEmail', event.target.value)}
                required
              />
            </label>
          </div>
        </section>

        <section>
          <h2>Horarios</h2>
          <div className="form-row">
            <label className="field">
              <span>Check-in desde</span>
              <input
                type="time"
                value={form.checkInTime}
                onChange={(event) => update('checkInTime', event.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>Check-out hasta</span>
              <input
                type="time"
                value={form.checkOutTime}
                onChange={(event) => update('checkOutTime', event.target.value)}
                required
              />
            </label>
          </div>
        </section>

        <section>
          <h2>Política de reservas</h2>
          <div className="form-row">
            <label className="field">
              <span>Días mínimos para cancelar</span>
              <input
                type="number"
                min="0"
                max="60"
                value={form.cancellationDays}
                onChange={(event) => update('cancellationDays', event.target.value)}
                required
              />
              <small>
                El cliente puede cancelar solo si faltan <strong>más</strong> de estos días.
              </small>
            </label>
            <label className="field">
              <span>Máximo de noches por reserva</span>
              <input
                type="number"
                min="1"
                max="90"
                value={form.maxStayNights}
                onChange={(event) => update('maxStayNights', event.target.value)}
                required
              />
            </label>
          </div>

          <label className="field">
            <span>Texto de la política de cancelación</span>
            <textarea
              rows={5}
              maxLength={2000}
              value={form.policyText}
              onChange={(event) => update('policyText', event.target.value)}
              required
            />
            <small>Se muestra en el sitio y en los emails de confirmación.</small>
          </label>
        </section>

        <div className="notice">
          Los cambios de tarifa y política aplican a nuevas reservas. Las reservas existentes
          conservan el precio con el que fueron creadas.
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar configuración'}
        </button>
      </form>
    </div>
  );
}
