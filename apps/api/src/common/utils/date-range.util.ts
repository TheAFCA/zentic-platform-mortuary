export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Calcula el inicio/fin (UTC) del día "de hoy" según la zona horaria del tenant.
 * Simplificación aceptada (RN-ADMIN-004 sólo exige que el dashboard use la timezone del
 * tenant como fuente de verdad para este cálculo puntual, no una conversión global de fechas):
 * usa el offset vigente en el instante `now`, sin recalcularlo si un cambio de DST cae
 * dentro del propio día.
 */
export function getTenantDayBoundsUtc(
  timezone: string,
  now: Date = new Date(),
): DateRange {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
    .formatToParts(now)
    .reduce<Record<string, string>>((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});

  const hour = parts.hour === '24' ? '00' : parts.hour;
  const zonedNowAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(hour),
    Number(parts.minute),
    Number(parts.second),
  );
  const offsetMs = zonedNowAsUtc - now.getTime();

  const zonedMidnightAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    0,
    0,
    0,
  );
  const start = new Date(zonedMidnightAsUtc - offsetMs);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

/** Rango UTC [inicio, fin) del mes calendario actual + `monthsAgo` meses (0 = mes actual, -1 = mes anterior). */
export function getMonthBoundsUtc(
  monthsAgo = 0,
  now: Date = new Date(),
): DateRange {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthsAgo, 1),
  );
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthsAgo + 1, 1),
  );
  return { start, end };
}
