'use client'

// ============================================================
// Depuración de líneas leídas — qué entró, qué se descartó y por qué
// ------------------------------------------------------------
// El reclamo detrás de esta pantalla es de confianza: "me dice un número
// pero no sé de dónde salió ni qué se comió". Aquí se abre la caja:
//
//   · Resumen primero (N leídas, M ignoradas, total). El detalle denso
//     queda plegado hasta que alguien pida verlo.
//   · Cada línea muestra su campo, valor, unidad, scope, factor CON VERSIÓN
//     y la emisión resultante.
//   · Las descartadas tienen su motivo escrito, incluidas las celdas de
//     hojas ocultas del libro.
//   · El mapeo se puede corregir a mano y confirmar; el valor que asignó la
//     máquina queda registrado para la auditoría y la corrección se puede
//     deshacer antes de confirmar.
// ============================================================

import { useMemo, useState } from 'react'
import {
  ChevronDown, ChevronRight, CheckCircle2, EyeOff, Undo2, ShieldCheck, AlertCircle,
} from 'lucide-react'
import {
  CATALOGO_FACTORES, reasignarFactor, revertirLinea, resumirLineas,
  type ClaveFactor, type LineaClasificada,
} from '@/lib/ghgClassify'

const fmt = (n: number, d = 2) => n.toLocaleString('es-PE', { minimumFractionDigits: d, maximumFractionDigits: d })

type Props = {
  lineas: LineaClasificada[]
  onCambio: (lineas: LineaClasificada[]) => void
  /** Contexto para el encabezado (nombre del archivo o del comprobante). */
  titulo?: string
}

export default function DepuracionLineas({ lineas, onCambio, titulo }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [ignoradasAbiertas, setIgnoradasAbiertas] = useState(false)

  const resumen = useMemo(() => resumirLineas(lineas), [lineas])
  const leidas = useMemo(() => lineas.filter((l) => l.estado === 'leido'), [lineas])
  const ignoradas = useMemo(() => lineas.filter((l) => l.estado === 'ignorado'), [lineas])

  const actualizar = (id: string, fn: (l: LineaClasificada) => LineaClasificada) =>
    onCambio(lineas.map((l) => (l.id === id ? fn(l) : l)))

  return (
    <div className="rounded-2xl border border-[rgba(90,190,145,0.18)] bg-white overflow-hidden">
      {/* --- Resumen siempre visible --- */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 bg-[rgba(244,246,242,0.7)] border-b border-[rgba(90,190,145,0.12)]">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-widest text-[rgba(80,108,92,0.5)]">Líneas leídas</span>
            <span className="text-lg font-black text-[#13301F]">{resumen.leidas}</span>
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-widest text-[rgba(80,108,92,0.5)]">Ignoradas</span>
            <span className="text-lg font-black text-[#13301F]">{resumen.ignoradas}</span>
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-widest text-[rgba(80,108,92,0.5)]">Emisión calculada</span>
            <span className="text-lg font-black text-[#137C53]">{fmt(resumen.emisionTon, 3)} <span className="text-xs font-bold text-[rgba(80,108,92,0.5)]">tCO₂e</span></span>
          </div>
        </div>
        <button
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[rgba(90,190,145,0.3)] text-[#137C53] text-xs font-bold hover:bg-[rgba(90,190,145,0.08)] focus:outline-none focus:ring-2 focus:ring-[#137C53] focus:ring-offset-1 transition-all"
        >
          {abierto ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          {abierto ? 'Ocultar depuración' : 'Ver depuración'}
        </button>
      </div>

      {abierto && (
        <div className="p-5 space-y-5">
          {titulo && <p className="text-xs text-[rgba(80,108,92,0.6)]">Origen: <strong className="text-[#13301F]">{titulo}</strong></p>}

          {/* --- Detalle línea a línea --- */}
          <div className="overflow-x-auto rounded-xl border border-[rgba(90,190,145,0.14)]">
            <table className="w-full text-xs min-w-[900px]">
              <thead>
                <tr className="bg-[rgba(244,246,242,0.95)] text-left text-[10px] uppercase tracking-wide text-[rgba(80,108,92,0.55)]">
                  <th className="px-3 py-2.5 font-semibold">Campo leído</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Valor</th>
                  <th className="px-3 py-2.5 font-semibold">Unidad</th>
                  <th className="px-3 py-2.5 font-semibold">Alcance</th>
                  <th className="px-3 py-2.5 font-semibold">Factor aplicado (versión)</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Emisión</th>
                  <th className="px-3 py-2.5 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {leidas.map((l) => (
                  <tr key={l.id} className="border-t border-[rgba(90,190,145,0.08)] align-top">
                    <td className="px-3 py-2.5 font-semibold text-[#13301F] max-w-[220px]">
                      {l.campoLeido}
                      <span className="block text-[10px] font-normal text-[rgba(80,108,92,0.5)]">{l.hoja} · fila {l.fila}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-[rgba(80,108,92,0.85)] whitespace-nowrap">{l.valor?.toLocaleString('es-PE')}</td>
                    <td className="px-3 py-2.5 text-[rgba(80,108,92,0.7)]">{l.unidad || '—'}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[rgba(90,190,145,0.12)] text-[#137C53] border border-[rgba(90,190,145,0.25)]">
                        Scope {l.scopeAsignado}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <label className="sr-only" htmlFor={`factor-${l.id}`}>Factor de emisión para {l.campoLeido}</label>
                      <select
                        id={`factor-${l.id}`}
                        value={l.factorAsignado ?? ''}
                        onChange={(e) => actualizar(l.id, (x) => reasignarFactor(x, e.target.value as ClaveFactor))}
                        className="w-full max-w-[260px] px-2 py-1 rounded-lg border border-[rgba(90,190,145,0.25)] bg-white text-[11px] focus:outline-none focus:border-[#137C53] focus:ring-1 focus:ring-[#137C53]"
                      >
                        {CATALOGO_FACTORES.map((f) => (
                          <option key={f.clave} value={f.clave}>{f.label} — {f.valor} {f.unidad}</option>
                        ))}
                      </select>
                      <span className="block mt-0.5 text-[10px] text-[rgba(80,108,92,0.55)]">{l.factorVersion}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-[#137C53] whitespace-nowrap">
                      {l.emisionKg === null ? 'sin dato' : `${fmt(l.emisionKg / 1000, 3)} t`}
                      {l.corregido && l.original.emisionKg !== null && (
                        <span className="block text-[10px] font-normal text-[rgba(80,108,92,0.5)] line-through">
                          {fmt(l.original.emisionKg / 1000, 3)} t
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {l.confirmado ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[rgba(90,190,145,0.15)] text-[#137C53] border border-[rgba(90,190,145,0.35)]">
                          <ShieldCheck className="w-3 h-3" /> Validado
                        </span>
                      ) : l.corregido ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => actualizar(l.id, (x) => ({ ...x, confirmado: true }))}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#13301F] text-white hover:bg-[#0E2418] transition-colors"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Confirmar mapeo
                          </button>
                          <button
                            onClick={() => actualizar(l.id, revertirLinea)}
                            aria-label={`Deshacer corrección de ${l.campoLeido}`}
                            title="Deshacer corrección"
                            className="p-1 rounded-md text-[rgba(80,108,92,0.55)] hover:text-[#13301F] hover:bg-[rgba(90,190,145,0.1)] transition-colors"
                          >
                            <Undo2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => actualizar(l.id, (x) => ({ ...x, confirmado: true }))}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border border-[rgba(90,190,145,0.3)] text-[rgba(80,108,92,0.8)] hover:bg-[rgba(90,190,145,0.08)] transition-colors"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Confirmar mapeo
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* --- Ignoradas, plegadas --- */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 overflow-hidden">
            <button
              onClick={() => setIgnoradasAbiertas((v) => !v)}
              aria-expanded={ignoradasAbiertas}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-left focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {ignoradasAbiertas ? <ChevronDown className="w-4 h-4 text-amber-700" /> : <ChevronRight className="w-4 h-4 text-amber-700" />}
              <EyeOff className="w-4 h-4 text-amber-700" />
              <span className="text-xs font-bold text-amber-900">
                {ignoradas.length} línea(s) descartadas — ver por qué no entraron al cálculo
              </span>
            </button>
            {ignoradasAbiertas && (
              <ul className="divide-y divide-amber-200/70 border-t border-amber-200">
                {ignoradas.length === 0 && (
                  <li className="px-4 py-3 text-xs text-amber-800">Todas las líneas del archivo se pudieron clasificar.</li>
                )}
                {ignoradas.map((l) => (
                  <li key={l.id} className="px-4 py-2.5 flex items-start gap-2.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-amber-900">
                        {l.campoLeido}
                        {l.valor !== null && <span className="font-normal"> · {l.valor.toLocaleString('es-PE')} {l.unidad}</span>}
                        {l.oculto && <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-200 text-amber-900 uppercase">Oculta</span>}
                      </p>
                      <p className="text-[11px] text-amber-800/90">{l.motivoIgnorado} · {l.hoja} fila {l.fila}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="text-[11px] text-[rgba(80,108,92,0.55)] leading-relaxed">
            Corregir el mapeo no toca tu archivo original y el valor que asignó la plataforma queda registrado: la
            columna de emisión muestra tachado el número anterior cuando hay corrección.
          </p>
        </div>
      )}
    </div>
  )
}
