'use client'

// ============================================================
// Cronograma funcional de seguimiento (Kapi)
// ------------------------------------------------------------
// Se activa al cerrar la evaluación. Convierte los hitos del
// motor ("Día 1–3", "Día 7"…) en FECHAS REALES desde hoy,
// calcula la cuenta regresiva al próximo hito, permite marcar
// avances (persistidos en localStorage por nivel) y muestra el
// progreso. Es el acompañamiento automatizado: Kapi recuerda
// cada hito antes de su fecha.
// ============================================================

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarClock, CheckCircle2, Circle, Bell, AlertTriangle, RotateCcw, Flag } from 'lucide-react'

interface Paso {
  dia: string
  hito: string
}

interface CronogramaProps {
  pasos: Paso[]
  nivel: string
  color: string
  siguienteNivel: string
  // Identificador del análisis: cambia en cada nueva subida de data,
  // de modo que el cronograma se autogenera limpio cada vez.
  instanceKey?: string
}

const DIA_MS = 86_400_000

// Extrae el offset en días de etiquetas tipo "Día 1–3" / "Día 7"
// (usa el mayor número = fecha límite del rango).
function offsetDias(dia: string): number {
  const nums = (dia.match(/\d+/g) || ['7']).map(Number)
  return Math.max(...nums)
}

function fmtFecha(d: Date): string {
  const s = d.toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: 'short' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

type Estado = 'completado' | 'proximo' | 'pendiente' | 'vencido'

export default function Cronograma({ pasos, nivel, color, siguienteNivel, instanceKey }: CronogramaProps) {
  const storageKey = `agrofinance_cronograma_${nivel}_${instanceKey ?? 'default'}`

  // Fecha base estable (montaje). Cada hito = base + offset.
  const base = useMemo(() => Date.now(), [])
  const items = useMemo(
    () =>
      pasos.map((p, i) => {
        const off = offsetDias(p.dia)
        return { i, ...p, off, fecha: new Date(base + off * DIA_MS) }
      }),
    [pasos, base]
  )

  const [hechos, setHechos] = useState<Set<number>>(new Set())
  const [cargado, setCargado] = useState(false)

  // Cargar avances persistidos (solo cliente)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) setHechos(new Set(JSON.parse(raw) as number[]))
    } catch {}
    setCargado(true)
  }, [storageKey])

  // Guardar cuando cambian
  useEffect(() => {
    if (!cargado) return
    try {
      localStorage.setItem(storageKey, JSON.stringify([...hechos]))
    } catch {}
  }, [hechos, cargado, storageKey])

  const toggle = (i: number) =>
    setHechos((prev) => {
      const n = new Set(prev)
      n.has(i) ? n.delete(i) : n.add(i)
      return n
    })

  const reiniciar = () => setHechos(new Set())

  // Próximo hito = el incompleto con fecha más cercana
  const proximoIdx = items
    .filter((it) => !hechos.has(it.i))
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime())[0]?.i

  const estadoDe = (it: (typeof items)[number]): Estado => {
    if (hechos.has(it.i)) return 'completado'
    if (it.i === proximoIdx) return 'proximo'
    if (it.fecha.getTime() < Date.now()) return 'vencido'
    return 'pendiente'
  }

  const completados = hechos.size
  const total = items.length
  const pct = Math.round((completados / total) * 100)
  const todoListo = completados === total

  const proximo = items.find((it) => it.i === proximoIdx)
  const diasRestantes = proximo
    ? Math.ceil((proximo.fecha.getTime() - Date.now()) / DIA_MS)
    : 0

  return (
    <div className="rounded-2xl p-4 mb-2" style={{ background: `${color}0d`, border: `1px solid ${color}33` }}>
      {/* Encabezado */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-start gap-2">
          <CalendarClock className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color }} />
          <div>
            <div className="text-xs font-bold flex items-center gap-2" style={{ color }}>
              Cronograma de seguimiento
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: `${color}1f` }}>
                {completados}/{total}
              </span>
            </div>
            <p className="text-xs text-[rgba(80,108,92,0.7)] leading-relaxed">{siguienteNivel}</p>
          </div>
        </div>
        {completados > 0 && (
          <button onClick={reiniciar} title="Reiniciar seguimiento"
            className="flex items-center gap-1 text-[10px] text-[rgba(80,108,92,0.45)] hover:text-[rgba(80,108,92,0.8)] transition-colors flex-shrink-0">
            <RotateCcw className="w-3 h-3" /> Reiniciar
          </button>
        )}
      </div>

      {/* Barra de progreso */}
      <div className="h-1.5 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden mb-3">
        <motion.div className="h-full rounded-full" style={{ background: color }}
          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }} />
      </div>

      {/* Banner próximo hito / completado */}
      {todoListo ? (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl" style={{ background: `${color}14` }}>
          <Flag className="w-3.5 h-3.5" style={{ color }} />
          <span className="text-xs font-semibold" style={{ color }}>¡Completaste todos los hitos hacia el siguiente nivel! 🎉</span>
        </div>
      ) : proximo ? (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-[rgba(255,255,255,0.04)]">
          <Bell className="w-3.5 h-3.5" style={{ color }} />
          <span className="text-xs text-[rgba(80,108,92,0.8)]">
            Kapi te recordará tu próximo hito:{' '}
            <strong className="text-[#13301F]">
              {diasRestantes <= 0 ? 'hoy' : `en ${diasRestantes} día${diasRestantes === 1 ? '' : 's'}`}
            </strong>{' '}
            ({fmtFecha(proximo.fecha)})
          </span>
        </div>
      ) : null}

      {/* Línea de tiempo */}
      <div className="relative pl-1">
        {items.map((it, idx) => {
          const estado = estadoDe(it)
          const last = idx === items.length - 1
          return (
            <div key={it.i} className="relative flex gap-3 pb-3 last:pb-0">
              {/* Conector */}
              {!last && <span className="absolute left-[9px] top-5 bottom-0 w-px" style={{ background: `${color}26` }} />}

              {/* Check / estado */}
              <button onClick={() => toggle(it.i)} className="relative z-10 flex-shrink-0 mt-0.5" title={estado === 'completado' ? 'Marcar como pendiente' : 'Marcar como completado'}>
                {estado === 'completado'
                  ? <CheckCircle2 className="w-[19px] h-[19px]" style={{ color }} />
                  : estado === 'vencido'
                  ? <AlertTriangle className="w-[19px] h-[19px] text-[#D2A24A]" />
                  : <Circle className="w-[19px] h-[19px]" style={{ color: estado === 'proximo' ? color : 'rgba(80,108,92,0.35)' }} />}
              </button>

              {/* Contenido */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold" style={{ color: estado === 'completado' ? 'rgba(80,108,92,0.45)' : color }}>
                    {fmtFecha(it.fecha)}
                  </span>
                  {estado === 'proximo' && (
                    <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full" style={{ background: `${color}1f`, color }}>Próximo</span>
                  )}
                  {estado === 'vencido' && (
                    <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-[rgba(210,145,47,0.15)] text-[#D2A24A]">Vencido</span>
                  )}
                </div>
                <p className={`text-xs leading-relaxed ${estado === 'completado' ? 'text-[rgba(80,108,92,0.4)] line-through' : 'text-[rgba(80,108,92,0.8)]'}`}>
                  {it.hito}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
