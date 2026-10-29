import { describe, expect, it } from 'vitest';
import { canCancel, validateStay } from '../../src/services/availability.js';
import {
  addDays,
  daysUntil,
  nightsBetween,
  overlaps,
  todayUTC,
} from '../../src/utils/dates.js';

const settings = { maxStayNights: 30 };

describe('overlaps (noches [check-in, check-out))', () => {
  it('no considera solapamiento cuando la salida coincide con la entrada', () => {
    expect(overlaps('2026-11-10', '2026-11-12', '2026-11-12', '2026-11-14')).toBe(false);
    expect(overlaps('2026-11-12', '2026-11-14', '2026-11-10', '2026-11-12')).toBe(false);
  });

  it('detecta solapamientos parciales', () => {
    expect(overlaps('2026-11-10', '2026-11-12', '2026-11-11', '2026-11-13')).toBe(true);
    expect(overlaps('2026-11-11', '2026-11-13', '2026-11-10', '2026-11-12')).toBe(true);
  });

  it('detecta rangos contenidos e idénticos', () => {
    expect(overlaps('2026-11-10', '2026-11-15', '2026-11-12', '2026-11-13')).toBe(true);
    expect(overlaps('2026-11-10', '2026-11-12', '2026-11-10', '2026-11-12')).toBe(true);
  });

  it('no considera solapamiento entre rangos disjuntos', () => {
    expect(overlaps('2026-11-10', '2026-11-12', '2026-11-13', '2026-11-15')).toBe(false);
    expect(overlaps('2026-11-20', '2026-11-22', '2026-11-10', '2026-11-12')).toBe(false);
  });
});

describe('cálculo de noches y días hasta el check-in', () => {
  it('cuenta noches de calendario', () => {
    expect(nightsBetween('2026-11-10', '2026-11-11')).toBe(1);
    expect(nightsBetween('2026-11-10', '2026-11-13')).toBe(3);
    expect(nightsBetween('2026-12-30', '2027-01-02')).toBe(3);
  });

  it('calcula días restantes contra una fecha de referencia', () => {
    expect(daysUntil('2026-11-10', '2026-11-07')).toBe(3);
    expect(daysUntil('2026-11-10', '2026-11-10')).toBe(0);
    expect(daysUntil('2026-11-10', '2026-11-12')).toBe(-2);
  });
});

describe('validateStay', () => {
  const today = '2026-11-01';

  it('acepta una estadía válida y devuelve noches y huéspedes', () => {
    expect(
      validateStay({
        checkIn: '2026-11-10',
        checkOut: '2026-11-13',
        guests: '2',
        settings,
        today,
      }),
    ).toEqual({ nights: 3, guests: 2 });
  });

  it('rechaza fechas pasadas, salida anterior y estadías demasiado largas', () => {
    expect(() =>
      validateStay({ checkIn: '2026-10-31', checkOut: '2026-11-02', guests: 1, settings, today }),
    ).toThrow(/anterior a hoy/);

    expect(() =>
      validateStay({ checkIn: '2026-11-10', checkOut: '2026-11-10', guests: 1, settings, today }),
    ).toThrow(/posterior/);

    expect(() =>
      validateStay({ checkIn: '2026-11-10', checkOut: '2027-01-10', guests: 1, settings, today }),
    ).toThrow(/30 noches/);
  });

  it('rechaza huéspedes fuera de rango', () => {
    expect(() =>
      validateStay({ checkIn: '2026-11-10', checkOut: '2026-11-11', guests: 0, settings, today }),
    ).toThrow(/huéspedes/);
    expect(() =>
      validateStay({ checkIn: '2026-11-10', checkOut: '2026-11-11', guests: 7, settings, today }),
    ).toThrow(/huéspedes/);
  });
});

describe('canCancel (política de X días)', () => {
  const base = {
    status: 'CONFIRMED',
    checkIn: '2026-11-10',
    cancellationDays: 3,
    today: '2026-11-01',
  };

  it('permite cancelar cuando faltan más días que el mínimo', () => {
    expect(canCancel({ ...base, checkIn: '2026-11-05' }).allowed).toBe(true);
    expect(canCancel({ ...base, checkIn: '2026-11-04', today: '2026-10-31' }).allowed).toBe(true);
  });

  it('no permite cancelar en el límite exacto ni con menos días', () => {
    const atLimit = canCancel({ ...base, checkIn: '2026-11-04' });
    expect(atLimit.allowed).toBe(false);
    expect(atLimit.reason).toMatch(/más de 3 días/);

    expect(canCancel({ ...base, checkIn: '2026-11-02' }).allowed).toBe(false);
    expect(canCancel({ ...base, checkIn: '2026-11-01' }).allowed).toBe(false);
  });

  it('no permite cancelar reservas en curso, completadas o canceladas', () => {
    for (const status of ['CHECKED_IN', 'COMPLETED', 'CANCELLED', 'NO_SHOW']) {
      expect(canCancel({ ...base, status }).allowed).toBe(false);
    }
  });

  it('permite a recepción cancelar fuera de la política', () => {
    expect(canCancel({ ...base, checkIn: '2026-11-01', isStaff: true }).allowed).toBe(true);
  });

  it('usa la fecha actual por defecto', () => {
    const checkIn = todayUTC();
    expect(canCancel({ ...base, checkIn, today: undefined }).allowed).toBe(false);
  });
});
