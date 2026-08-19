'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft, ArrowRight, CheckCircle2, AlertTriangle, XCircle,
  Landmark, RotateCcw, Info,
} from 'lucide-react'
import DashboardShell from '@/components/layout/DashboardShell'
import {
  evaluarCredito, ETIQUETA_SBS, UIT_2026,
  type PerfilCredito, type ClasificacionSBS, type Destino, type Veredicto,
} from '@/lib/creditoEngine'

const PERFIL_INICIAL: PerfilCredito = {
  esPersonaJuridica: true,
  aniosOperando: 3,
  ventasAnualesSoles: 400000,
  hectareas: 12,
  titularMujer: false,
  edadTitular: 42,
  clasificacionSBS: 'normal',
  numeroAcreencias: 2,
  deudaVencidaAgroperu: false,
  tieneTituloPropiedad: true,
  perteneceOrganizacion: false,
  valorGarantiasSoles: 300000,
  exportaUEoUK: true,
  huellaCalculada: false,
  huellaVerificada: false,
  trazabilidadGPS: false,
  certificaciones: false,
  aniosReportandoESG: 0,
  montoSolicitadoSoles: 150000,
  destino: 'campania',
  plazoMeses: 12,
}

const PASOS = ['Tu empresa', 'Historial crediticio', 'Garantías', 'Exportación', 'Qué necesitas'] as const

const soles = (n: number) => `S/ ${Math.round(n).toLocaleString('es-PE')}`

const ESTILO_VEREDICTO: Record<Veredicto, { label: string; clases: string; Icono: typeof CheckCircle2 }> = {
  califica: { label: 'Calificas', clases: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icono: CheckCircle2 },
  condicionado: { label: 'Condicionado', clases: 'bg-amber-50 text-amber-700 border-amber-200', Icono: AlertTriangle },
  no_califica: { label: 'No calificas aún', clases: 'bg-red-50 text-red-600 border-red-200', Icono: XCircle },
}

/* Campos reutilizables ---------------------------------------------------- */
function Campo({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-[#13301F] mb-1.5">{label}</span>
      {hint && <span className="block text-xs text-[rgba(80,108,92,0.6)] mb-2">{hint}</span>}
      {children}
    </label>
  )
}

const inputCls =
  'w-full px-3.5 py-2.5 bg-white border border-[rgba(90,190,145,0.25)] rounded-xl text-sm text-[#13301F] focus:outline-none focus:border-[#137C53] focus:ring-1 focus:ring-[#137C53]'

function Numero({ valor, onChange, min = 0, sufijo }: { valor: number; onChange: (v: number) => void; min?: number; sufijo?: string }) {
  return (
    <div className="relative">
      <input
        type="number"
        min={min}
        value={valor}
        onChange={(e) => onChange(Math.max(min, Number(e.target.value) || 0))}
        className={inputCls + (sufijo ? ' pr-16' : '')}
      />
      {sufijo && (
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[rgba(80,108,92,0.55)] pointer-events-none">
          {sufijo}
        </span>
      )}
    </div>
  )
}

function SiNo({ valor, onChange }: { valor: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-2">
      {[true, false].map((v) => (
        <button
          key={String(v)}
          type="button"
          onClick={() => onChange(v)}
          className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
            valor === v
              ? 'bg-[#137C53] text-white border-[#137C53]'
              : 'bg-white text-[rgba(80,108,92,0.75)] border-[rgba(90,190,145,0.25)] hover:border-[#137C53]'
          }`}
        >
          {v ? 'Sí' : 'No'}
        </button>
      ))}
    </div>
  )
}

/* Página ------------------------------------------------------------------ */
export default function FinanciamientoPage() {
  const [paso, setPaso] = useState(0)
  const [perfil, setPerfil] = useState<PerfilCredito>(PERFIL_INICIAL)
  const [enviado, setEnviado] = useState(false)

  const set = <K extends keyof PerfilCredito>(k: K, v: PerfilCredito[K]) =>
    setPerfil((p) => ({ ...p, [k]: v }))

  const evaluacion = enviado ? evaluarCredito(perfil) : null

  if (enviado && evaluacion) {
    return (
      <DashboardShell>
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-[#13301F] tracking-tight">Resultado de tu pre-evaluación</h1>
          <p className="text-[rgba(80,108,92,0.65)] mt-2 text-sm max-w-2xl">
            Esto es una orientación basada en los requisitos públicos de cada programa. No es una aprobación: la
            decisión final siempre la toma la entidad tras su evaluación formal.
          </p>
        </motion.div>

        {evaluacion.alertaHistorial && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5 flex gap-3">
            <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold text-red-700 mb-1">Antes que nada: tu historial te está bloqueando</h2>
              <p className="text-sm text-red-700/90 leading-relaxed">{evaluacion.alertaHistorial}</p>
            </div>
          </div>
        )}

        {evaluacion.recomendado && (
          <div className="mb-6 rounded-2xl border-2 border-[#137C53] bg-[rgba(90,190,145,0.06)] p-5">
            <span className="inline-block px-2.5 py-1 rounded-full bg-[#137C53] text-white text-[10px] font-bold uppercase tracking-wide mb-2">
              Tu mejor opción hoy
            </span>
            <h2 className="text-lg font-black text-[#13301F]">{evaluacion.recomendado.producto}</h2>
            <p className="text-sm text-[rgba(80,108,92,0.75)] mt-1">{evaluacion.recomendado.entidad}</p>
          </div>
        )}

        <div className="space-y-4">
          {evaluacion.resultados.map((r, i) => {
            const est = ESTILO_VEREDICTO[r.veredicto]
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="bg-white rounded-2xl border border-[rgba(90,190,145,0.15)] shadow-sm p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-[#13301F]">{r.producto}</h3>
                    <p className="text-xs text-[rgba(80,108,92,0.6)] mt-0.5 flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5" /> {r.entidad}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${est.clases}`}>
                    <est.Icono className="w-3.5 h-3.5" /> {est.label}
                  </span>
                </div>

                {r.veredicto !== 'no_califica' && (
                  <div className="flex flex-wrap gap-x-8 gap-y-2 mb-4 pb-4 border-b border-[rgba(90,190,145,0.12)]">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-[rgba(80,108,92,0.5)] font-semibold">Tasa referencial</p>
                      <p className="text-lg font-black text-[#13301F]">{r.tasaDesde}% – {r.tasaHasta}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-[rgba(80,108,92,0.5)] font-semibold">Monto alcanzable</p>
                      <p className="text-lg font-black text-[#13301F]">{soles(r.montoEstimadoSoles)}</p>
                    </div>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  {r.motivos.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-[#137C53] mb-2">A favor</p>
                      <ul className="space-y-1.5">
                        {r.motivos.map((m, j) => (
                          <li key={j} className="flex gap-2 text-xs text-[rgba(80,108,92,0.85)] leading-snug">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#137C53] shrink-0 mt-px" /> {m}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {r.bloqueos.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-amber-700 mb-2">Qué te frena</p>
                      <ul className="space-y-1.5">
                        {r.bloqueos.map((b, j) => (
                          <li key={j} className="flex gap-2 text-xs text-[rgba(80,108,92,0.85)] leading-snug">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-px" /> {b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <p className="mt-4 pt-3 border-t border-[rgba(90,190,145,0.12)] text-xs text-[rgba(80,108,92,0.75)] leading-relaxed">
                  <strong className="text-[#13301F]">Siguiente paso:</strong> {r.siguientePaso}
                </p>
              </motion.div>
            )
          })}
        </div>

        <button
          onClick={() => { setEnviado(false); setPaso(0) }}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-[#137C53] border border-[rgba(90,190,145,0.3)] hover:bg-[rgba(90,190,145,0.08)] transition-colors"
        >
          <RotateCcw className="w-4 h-4" /> Corregir mis datos
        </button>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell>
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-[#13301F] tracking-tight">¿A qué crédito puedes acceder?</h1>
        <p className="text-[rgba(80,108,92,0.65)] mt-2 text-sm max-w-2xl">
          Respóndenos estas preguntas y te decimos qué productos de financiamiento te calzan hoy, cuáles no y qué te
          falta para llegar a ellos.
        </p>
      </motion.div>

      {/* Progreso */}
      <div className="flex items-center gap-2 mb-6">
        {PASOS.map((nombre, i) => (
          <div key={nombre} className="flex-1">
            <div className={`h-1.5 rounded-full transition-colors ${i <= paso ? 'bg-[#137C53]' : 'bg-[rgba(90,190,145,0.18)]'}`} />
            <p className={`text-[10px] mt-1.5 font-semibold ${i === paso ? 'text-[#137C53]' : 'text-[rgba(80,108,92,0.45)]'}`}>
              {nombre}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-[rgba(90,190,145,0.15)] shadow-sm p-6 max-w-2xl">
        {/* Sin AnimatePresence: con `mode="wait"` la salida se quedaba
            trabada y el contenido del paso no llegaba a montarse. */}
        <div>
          <motion.div
            key={paso}
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            {paso === 0 && (
              <>
                <Campo label="¿Estás registrado como empresa (persona jurídica)?">
                  <SiNo valor={perfil.esPersonaJuridica} onChange={(v) => set('esPersonaJuridica', v)} />
                </Campo>
                <Campo label="Años operando">
                  <Numero valor={perfil.aniosOperando} onChange={(v) => set('aniosOperando', v)} sufijo="años" />
                </Campo>
                <Campo label="Ventas netas del último año (Sin IGV)" hint={`La UIT 2026 vale S/ ${UIT_2026.toLocaleString('es-PE')}. Varios programas ponen sus topes en UIT.`}>
                  <Numero valor={perfil.ventasAnualesSoles} onChange={(v) => set('ventasAnualesSoles', v)} sufijo="S/" />
                </Campo>
                <Campo label="Hectáreas que conduces">
                  <Numero valor={perfil.hectareas} onChange={(v) => set('hectareas', v)} sufijo="ha" />
                </Campo>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Campo label="¿La titular es mujer?">
                    <SiNo valor={perfil.titularMujer} onChange={(v) => set('titularMujer', v)} />
                  </Campo>
                  <Campo label="Edad del titular">
                    <Numero valor={perfil.edadTitular} onChange={(v) => set('edadTitular', v)} sufijo="años" />
                  </Campo>
                </div>
              </>
            )}

            {paso === 1 && (
              <>
                <div className="rounded-xl bg-[rgba(90,190,145,0.06)] border border-[rgba(90,190,145,0.18)] p-3.5 flex gap-2.5">
                  <Info className="w-4 h-4 text-[#137C53] shrink-0 mt-0.5" />
                  <p className="text-xs text-[rgba(80,108,92,0.8)] leading-relaxed">
                    Esta es la sección que más pesa. La SBS clasifica por el <strong>peor</strong> de tus créditos: uno
                    solo atrasado arrastra toda tu categoría, aunque el resto esté al día.
                  </p>
                </div>
                <Campo label="Tu clasificación actual en la SBS" hint="Puedes consultarla gratis en el portal de la SBS.">
                  <select
                    value={perfil.clasificacionSBS}
                    onChange={(e) => set('clasificacionSBS', e.target.value as ClasificacionSBS)}
                    className={inputCls}
                  >
                    {(Object.keys(ETIQUETA_SBS) as ClasificacionSBS[]).map((c) => (
                      <option key={c} value={c}>{ETIQUETA_SBS[c]}</option>
                    ))}
                  </select>
                </Campo>
                <Campo label="¿Con cuántas entidades financieras tienes deuda hoy?" hint="El Fondo AgroPerú admite un máximo de 3.">
                  <Numero valor={perfil.numeroAcreencias} onChange={(v) => set('numeroAcreencias', v)} sufijo="entidades" />
                </Campo>
                <Campo label="¿Tienes deuda vencida con el Fondo AgroPerú?">
                  <SiNo valor={perfil.deudaVencidaAgroperu} onChange={(v) => set('deudaVencidaAgroperu', v)} />
                </Campo>
              </>
            )}

            {paso === 2 && (
              <>
                <Campo label="¿Tienes título de propiedad o constancia de posesión del predio?">
                  <SiNo valor={perfil.tieneTituloPropiedad} onChange={(v) => set('tieneTituloPropiedad', v)} />
                </Campo>
                <Campo label="¿Perteneces a una asociación, cooperativa o comunidad?" hint="El financiamiento del Fondo AgroPerú se canaliza a través de organizaciones.">
                  <SiNo valor={perfil.perteneceOrganizacion} onChange={(v) => set('perteneceOrganizacion', v)} />
                </Campo>
                <Campo label="Valor estimado de tus garantías (Neto, sin IGV)" hint="Terreno, maquinaria, infraestructura.">
                  <Numero valor={perfil.valorGarantiasSoles} onChange={(v) => set('valorGarantiasSoles', v)} sufijo="S/" />
                </Campo>
              </>
            )}

            {paso === 3 && (
              <>
                <Campo label="¿Exportas a la Unión Europea o Reino Unido?">
                  <SiNo valor={perfil.exportaUEoUK} onChange={(v) => set('exportaUEoUK', v)} />
                </Campo>
                <Campo label="¿Ya calculaste tu huella de carbono?">
                  <SiNo valor={perfil.huellaCalculada} onChange={(v) => set('huellaCalculada', v)} />
                </Campo>
                <Campo label="¿Está verificada por un tercero independiente?" hint="Un KPI autodeclarado no sirve para un crédito atado a sostenibilidad.">
                  <SiNo valor={perfil.huellaVerificada} onChange={(v) => set('huellaVerificada', v)} />
                </Campo>
                <Campo label="¿Tienes trazabilidad GPS de tus parcelas?" hint="Es lo que exige la EUDR para probar que no hay deforestación.">
                  <SiNo valor={perfil.trazabilidadGPS} onChange={(v) => set('trazabilidadGPS', v)} />
                </Campo>
                <Campo label="¿Tienes certificaciones (GlobalGAP, orgánico, etc.)?">
                  <SiNo valor={perfil.certificaciones} onChange={(v) => set('certificaciones', v)} />
                </Campo>
                <Campo label="¿Cuántos años llevas reportando indicadores ambientales?" hint="El estándar de SLL espera alrededor de 3 años de histórico.">
                  <Numero valor={perfil.aniosReportandoESG} onChange={(v) => set('aniosReportandoESG', v)} sufijo="años" />
                </Campo>
              </>
            )}

            {paso === 4 && (
              <>
                <Campo label="¿Cuánto necesitas? (Monto neto, sin IGV)">
                  <Numero valor={perfil.montoSolicitadoSoles} onChange={(v) => set('montoSolicitadoSoles', v)} sufijo="S/" />
                </Campo>
                <Campo label="¿Para qué lo vas a usar?">
                  <select value={perfil.destino} onChange={(e) => set('destino', e.target.value as Destino)} className={inputCls}>
                    <option value="campania">Campaña agrícola (semilla, fertilizante, jornales)</option>
                    <option value="capital_trabajo">Capital de trabajo</option>
                    <option value="equipamiento">Maquinaria y equipamiento</option>
                    <option value="infraestructura">Infraestructura (riego, packing, energía)</option>
                  </select>
                </Campo>
                <Campo label="¿En cuánto tiempo lo devolverías?">
                  <Numero valor={perfil.plazoMeses} onChange={(v) => set('plazoMeses', v)} min={1} sufijo="meses" />
                </Campo>
              </>
            )}
          </motion.div>
        </div>

        <div className="flex items-center justify-between mt-7 pt-5 border-t border-[rgba(90,190,145,0.12)]">
          <button
            onClick={() => setPaso((p) => Math.max(0, p - 1))}
            disabled={paso === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-[rgba(80,108,92,0.75)] hover:bg-[rgba(90,190,145,0.08)] disabled:opacity-35 disabled:hover:bg-transparent transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Atrás
          </button>

          {paso < PASOS.length - 1 ? (
            <button
              onClick={() => setPaso((p) => p + 1)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold bg-[#13301F] text-white hover:bg-[#0E2418] active:scale-95 transition-all"
            >
              Siguiente <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setEnviado(true)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold bg-[#137C53] text-white hover:bg-[#0F6543] active:scale-95 transition-all"
            >
              Ver a qué califico <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </DashboardShell>
  )
}
