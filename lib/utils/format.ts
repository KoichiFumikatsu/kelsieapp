const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/** Format number as COP: $95.000 */
export function formatCOP(amount: number): string {
  return COP.format(amount)
}

const DATE_SHORT = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
})

const DATE_FULL = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const DATE_WEEKDAY = new Intl.DateTimeFormat('es-CO', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

/** "15 mar" */
export function formatDateShort(date: string | Date): string {
  return DATE_SHORT.format(typeof date === 'string' ? new Date(date + 'T12:00:00') : date)
}

/** "15 de marzo de 2026" */
export function formatDateFull(date: string | Date): string {
  return DATE_FULL.format(typeof date === 'string' ? new Date(date + 'T12:00:00') : date)
}

/** "sáb 15 mar" */
export function formatDateWeekday(date: string | Date): string {
  return DATE_WEEKDAY.format(typeof date === 'string' ? new Date(date + 'T12:00:00') : date)
}

/** Period label: "1 mar – 15 mar" */
export function formatPeriod(start: string, end: string): string {
  return `${formatDateShort(start)} – ${formatDateShort(end)}`
}
