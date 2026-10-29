import nodemailer from 'nodemailer';
import { config } from './config.js';
import { formatDateAR } from './utils/dates.js';

/** Buzón en memoria para los tests de integración. */
export const outbox = [];

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth:
        config.smtp.user && config.smtp.pass
          ? { user: config.smtp.user, pass: config.smtp.pass }
          : undefined,
    });
  }
  return transporter;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function formatMoney(value, currency = config.currency) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function buildEmail({ type, reservation, settings }) {
  const isCancellation = type === 'cancellation';
  const hotel = settings.hotelName;
  const subject = isCancellation
    ? `Reserva cancelada · ${reservation.code} · ${hotel}`
    : `Reserva confirmada · ${reservation.code} · ${hotel}`;

  const intro = isCancellation
    ? `Hola ${reservation.guestName}, tu reserva fue cancelada.`
    : `Hola ${reservation.guestName}, tu reserva está confirmada.`;

  const rows = [
    ['Código', reservation.code],
    ['Habitación', `${reservation.roomNumber} · ${reservation.roomType}`],
    ['Check-in', `${formatDateAR(reservation.checkIn)} (desde las ${settings.checkInTime})`],
    ['Check-out', `${formatDateAR(reservation.checkOut)} (hasta las ${settings.checkOutTime})`],
    ['Noches', String(reservation.nights)],
    ['Huéspedes', String(reservation.guests)],
    ['Total', formatMoney(reservation.totalPrice, settings.currency)],
  ];

  const text = [
    intro,
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    `Política de cancelación: ${settings.policyText}`,
    '',
    hotel,
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2a24;">
      <h2 style="margin-bottom: 4px;">${escapeHtml(hotel)}</h2>
      <p style="margin-top: 0; color: #5b6b62;">${escapeHtml(intro)}</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        ${rows
          .map(
            ([label, value]) => `
          <tr>
            <td style="padding: 8px 0; color: #5b6b62; border-bottom: 1px solid #ece7df;">${escapeHtml(label)}</td>
            <td style="padding: 8px 0; text-align: right; border-bottom: 1px solid #ece7df;">${escapeHtml(value)}</td>
          </tr>`,
          )
          .join('')}
      </table>
      <p style="font-size: 13px; color: #5b6b62;">Política de cancelación: ${escapeHtml(settings.policyText)}</p>
      <p style="font-size: 13px; color: #5b6b62;">Ante cualquier consulta escribinos a ${escapeHtml(settings.hotelEmail)}.</p>
    </div>
  `;

  return { subject, text, html };
}

export async function sendReservationEmail({ type, reservation, settings }) {
  const email = buildEmail({ type, reservation, settings });
  const payload = {
    from: config.mailFrom,
    to: reservation.guestEmail,
    subject: email.subject,
    text: email.text,
    html: email.html,
  };

  if (config.mailMode === 'test') {
    outbox.push(payload);
    return payload;
  }

  if (config.mailMode === 'console') {
    console.log('\n================ EMAIL (modo consola) ================');
    console.log(`Para:   ${payload.to}`);
    console.log(`Asunto: ${payload.subject}`);
    console.log('------------------------------------------------------');
    console.log(email.text);
    console.log('======================================================\n');
    return payload;
  }

  return getTransporter().sendMail(payload);
}
