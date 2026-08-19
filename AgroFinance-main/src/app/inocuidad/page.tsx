'use client'

// ============================================================
// Preparación para auditorías de inocuidad y sistema
// ------------------------------------------------------------
// Responde a "tenemos 2 horas para recopilar los papeles cuando cae la
// auditoría", no a "califícame el cumplimiento" — que sería inventar un
// número que ningún certificador reconoce.
// ============================================================

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ShieldCheck, Info, CheckCircle2, Clock, MinusCircle, AlertTriangle, Sparkles,
} from 'lucide-react'
import DashboardShell from '@/components/layout/DashboardShell'
import {
  useInocuidad, resumirTodos, declaracionDe, estaVencido,
  REQUISITOS, ESQUEMAS_LISTA, ESTADO_REQ_LABEL, NOTA_INOCUIDAD,
  type EsquemaId, type EstadoRequisito,
} from '@/lib/engine/inocuidad'

const ESTADOS: EstadoRequisito[] = ['pendiente', 'en-proceso', 'listo', 'no-aplica']

const COLOR_ESTADO: Record<EstadoRequisito, string> = {
  listo: 'text-[#137C53]',
  'en-proceso': 'text-[#B8862B]',
  'no-aplica': 'text-[rgba(80,108,92,0.45)]',
  pendiente: 'text-[rgba(80,108,92,0.6)]',
}

function IconoEstado({ estado, vencido }: { estado: EstadoRequisito; vencido: boolean }) {
  if (vencido) return <AlertTriangle className="w-4 h-4 text-[#A33] flex-shrink-0 mt-0.5" />
  if (estado === 'listo') return <CheckCircle2 className="w-4 h-4 text-[#137C53] flex-shrink-0 mt-0.5" />
  if (estado === 'en-proceso') return <Clock className="w-4 h-4 text-[#B8862B] flex-shrink-0 mt-0.5" />
  return <MinusCircle className="w-4 h-4 text-[rgba(80,108,92,0.35)] flex-shrink-0 mt-0.5" />
}

export default function InocuidadPage() {
  const { estado, declarar } = useInocuidad()
  const [filtro, setFiltro] = useState<EsquemaId | 'todos'>('todos')

  const resumenes = useMemo(() => resumirTodos(estado), [estado])

  const visibles = useMemo(
    () => (filtro === 'todos' ? REQUISITOS : REQUISITOS.filter((r) => r.esquemas.includes(filtro))),
    [filtro],
  )

  const vencidosTotal = useMemo(
    () => REQUISITOS.filter((r) => estaVencido(declaracionDe(estado, r.id))).length,
    [estado],
  )

  const campo = 'px-2.5 py-1.5 rounded-lg border border-[rgba(90,190,145,0.28)] text-xs text-[#13301F] bg-white focus:outline-none focus:ring-2 focus:ring-[#137C53]/35'

  return (
    <DashboardShell>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-[#13301F] tracking-tight flex items-center gap-2.5">
          <ShieldCheck className="w-7 h-7 text-[#137C53]" /> Preparación para auditorías
        </h1>
        <p className="text-sm text-[rgba(80,108,92,0.6)] mt-1 max-w-2xl">
          ISO 22000, FSSC 22000, BRC, BASC y SMETA. Ten la evidencia ubicada antes de que llegue el auditor,
          en vez de reunirla contra reloj el mismo día.
        </p>
      </motion.div>

      {/* Aviso de alcance — va arriba a propósito */}
      <div className="flex items-start gap-3 rounded-2xl border border-[rgba(210,162,74,0.3)] bg-[rgba(210,162,74,0.08)] p-4 mb-6">
        <Info className="w-4 h-4 text-[#8C5F14] flex-shrink-0 mt-0.5" />
        <p className="text-xs text-[#8C5F14] leading-relaxed">{NOTA_INOCUIDAD}</p>
      </div>

      {vencidosTotal > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-[rgba(200,80,80,0.28)] bg-[rgba(200,80,80,0.07)] p-4 mb-6">
          <AlertTriangle className="w-4 h-4 text-[#A33] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[#A33]">
            <strong>{vencidosTotal}</strong>{' '}
            {vencidosTotal === 1 ? 'evidencia venció' : 'evidencias vencieron'}. Una evidencia vencida cuenta
            como no conforme en auditoría, aunque el documento exista.
          </p>
        </div>
      )}

      {/* ===== Estado por esquema ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {resumenes.map((r) => (
          <button
            key={r.esquema.id}
            onClick={() => setFiltro(filtro === r.esquema.id ? 'todos' : r.esquema.id)}
            aria-pressed={filtro === r.esquema.id}
            className={`text-left bg-white rounded-3xl border shadow-sm p-5 transition-all ${
              filtro === r.esquema.id
                ? 'border-[#137C53] ring-2 ring-[#137C53]/20'
                : 'border-[rgba(90,190,145,0.15)] hover:border-[rgba(90,190,145,0.4)]'
            }`}
          >
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <span className="text-sm font-black text-[#13301F]">{r.esquema.nombre}</span>
              <span className="text-lg font-black text-[#137C53]">{r.pctListo}%</span>
            </div>
            <div className="h-2 rounded-full bg-[rgba(90,190,145,0.14)] overflow-hidden mb-2">
              <div
                className="h-full rounded-full"
                style={{ width: `${r.pctListo}%`, background: 'linear-gradient(90deg, #2BA470, #137C53)' }}
              />
            </div>
            <p className="text-[11px] text-[rgba(80,108,92,0.65)] leading-snug">
              {r.listos} lista{r.listos === 1 ? '' : 's'} · {r.enProceso} en curso · {r.pendientes} sin evidencia
              {r.vencidos > 0 && <span className="text-[#A33] font-bold"> · {r.vencidos} vencida{r.vencidos === 1 ? '' : 's'}</span>}
            </p>
            <p className="text-[10px] text-[rgba(80,108,92,0.5)] mt-1.5 leading-snug">{r.esquema.alcance}</p>
          </button>
        ))}
      </div>

      {/* ===== Requisitos ===== */}
      <div className="bg-white rounded-3xl border border-[rgba(90,190,145,0.15)] shadow-sm p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-base font-bold text-[#13301F]">
            Evidencia requerida
            {filtro !== 'todos' && (
              <span className="ml-2 text-xs font-semibold text-[#137C53]">
                · filtrado por {ESQUEMAS_LISTA.find((e) => e.id === filtro)?.nombre}
              </span>
            )}
          </h2>
          {filtro !== 'todos' && (
            <button onClick={() => setFiltro('todos')} className="text-xs font-bold text-[#137C53] underline">
              Ver todos
            </button>
          )}
        </div>

        <div className="space-y-3">
          {visibles.map((r) => {
            const d = declaracionDe(estado, r.id)
            const vencido = estaVencido(d)
            return (
              <div
                key={r.id}
                className={`rounded-2xl border p-4 ${
                  vencido ? 'border-[rgba(200,80,80,0.3)] bg-[rgba(200,80,80,0.04)]' : 'border-[rgba(90,190,145,0.18)]'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <IconoEstado estado={d.estado} vencido={vencido} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#13301F] leading-tight">
                      {r.titulo}
                      <span className={`ml-2 text-[10px] font-bold uppercase tracking-wide ${vencido ? 'text-[#A33]' : COLOR_ESTADO[d.estado]}`}>
                        {vencido ? 'Vencida' : ESTADO_REQ_LABEL[d.estado]}
                      </span>
                    </p>
                    <p className="text-[11px] text-[rgba(80,108,92,0.7)] leading-snug mt-0.5">{r.detalle}</p>

                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {r.esquemas.map((e) => (
                        <span key={e} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(90,190,145,0.12)] text-[#137C53]">
                          {ESQUEMAS_LISTA.find((x) => x.id === e)?.nombre}
                        </span>
                      ))}
                    </div>

                    {r.cubiertoPorPlataforma && r.comoLoCubre && (
                      <div className="flex items-start gap-2 mt-2.5 rounded-xl bg-[rgba(90,190,145,0.07)] border border-[rgba(90,190,145,0.2)] p-2.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#137C53] flex-shrink-0 mt-0.5" />
                        <p className="text-[11px] text-[rgba(80,108,92,0.85)] leading-snug">
                          <strong className="text-[#137C53]">AgroFinance ya aporta esto:</strong> {r.comoLoCubre}
                        </p>
                      </div>
                    )}

                    <div className="flex flex-wrap items-end gap-3 mt-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wide text-[rgba(80,108,92,0.6)] mb-1" htmlFor={`e-${r.id}`}>
                          Estado
                        </label>
                        <select
                          id={`e-${r.id}`}
                          value={d.estado}
                          onChange={(ev) => declarar(r.id, { estado: ev.target.value as EstadoRequisito })}
                          className={campo}
                        >
                          {ESTADOS.map((s) => (
                            <option key={s} value={s}>{ESTADO_REQ_LABEL[s]}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1 min-w-[180px]">
                        <label className="block text-[10px] font-bold uppercase tracking-wide text-[rgba(80,108,92,0.6)] mb-1" htmlFor={`r-${r.id}`}>
                          Dónde está la evidencia
                        </label>
                        <input
                          id={`r-${r.id}`}
                          value={d.respaldo}
                          onChange={(ev) => declarar(r.id, { respaldo: ev.target.value })}
                          placeholder="Ej. PL-SIG-002 rev.4 / carpeta Calidad"
                          className={`${campo} w-full`}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wide text-[rgba(80,108,92,0.6)] mb-1" htmlFor={`v-${r.id}`}>
                          Vence
                        </label>
                        <input
                          id={`v-${r.id}`}
                          type="date"
                          value={d.vence}
                          onChange={(ev) => declarar(r.id, { vence: ev.target.value })}
                          className={campo}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </DashboardShell>
  )
}
