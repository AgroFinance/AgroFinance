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
import { filasMecanismo, MECANISMO_VACIO } from '@/modules/carbon-accounting/domain/emissionFactors'
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
  const hasUploaded = typeof window !== 'undefined' && localStorage.getItem('agrofinance_has_data') === 'true'
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
    setHasData(localStorage.getItem('agrofinance_has_data') === 'true')
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
    anotaciones,
    checklist: evaluarChecklist({ fuentes: fuentesDatos, huella: consolidada, anotaciones, periodoCerrado: true }),
  }), [consolidada, fuentesDatos, anotaciones])

  const scopesReactivos = useMemo(() => construirScopes(consolidada), [consolidada])
  const topFuentesReactivos = useMemo(() => construirTopFuentes(consolidada), [consolidada])
  const productosReactivos = useMemo(() => construirProductos(fuentesActivasDesde(fuentesDatos)), [fuentesDatos])

  const prodSel = productosReactivos.find((p) => p.id === prod)

  if (!montado) return null

  return (
    <DashboardShell>
      {/* Botón flotante Kapi — Análisis inteligente */}
      <div className="mb-6 glass-dark rounded-3xl p-5 border border-[rgba(90,190,145,0.2)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#2BA470] to-[#137C53] flex items-center justify-center shadow-lg shrink-0">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold text-sm">¿Dudas sobre tus Scope 1, 2 y 3?</h2>
            <p className="text-[rgba(255,255,255,0.65)] text-xs">Kapi Copilot analiza tu matriz de emisiones y sugiere palancas de reducción óptimas.</p>
          </div>
        </div>
        <button
          onClick={() => openChat()}
          className="px-4 py-2.5 rounded-xl bg-white text-[#13301F] text-xs font-bold hover:bg-[#F4F6F2] transition-colors shrink-0 flex items-center justify-center gap-2 shadow-md"
        >
          Consultar a Kapi <ArrowRight className="w-4 h-4 text-[#137C53]" />
        </button>
      </div>

      {/* Tabs superiores */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[rgba(244,246,242,0.8)] border border-[rgba(90,190,145,0.15)]">
          {[
            { id: 'huella', label: 'Inventario GHG (Corporativo)' },
            { id: 'producto', label: 'Huella de Producto (ISO 14067)' },
            { id: 'financiamiento', label: 'Impacto Financiero' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                tab === t.id
                  ? 'bg-white text-[#13301F] shadow-sm'
                  : 'text-[rgba(80,108,92,0.6)] hover:text-[#13301F]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <button
          onClick={descargarInventario}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#137C53] text-white text-xs font-bold hover:bg-[#0E2418] transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" /> Exportar Inventario (.xlsx)
        </button>
      </div>

      {/* Contenido según Tab */}
      {tab === 'huella' && (
        <div className="space-y-6">
          {/* Métricas Principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="metric-card">
              <span className="text-xs font-semibold uppercase tracking-wide text-[rgba(80,108,92,0.5)] flex items-center gap-1.5">
                Huella Total <TerminoTooltip termino="tCO2e" texto="Toneladas de CO2 equivalente según norma ISO 14064-1" />
              </span>
              <div className="mt-2 text-3xl font-black text-[#13301F]">
                {fmtInt(consolidada.huellaTotalTon)} <span className="text-base font-bold text-[rgba(80,108,92,0.4)]">tCO₂e</span>
              </div>
              <p className="mt-1 text-xs text-[rgba(80,108,92,0.6)]">Campaña {empresa.campania}</p>
            </div>

            <div className="metric-card">
              <span className="text-xs font-semibold uppercase tracking-wide text-[rgba(80,108,92,0.5)]">Intensidad Corporativa</span>
              <div className="mt-2 text-3xl font-black text-[#137C53]">
                {fmtDec(consolidada.intensidadKgPorKg)} <span className="text-base font-bold text-[rgba(80,108,92,0.4)]">kg/kg</span>
              </div>
              <p className="mt-1 text-xs text-[rgba(80,108,92,0.6)]">Promedio ponderado</p>
            </div>

            <div className="metric-card">
              <span className="text-xs font-semibold uppercase tracking-wide text-[rgba(80,108,92,0.5)]">Scope Dominante</span>
              <div className="mt-2 text-3xl font-black text-[#13301F]">
                Scope 3 <span className="text-base font-bold text-[rgba(80,108,92,0.4)]">({scopesReactivos[2]?.pct}%)</span>
              </div>
              <p className="mt-1 text-xs text-[rgba(80,108,92,0.6)]">Fletes de exportación + Fertilizantes</p>
            </div>

            <div className="metric-card">
              <span className="text-xs font-semibold uppercase tracking-wide text-[rgba(80,108,92,0.5)]">Alertas de Riesgo</span>
              <div className={`mt-2 text-3xl font-black ${alertasRojas(alertasRiesgo).length > 0 ? 'text-[#C2410C]' : 'text-[#137C53]'}`}>
                {alertasRiesgo.length} <span className="text-base font-bold text-[rgba(80,108,92,0.4)]">detectadas</span>
              </div>
              <p className="mt-1 text-xs text-[rgba(80,108,92,0.6)]">
                {alertasRojas(alertasRiesgo).length} críticas · {alertasAmarillas(alertasRiesgo).length} observaciones
              </p>
            </div>
          </div>

          {/* Gráficos de Scopes */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="glass-card rounded-3xl p-6 lg:col-span-1">
              <h3 className="font-bold text-[#13301F] text-base mb-1">Distribución por Alcance</h3>
              <p className="text-xs text-[rgba(80,108,92,0.5)] mb-4">Desglose GHG Protocol</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} dataKey="value" innerRadius={60} outerRadius={90} stroke="none" paddingAngle={4}>
                      {donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<DarkTooltip suffix=" tCO₂e" />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-4">
                {scopesReactivos.map((s) => (
                  <div key={s.nombre} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="font-medium text-[#13301F]">{s.nombre}</span>
                    </span>
                    <span className="font-bold text-[#13301F]">{fmtInt(s.valor)} tCO₂e ({s.pct}%)</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card rounded-3xl p-6 lg:col-span-2">
              <h3 className="font-bold text-[#13301F] text-base mb-1">Top 5 Fuentes de Emisión</h3>
              <p className="text-xs text-[rgba(80,108,92,0.5)] mb-4">Click en cualquier fuente para ver trazabilidad completa</p>
              <div className="space-y-4">
                {topFuentesReactivos.map((f) => {
                  const t = trazabilidadDe(f.fuente as any)
                  return (
                    <div
                      key={f.fuente}
                      onClick={() => t && setTraza(t)}
                      className={`p-4 rounded-2xl border transition-all ${
                        t
                          ? 'border-[rgba(90,190,145,0.2)] bg-white/70 hover:bg-white hover:border-[#137C53] cursor-pointer shadow-sm'
                          : 'border-[rgba(90,190,145,0.1)] bg-[rgba(244,246,242,0.5)]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-black text-white"
                            style={{ backgroundColor: colorScope(f.scope as unknown as 1|2|3) }}
                          >
                            Scope {f.scope}
                          </span>
                          <span className="font-bold text-sm text-[#13301F]">{f.fuente}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-extrabold text-sm text-[#137C53]">{fmtInt(f.emisiones)} tCO₂e</span>
                          <span className="text-xs font-semibold text-[rgba(80,108,92,0.5)]">({f.pct}%)</span>
                          {t && <ChevronRight className="w-4 h-4 text-[rgba(80,108,92,0.4)]" />}
                        </div>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[rgba(90,190,145,0.1)] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${f.pct}%`, backgroundColor: colorScope(f.scope as unknown as 1|2|3) }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'producto' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-4 overflow-x-auto pb-2">
            <button
              onClick={() => setProd('todas')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                prod === 'todas'
                  ? 'bg-[#13301F] text-white shadow-md'
                  : 'bg-white text-[rgba(80,108,92,0.7)] border border-[rgba(90,190,145,0.2)] hover:border-[#137C53]'
              }`}
            >
              Todos los productos
            </button>
            {productosReactivos.map((p) => (
              <button
                key={p.id}
                onClick={() => setProd(p.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  prod === p.id
                    ? 'bg-[#13301F] text-white shadow-md'
                    : 'bg-white text-[rgba(80,108,92,0.7)] border border-[rgba(90,190,145,0.2)] hover:border-[#137C53]'
                }`}
              >
                {p.nombre}
              </button>
            ))}
          </div>

          {prod === 'todas' ? (
            <VistaTodas productosList={productosReactivos} />
          ) : (
            prodSel && <VistaDetalle p={prodSel} />
          )}
        </div>
      )}

      {tab === 'financiamiento' && (
        <div className="space-y-6">
          <div className="glass-card rounded-3xl p-6">
            <h3 className="font-bold text-[#13301F] text-base mb-2">Impacto en Financiamiento Verde</h3>
            <p className="text-xs text-[rgba(80,108,92,0.6)] mb-6">
              Tu huella auditada califica para tasas preferenciales con entidades financieras asociadas a AgroFinance.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {bancos.map((b) => (
                <div key={b.banco} className="p-5 rounded-2xl border border-[rgba(90,190,145,0.2)] bg-white/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#13301F]">{b.banco}</span>
                    <span className="badge badge-emerald">{b.beneficio}</span>
                  </div>
                  <p className="text-xs text-[rgba(80,108,92,0.7)]">{b.estado}</p>
                  <Link
                    href="/financiamiento/"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#137C53] hover:underline pt-2"
                  >
                    Ver línea de crédito <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Trazabilidad */}
      <AnimatePresence>
        {traza && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-[rgba(90,190,145,0.2)]"
            >
              {/* Header */}
              <div className="p-5 sm:p-6 border-b border-[rgba(90,190,145,0.12)] flex items-center justify-between gap-3">
                <span className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-[#0E2418]" style={{ backgroundColor: colorScope(traza.scope) }}>S{traza.scope}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-black text-[#13301F] leading-tight">{traza.titulo}</h3>
                  <p className="text-xs text-[rgba(80,108,92,0.6)]">Trazabilidad de la emisión — del indicador al documento de origen</p>
                </div>
                <button onClick={() => setTraza(null)} className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[rgba(80,108,92,0.5)] hover:bg-[rgba(90,190,145,0.1)] hover:text-[#13301F] transition-colors" aria-label="Cerrar">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 sm:p-6 max-h-[66vh] overflow-y-auto space-y-5">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-widest text-[rgba(80,108,92,0.5)] mb-2.5 flex items-center gap-1.5"><Calculator className="w-3.5 h-3.5 text-[#137C53]" /> Cómo se calculó</div>
                  {traza.lineas.map((l, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2 mb-2">
                      <CalcBox label="Actividad" value={fmtInt(l.actividad)} unit={l.actividadUnidad} sub={l.concepto} />
                      <span className="font-black text-[rgba(80,108,92,0.4)]">×</span>
                      <CalcBox label="Factor de emisión" value={String(l.factor)} unit={l.factorUnidad} sub={traza.factorFuente} />
                      <span className="font-black text-[rgba(80,108,92,0.4)]">=</span>
                      <CalcBox label="Emisión" value={fmtInt(l.emisionKg / 1000)} unit="tCO₂e" green />
                    </div>
                  ))}
                  {traza.asignacionNota && <p className="text-xs text-[rgba(80,108,92,0.7)] mt-2 leading-relaxed">{traza.asignacionNota}</p>}
                  <p className="text-xs text-[rgba(80,108,92,0.55)] mt-1.5">Valor en el dashboard (asignado al producto exportado): <strong className="text-[#137C53]">{fmtInt(traza.emisionTon)} tCO₂e</strong></p>
                </div>

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold uppercase tracking-widest text-[rgba(80,108,92,0.5)] flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-[#137C53]" /> Registros de origen</div>
                      <p className="text-xs text-[rgba(80,108,92,0.55)] mt-0.5">Leído de tu archivo · <span className="text-[#137C53] font-medium">{traza.archivoNota}</span></p>
                    </div>
                    <span className="flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[rgba(90,190,145,0.1)] border border-[rgba(90,190,145,0.2)] text-[11px] font-semibold text-[#137C53]"><FileSpreadsheet className="w-3.5 h-3.5" /> {traza.archivo}</span>
                  </div>
                  <div className="rounded-xl border border-[rgba(90,190,145,0.12)] overflow-hidden overflow-x-auto">
                    <table className="w-full text-xs min-w-[460px]">
                      <thead>
                        <tr className="bg-[rgba(244,246,242,0.9)] text-[rgba(80,108,92,0.5)] text-left uppercase tracking-wide text-[10px]">
                          <th className="px-3 py-2 font-semibold">Referencia</th>
                          <th className="px-3 py-2 font-semibold">Fecha</th>
                          <th className="px-3 py-2 font-semibold">Proveedor</th>
                          <th className="px-3 py-2 font-semibold text-right">Cantidad</th>
                        </tr>
                      </thead>
                      <tbody>
                        {traza.registros.map((r, i) => (
                          <tr key={i} className="border-t border-[rgba(90,190,145,0.07)]">
                            <td className="px-3 py-2 font-semibold text-[#13301F] whitespace-nowrap">{r.referencia}</td>
                            <td className="px-3 py-2 text-[rgba(80,108,92,0.7)] whitespace-nowrap">{r.fecha}</td>
                            <td className="px-3 py-2 text-[rgba(80,108,92,0.7)]">{r.proveedor}</td>
                            <td className="px-3 py-2 text-right font-medium text-[#13301F] whitespace-nowrap">{r.cantidad}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[11px] text-[rgba(80,108,92,0.45)] mt-2">Columnas leídas: <span className="font-mono">{traza.columnasLeidas.join(', ')}</span> · Mostrando {traza.registros.length} de {fmtInt(traza.registrosTotal)} registros</p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-5 border-t border-[rgba(90,190,145,0.12)] bg-[rgba(244,246,242,0.6)]">
                <p className="text-[11px] text-[rgba(80,108,92,0.6)] flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-[#137C53] flex-shrink-0" /> GHG Protocol · cada registro vincula a su documento de origen para auditoría</p>
                <button onClick={() => descargarEvidencia(traza)} className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#13301F] text-white text-xs font-semibold hover:bg-[#0E2418] active:scale-95 transition-all">
                  <Download className="w-4 h-4" /> Descargar evidencia (.csv)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardShell>
  )
}
