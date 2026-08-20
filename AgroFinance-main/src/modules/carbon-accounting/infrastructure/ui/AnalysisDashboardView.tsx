'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line,
} from 'recharts'
import {
  BarChart3, Download, Leaf, TrendingDown, CheckCircle2,
  Building2, ArrowRight, FileText, X, Calculator, ChevronRight,
  FileSpreadsheet, ShieldCheck, Search, HelpCircle, AlertTriangle, TrendingUp, Plus,
  Circle,
} from 'lucide-react'
import { useChat } from '@/core/providers/ChatContext'
import DashboardShell from '@/shared/components/layout/DashboardShell'
import TerminoTooltip from '@/shared/components/ui/TerminoTooltip'
import {
  scopes, topFuentes, construirScopes, construirTopFuentes, construirProductos, metodologia, productos,
  bancos, empresa, fmtInt, fmtDec, fmtUSD, C, type Producto,
} from '@/modules/carbon-accounting/domain/analyticsData'
import { calcularCooperativa } from '@/modules/carbon-accounting/domain/pilotEngine'
import { filasMecanismo } from '@/modules/carbon-accounting/domain/emissionFactors'
import {
  ALCANCES, DISCLAIMER_BENCHMARK, LIMITE_LABEL, LIMITE_PROPIO, MOTIVO_ALCANCE,
  alcancePorDefecto, deviationVsBenchmark, estadoAlcance, referenciaDe,
  type AlcanceBenchmark,
} from '@/modules/carbon-accounting/domain/benchmarks'
import { useAnotaciones, claveVarianza } from '@/modules/carbon-accounting/domain/anotaciones'
import { useHuellaConsolidada } from '@/modules/carbon-accounting/domain/huellaConsolidada'
import { useFuentesDatos, fuentesActivasDesde, fuentesInactivas, ETIQUETA_FUENTE } from '@/modules/data-loader/domain/datosPrueba'
import { trazabilidadDe, type Trazabilidad } from '@/modules/carbon-accounting/domain/trazabilidad'
import { evaluarChecklist } from '@/modules/compliance-reports/infrastructure/exporters/reporteTecnico'
import { evaluarAlertasRiesgo, rojas as alertasRojas, amarillas as alertasAmarillas } from '@/modules/carbon-accounting/domain/alertasRiesgo'
import { auth } from '@/core/config/firebase.client'

function claveHasData(): string {
  return `agrofinance_has_data_${auth.currentUser?.uid || 'invitado'}`
}

// --- Tooltip oscuro reutilizable ---
const DarkTooltip = ({ active, payload, suffix = '' }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-dark rounded-xl p-3 border border-[rgba(90,190,145,0.2)] text-xs">
        {payload.map((e: any, i: number) => (
          <p key={i} style={{ color: e.color || e.payload?.color || '#137C53' }}>
            {e.name}: <strong>{typeof e.value === 'number' ? fmtDec(e.value) : e.value}{suffix}</strong>
          </p>
        ))}
      </div>
    )
  }
  return null
}

function MiniDonut({ value, color }: { value: number; color: string }) {
  const data = [{ value }, { value: 100 - value }]
  return (
    <div className="relative h-20 w-20 shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={26} outerRadius={38} startAngle={90} endAngle={-270} stroke="none">
            <Cell fill={color} />
            <Cell fill="rgba(90,190,145,0.08)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-extrabold" style={{ color }}>{value}%</span>
      </div>
    </div>
  )
}

// Descarga el inventario GHG como Excel real (.xlsx)
async function descargarInventario() {
  const { exportarExcel } = await import('@/modules/compliance-reports/infrastructure/exporters/exports') as any
  const hasUploaded = typeof window !== 'undefined' && localStorage.getItem(claveHasData()) === 'true'
  const sessionRaw = typeof window !== 'undefined' ? localStorage.getItem('agrofinance_session') : null
  const session = sessionRaw ? JSON.parse(sessionRaw) : null

  const emisionesMensuales = [
    { mes: 'Jul 25', emisiones: 1380, benchmark: 1560 }, { mes: 'Ago 25', emisiones: 1310, benchmark: 1560 },
    { mes: 'Sep 25', emisiones: 1185, benchmark: 1480 }, { mes: 'Oct 25', emisiones: 1240, benchmark: 1480 },
    { mes: 'Nov 25', emisiones: 1420, benchmark: 1520 }, { mes: 'Dic 25', emisiones: 1510, benchmark: 1520 },
    { mes: 'Ene 26', emisiones: 1290, benchmark: 1440 }, { mes: 'Feb 26', emisiones: 1120, benchmark: 1440 },
    { mes: 'Mar 26', emisiones: 1180, benchmark: 1400 }, { mes: 'Abr 26', emisiones: 1095, benchmark: 1400 },
    { mes: 'May 26', emisiones: 1010, benchmark: 1360 }, { mes: 'Jun 26', emisiones: 960, benchmark: 1360 },
  ]
  const data = {
    empresa: session?.empresa || empresa.nombre,
    campania: empresa.campania,
    usuario: session?.nombre || 'Usuario',
    fecha: new Date().toLocaleDateString('es-PE'),
    huellaTotal: hasUploaded ? empresa.huellaTotal : 0,
    intensidad: hasUploaded ? 0.41 : 0,
    reduccionPct: hasUploaded ? 8 : 0,
    benchmark: 0.52,
    ahorro: hasUploaded ? 17500 : 0,
    scopes: (hasUploaded ? scopes : scopes.map(s => ({ ...s, valor: 0, pct: 0 }))).map(s => ({
      nombre: s.nombre, descripcion: s.descripcion, valor: s.valor, pct: s.pct,
    })),
    emisionesMensuales: hasUploaded ? emisionesMensuales : emisionesMensuales.map(e => ({ ...e, emisiones: 0 })),
    topFuentes: (hasUploaded ? topFuentes : topFuentes.map(f => ({ ...f, emisiones: 0, pct: 0 }))).map(f => ({
      fuente: f.fuente, emisiones: f.emisiones, pct: f.pct, scope: f.scope,
    })),
    compliance: [
      { nombre: 'CSRD / EUDR', region: 'Unión Europea', estado: hasUploaded ? 'listo' : 'pendiente' },
      { nombre: 'Tesco Sustainability Network', region: 'Reino Unido', estado: hasUploaded ? 'listo' : 'pendiente' },
      { nombre: 'ISO 14064', region: 'Internacional', estado: hasUploaded ? 'proceso' : 'pendiente' },
      { nombre: 'BBVA Sustainability-Linked Loan', region: 'Banca verde', estado: 'pendiente' },
      { nombre: 'MINAM Huella de Carbono Perú', region: 'Perú', estado: hasUploaded ? 'listo' : 'pendiente' },
    ],
    metodologia,
  }
  await exportarExcel(data)
}

const donutData = scopes.map((s) => ({ name: s.nombre, value: s.valor, pct: s.pct, color: s.color }))

// ---------- Nota de varianza interanual (Δ vs ant.) ----------
function NotaVarianza({ producto, periodo }: { producto: string; periodo: string }) {
  const { anotaciones, setVarianza } = useAnotaciones()
  const guardada = anotaciones.varianza[claveVarianza(producto, periodo)] ?? ''
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState('')

  const abrir = () => { setTexto(guardada); setEditando(true) }
  const guardar = () => { setVarianza(producto, periodo, texto); setEditando(false) }

  if (editando) {
    return (
      <div className="mt-1.5 text-left">
        <label className="sr-only" htmlFor={`var-${producto}-${periodo}`}>Explicación de la variación de {producto}</label>
        <textarea
          id={`var-${producto}-${periodo}`}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') setEditando(false) }}
          autoFocus
          rows={3}
          placeholder="Qué explica la variación (cambio de proveedor de flete, campaña más seca, renovación de bombas…)"
          className="w-full min-w-[220px] text-[11px] p-2 rounded-lg border border-[rgba(90,190,145,0.35)] bg-white outline-none focus:border-[#137C53] focus:ring-1 focus:ring-[#137C53]"
        />
        <div className="flex justify-end gap-1.5 mt-1">
          <button onClick={() => setEditando(false)} className="px-2 py-1 rounded-md text-[10px] font-semibold text-[rgba(80,108,92,0.7)] hover:bg-[rgba(90,190,145,0.1)]">Cancelar</button>
          <button onClick={guardar} className="px-2 py-1 rounded-md text-[10px] font-bold bg-[#13301F] text-white hover:bg-[#0E2418]">Guardar</button>
        </div>
      </div>
    )
  }

  if (guardada) {
    return (
      <button onClick={abrir} className="mt-1 block text-left text-[10px] leading-snug text-[rgba(80,108,92,0.6)] italic hover:text-[#137C53] max-w-[220px]">
        {guardada}
      </button>
    )
  }

  return (
    <button
      onClick={abrir}
      aria-label={`Explicar la variación de ${producto}`}
      className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-[rgba(80,108,92,0.45)] hover:text-[#137C53] focus:outline-none focus:ring-1 focus:ring-[#137C53] rounded"
    >
      <Plus className="w-3 h-3" /> explicar variación
    </button>
  )
}

// ---------- Selector de alcance del benchmark ----------
function SelectorAlcance({
  cultivos, alcance, onChange,
}: { cultivos: string[]; alcance: AlcanceBenchmark; onChange: (a: AlcanceBenchmark) => void }) {
  const estadoDe = (a: AlcanceBenchmark) => {
    const estados = cultivos.map((c) => estadoAlcance(c, a))
    if (estados.includes('disponible')) return 'disponible' as const
    if (estados.includes('limite-distinto')) return 'limite-distinto' as const
    return 'sin-dato' as const
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-bold uppercase tracking-wide text-[rgba(80,108,92,0.5)]">Referencia</span>
      <div className="flex flex-wrap gap-1" role="group" aria-label="Alcance del benchmark">
        {ALCANCES.map((a) => {
          const est = estadoDe(a.id)
          const bloqueado = est !== 'disponible'
          return (
            <button
              key={a.id}
              onClick={() => !bloqueado && onChange(a.id)}
              disabled={bloqueado}
              title={bloqueado ? MOTIVO_ALCANCE[est] : `Comparar contra ${a.label}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                alcance === a.id
                  ? 'bg-[rgba(90,190,145,0.18)] text-[#137C53] border-[rgba(90,190,145,0.4)]'
                  : bloqueado
                    ? 'text-[rgba(80,108,92,0.35)] border-[rgba(80,108,92,0.12)] cursor-not-allowed'
                    : 'text-[rgba(80,108,92,0.65)] border-[rgba(90,190,145,0.18)] hover:text-[#137C53] hover:border-[rgba(90,190,145,0.4)]'
              }`}
            >
              {a.label}
              {bloqueado && <span className="block text-[9px] font-normal leading-tight">{MOTIVO_ALCANCE[est]}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---------- Nota de sustento del benchmark ----------
function NotaSustento({ cultivo }: { cultivo: string }) {
  const { anotaciones, setSustento } = useAnotaciones()
  const guardada = anotaciones.sustentoBenchmark[cultivo] ?? ''
  const [texto, setTexto] = useState<string | null>(null)
  const valor = texto ?? guardada

  return (
    <div className="rounded-2xl border border-[rgba(90,190,145,0.18)] bg-[rgba(244,246,242,0.55)] p-3.5">
      <label htmlFor={`sustento-${cultivo}`} className="block text-[11px] font-bold uppercase tracking-wide text-[rgba(80,108,92,0.55)] mb-1.5">
        Sustento de la diferencia — {cultivo}
      </label>
      <textarea
        id={`sustento-${cultivo}`}
        value={valor}
        rows={2}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={() => { if (texto !== null) { setSustento(cultivo, texto); setTexto(null) } }}
        placeholder="Por qué la intensidad peruana difiere de la referencia: mano de obra intensiva, salinidad de suelo y agua, régimen laboral, distancia al mercado de destino…"
        className="w-full text-xs p-2.5 rounded-xl border border-[rgba(90,190,145,0.25)] bg-white outline-none focus:border-[#137C53] focus:ring-1 focus:ring-[#137C53] resize-y"
      />
      <p className="text-[10px] text-[rgba(80,108,92,0.5)] mt-1">Esta nota viaja al informe técnico exportado.</p>
    </div>
  )
}

// ---------- Vista comparativa de productos ----------
function VistaTodas({ productosList }: { productosList: typeof productos }) {
  const cultivos = productosList.map((p) => p.nombre)
  const { anotaciones, setAlcance: guardarAlcance } = useAnotaciones()
  const guardado = anotaciones.alcanceBenchmark[cultivos[0] ?? ''] as AlcanceBenchmark | undefined
  const alcance = guardado ?? alcancePorDefecto(cultivos[0] ?? 'Palta Hass')
  const setAlcance = (a: AlcanceBenchmark) => cultivos.forEach((c) => guardarAlcance(c, a))

  const refDe = (nombre: string) => {
    const est = estadoAlcance(nombre, alcance)
    return est === 'disponible' ? referenciaDe(nombre, alcance) : { valor: null, fuente: null, limite: null }
  }

  const chartData = productosList.map((p) => ({
    nombre: p.nombre.replace(' frescos', '').replace(' Hass', ''),
    AgroFinance: p.intensidad,
    Benchmark: refDe(p.nombre).valor ?? undefined,
  }))
  const etiquetaAlcance = ALCANCES.find((a) => a.id === alcance)?.label ?? ''

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-3xl p-6 overflow-x-auto">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <h3 className="font-bold text-[#13301F] text-base">Comparativa por producto</h3>
          <SelectorAlcance cultivos={cultivos} alcance={alcance} onChange={setAlcance} />
        </div>
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-[rgba(80,108,92,0.5)] border-b border-[rgba(90,190,145,0.1)]">
              <th className="py-2 pr-3 font-semibold">Producto</th>
              <th className="py-2 pr-3 text-right font-semibold">Vol. exportado</th>
              <th className="py-2 pr-3 text-right font-semibold">Huella total</th>
              <th className="py-2 pr-3 text-right font-semibold">Intensidad</th>
              <th className="py-2 pr-3 text-right font-semibold">Benchmark {etiquetaAlcance}</th>
              <th className="py-2 pr-3 text-right font-semibold">vs. referencia</th>
              <th className="py-2 text-right font-semibold">Δ vs ant.</th>
            </tr>
          </thead>
          <tbody>
            {productosList.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-sm text-[rgba(80,108,92,0.6)]">
                  No hay productos con datos cargados. Sube tus archivos en{' '}
                  <span className="font-semibold text-[#137C53]">Analizar Datos</span> para ver la comparativa.
                </td>
              </tr>
            )}
            {productosList.map((p) => {
              const ref = refDe(p.nombre)
              const desvio = deviationVsBenchmark(p.intensidad || null, ref.valor)
              return (
                <tr key={p.id} className="border-b border-[rgba(90,190,145,0.06)] last:border-0 align-top">
                  <td className="py-3 pr-3 font-semibold text-[#13301F]">{p.nombre}</td>
                  <td className="py-3 pr-3 text-right text-[rgba(80,108,92,0.8)]">{fmtInt(p.volumen)} t</td>
                  <td className="py-3 pr-3 text-right font-bold text-[#137C53]">{fmtInt(p.huellaTotal)} tCO₂e</td>
                  <td className="py-3 pr-3 text-right font-bold text-[#13301F]">{fmtDec(p.intensidad)} <span className="text-xs font-normal text-[rgba(80,108,92,0.4)]">kg/kg</span></td>
                  <td className="py-3 pr-3 text-right text-[rgba(80,108,92,0.5)]">
                    {ref.valor === null ? <span className="text-[11px] italic">sin dato de referencia</span> : fmtDec(ref.valor)}
                  </td>
                  <td className={`py-3 pr-3 text-right font-bold ${desvio.pct === null ? 'text-[rgba(80,108,92,0.45)] font-normal text-[11px] italic' : desvio.desfavorable ? 'text-[#C2410C]' : 'text-[#137C53]'}`}>
                    {desvio.pct === null ? 'sin dato' : desvio.texto}
                  </td>
                  <td className="py-3 text-right">
                    <span className={`badge inline-flex ${p.deltaPct <= 0 ? 'badge-emerald' : 'badge-amber'}`}>
                      {p.deltaPct <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                      {Math.abs(p.deltaPct)}%
                    </span>
                    <NotaVarianza producto={p.nombre} periodo={p.periodoActual} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="glass-card rounded-3xl p-6">
        <h3 className="font-bold text-[#13301F] text-base">Intensidad actual vs. referencia {etiquetaAlcance}</h3>
        <p className="text-xs text-[rgba(80,108,92,0.5)] mb-4">kgCO₂e por kg de producto · límite del sistema {LIMITE_LABEL[LIMITE_PROPIO]}</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} barGap={6}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(90,190,145,0.06)" />
            <XAxis dataKey="nombre" tick={{ fill: 'rgba(80,108,92,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'rgba(80,108,92,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
            <Tooltip content={<DarkTooltip suffix=" kg/kg" />} cursor={{ fill: 'rgba(90,190,145,0.05)' }} />
            <Bar dataKey="AgroFinance" fill="#137C53" radius={[4, 4, 0, 0]} maxBarSize={48} />
            <Bar dataKey="Benchmark" fill="rgba(80,108,92,0.25)" radius={[4, 4, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 text-xs mt-2">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#137C53]" /><span className="text-[rgba(80,108,92,0.6)]">AgroFinance</span></span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[rgba(80,108,92,0.25)]" /><span className="text-[rgba(80,108,92,0.6)]">Benchmark {etiquetaAlcance}</span></span>
        </div>
        <p className="mt-3 text-[11px] text-[rgba(80,108,92,0.7)] bg-[rgba(244,246,242,0.8)] border border-[rgba(90,190,145,0.15)] rounded-xl px-3 py-2">
          {DISCLAIMER_BENCHMARK}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {productosList.map((p) => <NotaSustento key={p.id} cultivo={p.nombre} />)}
      </div>
    </div>
  )
}

// ---------- Desglose por mecanismo ----------
function DesgloseMecanismos({ p }: { p: Producto }) {
  const filas = useMemo(() => filasMecanismo(p.desgloseMecanismo, p.kilosExportados), [p])
  const conDato = filas.filter((f) => f.pct !== null)
  const sinDato = filas.filter((f) => f.pct === null)
  const suma = conDato.reduce((s, f) => s + (f.pct ?? 0), 0)

  const chartData = conDato.map((f) => ({ nombre: f.label, pct: f.pct as number }))

  return (
    <div className="glass-card rounded-3xl p-6">
      <h3 className="font-bold text-[#13301F] text-base">Desglose por mecanismo — {p.nombre}</h3>
      <p className="text-xs text-[rgba(80,108,92,0.5)] mb-4">
        Huella de producto por kg · {LIMITE_LABEL[LIMITE_PROPIO]} · distinta del Top 5 corporativo del inventario
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(90,190,145,0.06)" />
            <XAxis type="number" tick={{ fill: 'rgba(80,108,92,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
            <YAxis type="category" dataKey="nombre" width={104} tick={{ fill: 'rgba(80,108,92,0.6)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<DarkTooltip suffix="%" />} cursor={{ fill: 'rgba(90,190,145,0.05)' }} />
            <Bar dataKey="pct" fill="#137C53" radius={[0, 4, 4, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-[rgba(80,108,92,0.5)] border-b border-[rgba(90,190,145,0.1)]">
                <th className="py-2 pr-3 font-semibold">Mecanismo</th>
                <th className="py-2 pr-3 text-right font-semibold">kgCO₂e/kg</th>
                <th className="py-2 text-right font-semibold">% del total</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.mecanismo} className="border-b border-[rgba(90,190,145,0.06)] last:border-0">
                  <td className="py-2.5 pr-3 font-semibold text-[#13301F]" title={f.detalle}>{f.label}</td>
                  <td className="py-2.5 pr-3 text-right text-[rgba(80,108,92,0.8)]">
                    {f.intensidad === null ? <span className="italic text-[11px] text-[rgba(80,108,92,0.45)]">sin dato</span> : f.intensidad.toFixed(4)}
                  </td>
                  <td className="py-2.5 text-right font-bold text-[#137C53]">
                    {f.pct === null ? <span className="italic text-[11px] font-normal text-[rgba(80,108,92,0.45)]">sin dato</span> : `${f.pct.toFixed(2)}%`}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-[rgba(90,190,145,0.2)]">
                <td className="py-2.5 pr-3 font-black text-[#13301F]">Total</td>
                <td className="py-2.5 pr-3 text-right font-black text-[#13301F]">{p.intensidad.toFixed(2)}</td>
                <td className="py-2.5 text-right font-black text-[#13301F]">{suma.toFixed(2)}%</td>
              </tr>
            </tbody>
          </table>
          {sinDato.length > 0 && (
            <p className="text-[11px] text-[rgba(80,108,92,0.55)] mt-2">
              {sinDato.map((f) => f.label).join(', ')}: la data de campo no registra este consumo, por eso se declara
              &quot;sin dato&quot; en vez de estimarlo.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------- Detalle por producto ----------
function VistaDetalle({ p }: { p: Producto }) {
  const { anotaciones, setAlcance: guardarAlcance } = useAnotaciones()
  const alcance = (anotaciones.alcanceBenchmark[p.nombre] as AlcanceBenchmark | undefined) ?? alcancePorDefecto(p.nombre)
  const setAlcance = (a: AlcanceBenchmark) => guardarAlcance(p.nombre, a)
  const ref = estadoAlcance(p.nombre, alcance) === 'disponible'
    ? referenciaDe(p.nombre, alcance)
    : { valor: null, fuente: null, limite: null }

  const vsBenchmark = deviationVsBenchmark(p.intensidad || null, ref.valor)
  const vsTesco = deviationVsBenchmark(p.intensidad || null, p.limiteTesco)

  const scopeData = [
    { name: 'Scope 1', value: p.scope.s1, color: C.s1 },
    { name: 'Scope 2', value: p.scope.s2, color: C.s2 },
    { name: 'Scope 3', value: p.scope.s3, color: C.s3 },
  ]
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Volumen total', value: fmtInt(p.volumen), unit: 't', alerta: false },
          { label: 'Huella total', value: fmtInt(p.huellaTotal), unit: 'tCO₂e', alerta: false },
          { label: 'Intensidad', value: fmtDec(p.intensidad), unit: 'kg/kg', alerta: false },
          {
            label: 'vs. benchmark',
            value: vsBenchmark.pct === null ? 'sin dato' : `${vsBenchmark.signo}${vsBenchmark.pct}%`,
            unit: vsBenchmark.pct === null ? 'de referencia' : vsBenchmark.etiqueta,
            alerta: vsBenchmark.desfavorable,
          },
        ].map((k, i) => (
          <div key={i} className="metric-card">
            <div className="text-xs uppercase tracking-wide text-[rgba(80,108,92,0.5)]">{k.label}</div>
            <div className={`mt-1 text-2xl font-black ${k.alerta ? 'text-[#C2410C]' : 'text-[#137C53]'}`}>{k.value} <span className="text-sm font-semibold text-[rgba(80,108,92,0.4)]">{k.unit}</span></div>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-3xl p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-[#13301F] text-base">Referencia de comparación</h3>
            <p className="text-xs text-[rgba(80,108,92,0.55)]">
              {ref.valor === null
                ? 'Sin referencia comparable para el alcance elegido.'
                : `${ref.valor} kgCO₂e/kg · ${ref.fuente}`}
            </p>
          </div>
          <SelectorAlcance cultivos={[p.nombre]} alcance={alcance} onChange={setAlcance} />
        </div>
        <p className="text-[11px] text-[rgba(80,108,92,0.7)] bg-[rgba(244,246,242,0.8)] border border-[rgba(90,190,145,0.15)] rounded-xl px-3 py-2">
          {DISCLAIMER_BENCHMARK}
        </p>
        <NotaSustento cultivo={p.nombre} />
      </div>

      <DesgloseMecanismos p={p} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-3xl p-6">
          <h3 className="font-bold text-[#13301F] text-base">Desglose por alcance — {p.nombre}</h3>
          <p className="text-xs text-[rgba(80,108,92,0.5)] mb-2">Distribución Scope 1 / 2 / 3 del cultivo</p>
          <div className="flex items-center gap-4">
            <div className="h-48 w-48 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={scopeData} dataKey="value" innerRadius={48} outerRadius={76} paddingAngle={2} stroke="none">
                    {scopeData.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip content={<DarkTooltip suffix="%" />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="flex-1 space-y-2">
              {scopeData.map((d) => (
                <li key={d.name} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-[rgba(80,108,92,0.8)]">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />{d.name}
                  </span>
                  <span className="font-bold" style={{ color: d.color }}>{d.value}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="glass-card rounded-3xl p-6">
          <h3 className="font-bold text-[#13301F] text-base">Tendencia de intensidad</h3>
          <p className="text-xs text-[rgba(80,108,92,0.5)] mb-4">Últimas 3 campañas — kgCO₂e/kg</p>
          <ResponsiveContainer width="100%" height={192}>
            <LineChart data={p.tendencia}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(90,190,145,0.06)" />
              <XAxis dataKey="campania" tick={{ fill: 'rgba(80,108,92,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(80,108,92,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} domain={['dataMin - 0.1', 'dataMax + 0.1']} width={40} />
              <Tooltip content={<DarkTooltip suffix=" kg/kg" />} />
              <Line type="monotone" dataKey="intensidad" stroke="#137C53" strokeWidth={3} dot={{ r: 5, fill: '#10B981', strokeWidth: 2, stroke: '#FBF4D6' }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-2 flex items-start justify-between gap-3 border-t border-[rgba(90,190,145,0.1)] pt-2">
            <span className="text-xs text-[rgba(80,108,92,0.6)]">
              Δ vs {p.periodoAnterior}: <strong className={p.deltaPct <= 0 ? 'text-[#137C53]' : 'text-[#C2410C]'}>{p.deltaPct > 0 ? '+' : ''}{p.deltaPct}%</strong>
            </span>
            <NotaVarianza producto={p.nombre} periodo={p.periodoActual} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={`flex items-start gap-3 rounded-2xl border p-4 ${vsTesco.desfavorable ? 'border-[rgba(194,65,12,0.25)] bg-[rgba(194,65,12,0.06)]' : 'border-[rgba(90,190,145,0.25)] bg-[rgba(90,190,145,0.06)]'}`}>
          {vsTesco.desfavorable
            ? <AlertTriangle className="w-5 h-5 text-[#C2410C] flex-shrink-0 mt-0.5" />
            : <CheckCircle2 className="w-5 h-5 text-[#137C53] flex-shrink-0 mt-0.5" />}
          <p className="text-sm text-[rgba(80,108,92,0.85)]">{p.notaTesco}</p>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-[rgba(90,190,145,0.1)] bg-[rgba(255,255,255,0.5)] p-4">
          <span className="badge badge-blue flex-shrink-0 mt-0.5">ISO 14067</span>
          <p className="text-sm text-[rgba(80,108,92,0.8)]">Elegible para reporte de <strong className="text-[#13301F]">Huella de Carbono de Producto</strong> bajo la norma ISO 14067.</p>
        </div>
      </div>
    </div>
  )
}

// ---------- Helpers del modal de trazabilidad ----------
const colorScope = (s: 1 | 2 | 3) => (s === 1 ? C.s1 : s === 2 ? C.s2 : C.s3)

function CalcBox({ label, value, unit, sub, green = false }: { label: string; value: string; unit: string; sub?: string; green?: boolean }) {
  return (
    <div className={`flex-1 min-w-[120px] rounded-xl p-3 border ${green ? 'border-transparent text-white' : 'bg-[rgba(244,246,242,0.7)] border-[rgba(90,190,145,0.15)]'}`}
      style={green ? { background: 'linear-gradient(135deg, #2BA470, #137C53)' } : undefined}>
      <div className={`text-[9px] font-bold uppercase tracking-widest ${green ? 'text-white/70' : 'text-[rgba(80,108,92,0.45)]'}`}>{label}</div>
      <div className={`mt-0.5 text-base font-black leading-tight ${green ? 'text-white' : 'text-[#13301F]'}`}>
        {value} <span className={`text-[11px] font-semibold ${green ? 'text-white/75' : 'text-[rgba(80,108,92,0.5)]'}`}>{unit}</span>
      </div>
      {sub && <div className={`text-[10px] mt-0.5 ${green ? 'text-white/70' : 'text-[rgba(80,108,92,0.5)]'}`}>{sub}</div>}
    </div>
  )
}

// Descarga la evidencia de una fuente (CSV con cálculo + registros de origen)
function descargarEvidencia(t: Trazabilidad) {
  const filas: (string | number)[][] = [
    ['Trazabilidad de emisión', t.titulo],
    ['Scope', `Scope ${t.scope}`],
    ['Archivo de origen', t.archivo],
    ['Emisión asignada (tCO2e)', t.emisionTon],
    [],
    ['Cálculo', 'Actividad', 'Unidad', 'Factor', 'Unidad factor', 'Emisión (tCO2e)'],
    ...t.lineas.map((l) => [l.concepto, l.actividad, l.actividadUnidad, l.factor, l.factorUnidad, +(l.emisionKg / 1000).toFixed(2)]),
    [],
    [`Registros de origen (${t.registrosTotal} total)`],
    ['Referencia', 'Fecha', 'Proveedor', 'Cantidad'],
    ...t.registros.map((r) => [r.referencia, r.fecha, r.proveedor, r.cantidad]),
  ]
  const csv = filas.map((f) => f.map((c) => `"${c ?? ''}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Evidencia_${t.fuente}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function AnalysisDashboardView() {
  const [tab, setTab] = useState<'huella' | 'producto' | 'financiamiento'>('huella')
  const [prod, setProd] = useState('todas')
  const [hasDataFlag, setHasData] = useState(false)
  const [montado, setMontado] = useState(false)
  const [traza, setTraza] = useState<Trazabilidad | null>(null)
  const { openChat } = useChat()

  useEffect(() => {
    setHasData(localStorage.getItem(claveHasData()) === 'true')
    setMontado(true)
    const t = new URLSearchParams(window.location.search).get('tab')
    if (t === 'producto' || t === 'financiamiento' || t === 'huella') setTab(t)
  }, [])

  const { huella: consolidada, fuentes: fuentesDatos } = useHuellaConsolidada()
  const inactivas = fuentesInactivas(fuentesDatos)
  const cooperativaReactiva = consolidada
  const { anotaciones } = useAnotaciones()
  const alertasRiesgo = useMemo(() => evaluarAlertasRiesgo({
    huella: consolidada,
    fuentes: fuentesDatos,
    checklist: evaluarChecklist({ fuentes: fuentesDatos, huella: consolidada, anotaciones, periodoCerrado: true }),
    anotaciones,
  }), [consolidada, fuentesDatos, anotaciones])
  const scopes = useMemo(() => construirScopes(cooperativaReactiva), [cooperativaReactiva])
  const topFuentes = useMemo(() => construirTopFuentes(cooperativaReactiva), [cooperativaReactiva])
  const productosReactivos = useMemo(
    () => construirProductos(fuentesActivasDesde(fuentesDatos)),
    [fuentesDatos],
  )

  const hasData = montado ? consolidada.tieneDatos : hasDataFlag
  const displayScopes = hasData ? scopes : scopes.map(s => ({ ...s, valor: 0, pct: 0 }))
  const displayTopFuentes = hasData ? topFuentes : topFuentes.map(f => ({ ...f, emisiones: 0, pct: 0 }))
  // Sin datos NO se listan productos. Antes se mostraban igual las filas de
  // Palta Hass y Mango Kent (que construirProductos devuelve fijas) con los
  // valores en cero: después de "Limpiar" parecía que quedaban productos
  // cargados cuando en realidad no había ninguna fuente.
  const displayProductos = hasData ? productosReactivos : []
  const displayBancos = hasData ? bancos : bancos.map(b => ({
    ...b,
    lineaAprobable: 0,
    progreso: 0,
    ahorroAnual: 0
  }))

  const displayDonutData = displayScopes.map((s) => ({ name: s.nombre, value: s.valor, pct: s.pct, color: s.color }))
  const productoActivo = displayProductos.find((p) => p.id === prod)

  return (
    <DashboardShell onExport={descargarInventario}>
      <div>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-[#13301F] tracking-tight">
            Inventario GHG Protocol <span className="text-[rgba(80,108,92,0.45)] font-semibold">— Campaña {empresa.campania}</span>
          </h1>
          <p className="text-[rgba(80,108,92,0.6)] mt-1 text-sm inline-flex items-center flex-wrap">
            Contabilidad de emisiones por alcance (
            <span className="inline-flex items-center">Scope 1<TerminoTooltip termino="Scope 1" /></span>,
            <span className="inline-flex items-center ml-1">2<TerminoTooltip termino="Scope 2" /></span>
            <span className="inline-flex items-center ml-1">y 3<TerminoTooltip termino="Scope 3" /></span>
            ) consolidada de todas las áreas
          </p>
        </motion.div>

        {/* Warning banner when empty */}
        {!hasData && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-[rgba(210,145,47,0.3)] bg-[rgba(210,145,47,0.06)] p-4 mb-8 flex flex-col sm:flex-row sm:items-center gap-3"
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[rgba(210,145,47,0.12)] border border-[rgba(210,145,47,0.2)] flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-4 h-4 text-[#D2912F]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[#13301F]">Análisis sin datos</h3>
                <p className="text-xs text-[rgba(80,108,92,0.75)] leading-relaxed mt-0.5">
                  Las gráficas y comparativas se muestran en cero. Sube los archivos de <strong>sample-data/</strong> para habilitar las métricas.
                </p>
              </div>
            </div>
            <Link
              href="/upload/"
              className="flex-shrink-0 inline-block px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#2BA470] to-[#137C53] text-[#FBF4D6] font-bold text-xs shadow-sm hover:brightness-105 active:scale-95 transition-all whitespace-nowrap text-center"
            >
              Cargar datos ➔
            </Link>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 glass rounded-2xl border border-[rgba(90,190,145,0.1)] w-fit mb-8 flex-wrap">
          {[
            { id: 'huella', label: 'Huella por alcance' },
            { id: 'producto', label: 'Por producto' },
            { id: 'financiamiento', label: 'Financiamiento verde' },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t.id ? 'bg-[rgba(90,190,145,0.15)] text-[#137C53] border border-[rgba(90,190,145,0.25)]' : 'text-[rgba(80,108,92,0.5)] hover:text-[rgba(80,108,92,0.8)]'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ----- HUELLA POR ALCANCE ----- */}
          {tab === 'huella' && (
            <motion.div key="huella" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              {hasData && inactivas.length > 0 && (
                <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50 border border-amber-200 p-3.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Faltan datos de <strong>{inactivas.map((id) => ETIQUETA_FUENTE[id]).join(' y ')}</strong>: estos
                    números ya no incluyen esa fuente. Ve a{' '}
                    <Link href="/configuracion/" className="underline font-semibold hover:text-amber-900">Configuración</Link>{' '}
                    para volver a vincularla.
                  </p>
                </div>
              )}
              <motion.div
                initial="hidden"
                animate="show"
                variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.15 } } }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-4"
              >
                {displayScopes.map((s) => (
                  <motion.div
                    key={s.id}
                    variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 20 } } }}
                    className="glass-card rounded-3xl p-6 flex flex-col"
                  >
                    <div className="flex items-start gap-4">
                      <MiniDonut value={s.pct} color={s.color} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                          <h3 className="text-sm font-bold text-[#13301F]">{s.nombre}</h3>
                        </div>
                        <p className="text-xs text-[rgba(80,108,92,0.5)]">{s.descripcion}</p>
                        <div className="mt-2 flex items-baseline gap-1">
                          <span className="text-2xl font-black" style={{ color: s.color }}>{fmtInt(s.valor)}</span>
                          <span className="text-xs font-semibold text-[rgba(80,108,92,0.4)] flex items-center">tCO₂e
                            <div className="relative group inline-block ml-1 align-middle">
                              <HelpCircle className="w-3.5 h-3.5 text-[rgba(80,108,92,0.5)] cursor-help hover:text-[#137C53] transition-colors" />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-[#13301F] text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg text-center font-normal leading-tight">
                                Toneladas de CO₂ equivalente.
                              </div>
                            </div>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 border-t border-[rgba(90,190,145,0.08)] pt-3">
                      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[rgba(80,108,92,0.4)]">Fuentes principales</div>
                      <ul className="flex flex-wrap gap-1.5">
                        {s.fuentes.map((f) => (
                          <li key={f} className="rounded-md bg-[rgba(255,255,255,0.6)] border border-[rgba(90,190,145,0.08)] px-2 py-1 text-[11px] font-medium text-[rgba(80,108,92,0.75)]">{f}</li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="glass-card rounded-3xl p-6 lg:col-span-2">
                  <h3 className="font-bold text-[#13301F] text-base">Distribución por alcance</h3>
                  <p className="text-xs text-[rgba(80,108,92,0.5)] mb-2">Total: {fmtInt(hasData ? Math.round(cooperativaReactiva.huellaTotalTon) : 0)} tCO₂e</p>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={displayDonutData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={100} paddingAngle={2} stroke="none">
                        {displayDonutData.map((d) => <Cell key={d.name} fill={d.color} />)}
                      </Pie>
                      <Tooltip content={<DarkTooltip suffix=" tCO₂e" />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-3 text-xs">
                    {displayDonutData.map((d) => (
                      <span key={d.name} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} /><span className="text-[rgba(80,108,92,0.6)]">{d.name} — {d.pct}%</span></span>
                    ))}
                  </div>
                </div>

                <div className="glass-card rounded-3xl p-6 lg:col-span-3">
                  <h3 className="font-bold text-[#13301F] text-base">Top 5 fuentes de emisión</h3>
                  <p className="text-xs text-[rgba(80,108,92,0.55)] mb-4 flex items-center gap-1.5">
                    <Search className="w-3 h-3 text-[#137C53]" />
                    Haz clic en una fila para ver de dónde sale cada cifra <span className="text-[#137C53] font-semibold">(trazabilidad)</span>
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[480px]">
                      <thead>
                        <tr className="text-left text-[11px] uppercase tracking-wide text-[rgba(80,108,92,0.5)] border-b border-[rgba(90,190,145,0.1)]">
                          <th className="py-2 pr-2 font-semibold">#</th>
                          <th className="py-2 pr-2 font-semibold">Fuente</th>
                          <th className="py-2 pr-2 text-right font-semibold">Emisiones</th>
                          <th className="py-2 pr-2 text-right font-semibold">% total</th>
                          <th className="py-2 text-right font-semibold">Scope</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayTopFuentes.map((f) => (
                          <tr
                            key={f.n}
                            onClick={hasData ? () => setTraza(trazabilidadDe(f.fuenteKey)) : undefined}
                            className={`border-b border-[rgba(90,190,145,0.06)] last:border-0 transition-colors ${
                              hasData ? 'cursor-pointer hover:bg-[rgba(90,190,145,0.06)]' : ''
                            }`}
                          >
                            <td className="py-3 pr-2 text-[rgba(80,108,92,0.4)] font-bold">{f.n}</td>
                            <td className="py-3 pr-2 font-semibold text-[#13301F]">{f.fuente}</td>
                            <td className="py-3 pr-2 text-right font-bold text-[#137C53]">{fmtInt(f.emisiones)} tCO₂e</td>
                            <td className="py-3 pr-2 text-right font-bold text-[#13301F]">{f.pct}%</td>
                            <td className="py-3 text-right">
                              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold text-white" style={{ background: colorScope((Number(f.scope.replace('Scope ', '')) || 1) as 1|2|3) }}>
                                {f.scope}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ----- POR PRODUCTO ----- */}
          {tab === 'producto' && (
            <motion.div key="producto" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button onClick={() => setProd('todas')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${prod === 'todas' ? 'bg-[#13301F] text-white' : 'bg-white/60 text-[rgba(80,108,92,0.7)] hover:bg-white'}`}>
                  Todos los productos
                </button>
                {displayProductos.map((p) => (
                  <button key={p.id} onClick={() => setProd(p.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${prod === p.id ? 'bg-[#13301F] text-white' : 'bg-white/60 text-[rgba(80,108,92,0.7)] hover:bg-white'}`}>
                    {p.nombre}
                  </button>
                ))}
              </div>

              {prod === 'todas' ? (
                <VistaTodas productosList={displayProductos} />
              ) : (
                productoActivo && <VistaDetalle p={productoActivo} />
              )}
            </motion.div>
          )}

          {/* ----- FINANCIAMIENTO VERDE ----- */}
          {tab === 'financiamiento' && (
            <motion.div key="financiamiento" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="glass-card rounded-3xl p-6">
                <h3 className="font-bold text-[#13301F] text-base">Elegibilidad para Créditos Verdes (SLL)</h3>
                <p className="text-xs text-[rgba(80,108,92,0.55)] mb-6">
                  Sustainability-Linked Loans: reducción de tasa de interés según cumplimiento de metas ESG y reducción de huella.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {displayBancos.map((b, i) => (
                    <div key={i} className="glass-card rounded-2xl p-5 border border-[rgba(90,190,145,0.15)] flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <h4 className="font-bold text-[#13301F] text-sm">{b.banco}</h4>
                          <span className="badge badge-emerald text-[10px]">{b.producto}</span>
                        </div>
                        <div className="space-y-2 mb-4 text-xs">
                          <div className="flex justify-between">
                            <span className="text-[rgba(80,108,92,0.6)]">Línea pre-aprobable:</span>
                            <span className="font-bold text-[#13301F]">US$ {fmtInt(b.lineaAprobable)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[rgba(80,108,92,0.6)]">Beneficio:</span>
                            <span className="font-bold text-[#137C53]">{b.beneficio}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[rgba(80,108,92,0.6)]">Ahorro estimado:</span>
                            <span className="font-bold text-[#137C53]">US$ {fmtInt(b.ahorroAnual)}/año</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="mb-2">
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-[rgba(80,108,92,0.6)]">Requisitos cumplidos</span>
                            <span className="font-bold text-[#13301F]">{b.progreso}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-[rgba(90,190,145,0.12)] overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-[#2BA470] to-[#137C53] rounded-full" style={{ width: `${b.progreso}%` }} />
                          </div>
                        </div>

                        <Link
                          href="/financiamiento/"
                          className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-[rgba(90,190,145,0.12)] hover:bg-[rgba(90,190,145,0.2)] text-[#137C53] font-bold text-xs transition-colors"
                        >
                          Ver requisitos y simular <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal de Trazabilidad */}
        <AnimatePresence>
          {traza && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setTraza(null)}
              className="fixed inset-0 z-50 bg-[rgba(11,46,33,0.5)] backdrop-blur-sm flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="glass-card bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-[rgba(90,190,145,0.25)] flex flex-col max-h-[90vh]"
              >
                <div className="p-5 border-b border-[rgba(90,190,145,0.12)] flex items-start justify-between bg-[rgba(244,246,242,0.5)]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold text-white" style={{ background: colorScope(traza.scope) }}>
                        Scope {traza.scope}
                      </span>
                      <span className="text-xs font-semibold text-[rgba(80,108,92,0.6)]">{traza.archivo}</span>
                    </div>
                    <h2 className="text-lg font-black text-[#13301F] mt-1">{traza.titulo}</h2>
                  </div>
                  <button onClick={() => setTraza(null)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[rgba(90,190,145,0.12)] text-[rgba(80,108,92,0.6)]">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 overflow-y-auto space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <CalcBox label="Emisión asignada" value={fmtInt(traza.emisionTon)} unit="tCO₂e" sub={`${(traza.emisionTon * 1000).toLocaleString('es-PE')} kgCO₂e`} green />
                    <CalcBox label="Consumo total" value={traza.lineas[0]?.actividad.toLocaleString('es-PE') || '0'} unit={traza.lineas[0]?.actividadUnidad || ''} />
                    <CalcBox label="Factor de emisión" value={traza.lineas[0]?.factor.toString() || '0'} unit={traza.lineas[0]?.factorUnidad || ''} sub={traza.factorFuente} />
                  </div>

                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[rgba(80,108,92,0.5)] mb-2">Desglose del cálculo</h3>
                    <div className="overflow-x-auto rounded-xl border border-[rgba(90,190,145,0.12)]">
                      <table className="w-full text-xs">
                        <thead className="bg-[#F7FAF7] text-[rgba(80,108,92,0.6)] font-semibold border-b border-[rgba(90,190,145,0.12)]">
                          <tr>
                            <th className="p-2 text-left">Concepto</th>
                            <th className="p-2 text-right">Actividad</th>
                            <th className="p-2 text-right">Factor</th>
                            <th className="p-2 text-right">Emisión</th>
                          </tr>
                        </thead>
                        <tbody>
                          {traza.lineas.map((l, idx) => (
                            <tr key={idx} className="border-b border-[rgba(90,190,145,0.06)] last:border-0">
                              <td className="p-2 font-medium text-[#13301F]">{l.concepto}</td>
                              <td className="p-2 text-right text-[rgba(80,108,92,0.8)]">{l.actividad.toLocaleString('es-PE')} {l.actividadUnidad}</td>
                              <td className="p-2 text-right text-[rgba(80,108,92,0.8)]">{l.factor} {l.factorUnidad}</td>
                              <td className="p-2 text-right font-bold text-[#137C53]">{(l.emisionKg / 1000).toFixed(2)} tCO₂e</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[rgba(80,108,92,0.5)]">
                        Registros de origen ({traza.registrosTotal} facturas / comprobantes)
                      </h3>
                      <button onClick={() => descargarEvidencia(traza)} className="text-xs text-[#137C53] font-semibold hover:underline flex items-center gap-1">
                        <Download className="w-3 h-3" /> Exportar evidencia CSV
                      </button>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-[rgba(90,190,145,0.12)] max-h-48">
                      <table className="w-full text-xs">
                        <thead className="bg-[#F7FAF7] text-[rgba(80,108,92,0.6)] font-semibold border-b border-[rgba(90,190,145,0.12)] sticky top-0">
                          <tr>
                            <th className="p-2 text-left">Referencia</th>
                            <th className="p-2 text-left">Fecha</th>
                            <th className="p-2 text-left">Proveedor</th>
                            <th className="p-2 text-right">Cantidad</th>
                          </tr>
                        </thead>
                        <tbody>
                          {traza.registros.map((r, idx) => (
                            <tr key={idx} className="border-b border-[rgba(90,190,145,0.06)] last:border-0">
                              <td className="p-2 font-mono text-[11px] text-[#13301F]">{r.referencia}</td>
                              <td className="p-2 text-[rgba(80,108,92,0.7)]">{r.fecha}</td>
                              <td className="p-2 font-medium text-[#13301F] truncate max-w-[140px]">{r.proveedor}</td>
                              <td className="p-2 text-right font-bold text-[#13301F]">{r.cantidad} {traza.lineas[0]?.actividadUnidad || ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-[rgba(90,190,145,0.12)] bg-[#F7FAF7] flex items-center justify-between text-xs">
                  <span className="text-[rgba(80,108,92,0.6)]">Auditable bajo ISO 14064-3 / GHG Protocol</span>
                  <button onClick={() => setTraza(null)} className="px-4 py-2 rounded-xl bg-[#13301F] text-white font-bold hover:bg-[#0E2418] transition-colors">
                    Cerrar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </DashboardShell>
  )
}
