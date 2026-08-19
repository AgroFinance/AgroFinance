// Recordatorios funcionales diarios que Kapi muestra como apoyo a la agroexportadora.
// Rotan por día de la semana para que siempre haya una sugerencia accionable.

export interface Reminder {
  id: string
  text: string
  /** Ruta a la que lleva la acción del recordatorio */
  href?: string
  cta?: string
}

const WEEKLY: Reminder[][] = [
  // Domingo
  [
    { id: 'dom-1', text: 'Planifica la semana: revisa los envíos de aduana programados.', href: '/dashboard/', cta: 'Ver panel' },
  ],
  // Lunes
  [
    { id: 'lun-1', text: 'Sube el control de campo de la semana para mantener tu huella al día.', href: '/upload/', cta: 'Cargar datos' },
    { id: 'lun-2', text: 'Registra el inventario de almacén con un mensaje en el chat.', href: '/copilot/', cta: 'Registrar' },
  ],
  // Martes
  [
    { id: 'mar-1', text: 'Revisa tu Scope 3: el transporte marítimo suele ser el hotspot.', href: '/analisis/', cta: 'Ver análisis' },
  ],
  // Miércoles
  [
    { id: 'mie-1', text: 'Verifica el avance de cumplimiento (CSRD / EUDR / MINAM).', href: '/dashboard/', cta: 'Ver cumplimiento' },
  ],
  // Jueves
  [
    { id: 'jue-1', text: 'Actualiza los registros de packing y mermas de la jornada.', href: '/copilot/', cta: 'Registrar' },
  ],
  // Viernes
  [
    { id: 'vie-1', text: 'Genera el reporte HC Perú antes del cierre de semana.', href: '/dashboard/', cta: 'Exportar' },
  ],
  // Sábado
  [
    { id: 'sab-1', text: 'Compara intensidad por producto vs. el benchmark EU.', href: '/analisis/', cta: 'Comparar' },
  ],
]

/** Devuelve los recordatorios del día actual. */
export function getTodayReminders(date = new Date()): Reminder[] {
  return WEEKLY[date.getDay()] ?? []
}

const DONE_KEY = 'agrofinance_reminders_done'

function todayStamp(date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

/** Marca/desmarca un recordatorio como completado para el día de hoy (localStorage). */
export function toggleReminderDone(id: string): string[] {
  if (typeof window === 'undefined') return []
  const stamp = todayStamp()
  let store: Record<string, string[]> = {}
  try {
    store = JSON.parse(localStorage.getItem(DONE_KEY) || '{}')
  } catch {
    store = {}
  }
  const todays = new Set(store[stamp] || [])
  if (todays.has(id)) todays.delete(id)
  else todays.add(id)
  store = { [stamp]: Array.from(todays) } // solo guardamos el día de hoy
  localStorage.setItem(DONE_KEY, JSON.stringify(store))
  return store[stamp]
}

/** Lista de ids completados hoy. */
export function getDoneToday(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const store = JSON.parse(localStorage.getItem(DONE_KEY) || '{}')
    return store[todayStamp()] || []
  } catch {
    return []
  }
}
