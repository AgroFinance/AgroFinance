'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line,
} from 'recharts'
import {
  BarChart3, Download, Leaf, TrendingDown, CheckCircle2,
  Building2, ArrowRight, FileText, X, Calculator, ChevronRight,
  FileSpreadsheet, ShieldCheck, Search,
} from 'lucide-react'
import DashboardShell from '@/components/layout/DashboardShell'
import {
  scopes, topFuentes, metodologia, productos, bancos, empresa,
  fmtInt, fmtDec, fmtUSD, C, type Producto,
} from '@/lib/analyticsData'
import { trazabilidadDe, type Trazabilidad } from '@/lib/trazabilidad'

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
  const { exportarExcel } = await import('@/lib/exports') as any
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
    ahorro: hasUploaded ? 87500 : 0,
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

// ---------- Vista comparativa de productos ----------
function VistaTodas({ productosList }: { productosList: typeof productos }) {
  const chartData = productosList.map((p) => ({
    nombre: p.nombre.replace(' frescos', '').replace(' Hass', ''),
    AgroFinance: p.intensidad,
    Benchmark: p.benchmark,
  }))
  return (
    <div className="space-y-6">
      <div className="glass-card rounded-3xl p-6 overflow-x-auto">
        <h3 className="font-bold text-[#13301F] text-base mb-4">Comparativa por producto</h3>
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-[rgba(80,108,92,0.5)] border-b border-[rgba(90,190,145,0.1)]">
              <th className="py-2 pr-3 font-semibold">Producto</th>
              <th className="py-2 pr-3 text-right font-semibold">Vol. exportado</th>
              <th className="py-2 pr-3 text-right font-semibold">Huella total</th>
              <th className="py-2 pr-3 text-right font-semibold">Intensidad</th>
              <th className="py-2 pr-3 text-right font-semibold">Benchmark EU</th>
              <th className="py-2 text-right font-semibold">Δ vs ant.</th>
            </tr>
          </thead>
          <tbody>
            {productosList.map((p) => (
              <tr key={p.id} className="border-b border-[rgba(90,190,145,0.06)] last:border-0">
                <td className="py-3 pr-3 font-semibold text-[#13301F]">{p.nombre}</td>
                <td className="py-3 pr-3 text-right text-[rgba(80,108,92,0.8)]">{fmtInt(p.volumen)} t</td>
                <td className="py-3 pr-3 text-right font-bold text-[#137C53]">{fmtInt(p.huellaTotal)} tCO₂e</td>
                <td className="py-3 pr-3 text-right font-bold text-[#13301F]">{fmtDec(p.intensidad)} <span className="text-xs font-normal text-[rgba(80,108,92,0.4)]">kg/kg</span></td>
                <td className="py-3 pr-3 text-right text-[rgba(80,108,92,0.5)]">{fmtDec(p.benchmark)}</td>
                <td className="py-3 text-right">
                  <span className="badge badge-emerald inline-flex"><TrendingDown className="w-3 h-3" />{Math.abs(p.deltaPct)}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="glass-card rounded-3xl p-6">
        <h3 className="font-bold text-[#13301F] text-base">Intensidad actual vs. benchmark sectorial EU</h3>
        <p className="text-xs text-[rgba(80,108,92,0.5)] mb-4">kgCO₂e por kg de producto — menor es mejor</p>
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
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[rgba(80,108,92,0.25)]" /><span className="text-[rgba(80,108,92,0.6)]">Benchmark EU</span></span>
        </div>
      </div>
    </div>
  )
}

// ---------- Detalle por producto ----------
function VistaDetalle({ p }: { p: Producto }) {
  const margen = Math.round((1 - p.intensidad / p.limiteTesco) * 100)
  const scopeData = [
    { name: 'Scope 1', value: p.scope.s1, color: C.s1 },
    { name: 'Scope 2', value: p.scope.s2, color: C.s2 },
    { name: 'Scope 3', value: p.scope.s3, color: C.s3 },
  ]
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Volumen total', value: fmtInt(p.volumen), unit: 't' },
          { label: 'Huella total', value: fmtInt(p.huellaTotal), unit: 'tCO₂e' },
          { label: 'Intensidad', value: fmtDec(p.intensidad), unit: 'kg/kg' },
          { label: 'vs. benchmark', value: `${margen}%`, unit: 'debajo' },
        ].map((k, i) => (
          <div key={i} className="metric-card">
            <div className="text-xs uppercase tracking-wide text-[rgba(80,108,92,0.5)]">{k.label}</div>
            <div className="mt-1 text-2xl font-black text-[#137C53]">{k.value} <span className="text-sm font-semibold text-[rgba(80,108,92,0.4)]">{k.unit}</span></div>
          </div>
        ))}
      </div>

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
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="flex items-start gap-3 rounded-2xl border border-[rgba(90,190,145,0.25)] bg-[rgba(90,190,145,0.06)] p-4">
          <CheckCircle2 className="w-5 h-5 text-[#137C53] flex-shrink-0 mt-0.5" />
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

export default function AnalisisPage() {
  const [tab, setTab] = useState<'huella' | 'producto' | 'financiamiento'>('huella')
  const [prod, setProd] = useState('todas')
  const [hasData, setHasData] = useState(false)
  const [traza, setTraza] = useState<Trazabilidad | null>(null) // drill-down de trazabilidad

  useEffect(() => {
    setHasData(localStorage.getItem('agrofinance_has_data') === 'true')
    // Sincroniza la pestaña con la URL (?tab=) que usa el sidebar del shell
    const t = new URLSearchParams(window.location.search).get('tab')
    if (t === 'producto' || t === 'financiamiento' || t === 'huella') setTab(t)
  }, [])

  const displayScopes = hasData ? scopes : scopes.map(s => ({ ...s, valor: 0, pct: 0 }))
  const displayTopFuentes = hasData ? topFuentes : topFuentes.map(f => ({ ...f, emisiones: 0, pct: 0 }))
  const displayProductos = hasData ? productos : productos.map(p => ({
    ...p,
    volumen: 0,
    huellaTotal: 0,
    intensidad: 0,
    deltaPct: 0,
    tendencia: p.tendencia.map(t => ({ ...t, intensidad: 0 })),
    scope: { s1: 0, s2: 0, s3: 0 }
  }))
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
          <p className="text-[rgba(80,108,92,0.6)] mt-1 text-sm">Contabilidad de emisiones por alcance (Scope 1, 2 y 3) consolidada de todas las áreas</p>
        </motion.div>

        {/* Warning banner when empty — slim & profesional */}
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
                  Las gráficas y comparativas se muestran en cero. Sube los archivos de <strong>C:\AgroFinance-main\DATA</strong> para habilitar las métricas.
                </p>
              </div>
            </div>
            <a
              href="/upload/"
              className="flex-shrink-0 inline-block px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#2BA470] to-[#137C53] text-[#FBF4D6] font-bold text-xs shadow-sm hover:brightness-105 active:scale-95 transition-all whitespace-nowrap text-center"
            >
              Cargar datos ➔
            </a>
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {displayScopes.map((s) => (
                  <div key={s.id} className="glass-card rounded-3xl p-6 flex flex-col">
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
                          <span className="text-xs font-semibold text-[rgba(80,108,92,0.4)]">tCO₂e</span>
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
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="glass-card rounded-3xl p-6 lg:col-span-2">
                  <h3 className="font-bold text-[#13301F] text-base">Distribución por alcance</h3>
                  <p className="text-xs text-[rgba(80,108,92,0.5)] mb-2">Total: {fmtInt(hasData ? empresa.huellaTotal : 0)} tCO₂e</p>
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
                            className={`border-b border-[rgba(90,190,145,0.06)] last:border-0 ${hasData ? 'cursor-pointer hover:bg-[rgba(90,190,145,0.06)] transition-colors' : ''}`}
                          >
                            <td className="py-3 pr-2 font-bold text-[rgba(80,108,92,0.4)]">{f.n}</td>
                            <td className="py-3 pr-2 font-medium text-[#13301F]">{f.fuente}</td>
                            <td className="py-3 pr-2 text-right font-bold text-[#137C53]">{fmtInt(f.emisiones)} <span className="text-xs font-normal text-[rgba(80,108,92,0.4)]">tCO₂e</span></td>
                            <td className="py-3 pr-2 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="hidden sm:block h-1.5 w-16 overflow-hidden rounded-full bg-[rgba(90,190,145,0.08)]">
                                  <div className="h-full rounded-full" style={{ width: `${(f.pct / 26) * 100}%`, background: f.color }} />
                                </div>
                                <span className="font-semibold text-[rgba(80,108,92,0.8)]">{f.pct}%</span>
                              </div>
                            </td>
                            <td className="py-3 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <span className="inline-block rounded-md px-2 py-0.5 text-xs font-bold text-[#0E2418]" style={{ backgroundColor: f.color }}>{f.scope}</span>
                                {hasData && <ChevronRight className="w-4 h-4 text-[rgba(80,108,92,0.35)]" />}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-2xl p-4 flex items-start gap-3">
                <Leaf className="w-4 h-4 text-[#137C53] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-[rgba(80,108,92,0.6)] leading-relaxed"><strong className="text-[#137C53]">Metodología:</strong> {metodologia}</p>
              </div>
            </motion.div>
          )}

          {/* ----- POR PRODUCTO ----- */}
          {tab === 'producto' && (
            <motion.div key="producto" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="mb-6 flex flex-wrap gap-2">
                {[{ id: 'todas', nombre: 'Todas' }, ...displayProductos.map((p) => ({ id: p.id, nombre: p.nombre }))].map((t) => (
                  <button key={t.id} onClick={() => setProd(t.id)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${prod === t.id ? 'bg-[rgba(90,190,145,0.15)] text-[#137C53] border border-[rgba(90,190,145,0.3)]' : 'border border-[rgba(90,190,145,0.12)] text-[rgba(80,108,92,0.6)] hover:text-[#137C53]'}`}>
                    {t.nombre}
                  </button>
                ))}
              </div>
              {prod === 'todas' ? <VistaTodas productosList={displayProductos} /> : productoActivo && <VistaDetalle p={productoActivo} />}
            </motion.div>
          )}

          {/* ----- FINANCIAMIENTO VERDE ----- */}
          {tab === 'financiamiento' && (
            <motion.div key="financiamiento" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {displayBancos.map((b) => (
                <div key={b.id} className="glass-card rounded-3xl p-6 flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[rgba(90,190,145,0.08)] flex items-center justify-center"><Building2 className="w-5 h-5 text-[#137C53]" /></div>
                    <div>
                      <div className="text-base font-bold text-[#13301F]">{b.banco}</div>
                      <div className="text-xs text-[rgba(80,108,92,0.5)]">{b.producto}</div>
                    </div>
                  </div>
                  <div className="mb-1 text-xs text-[rgba(80,108,92,0.5)]">Línea aprobable</div>
                  <div className="text-2xl font-black text-[#137C53] mb-3">{fmtUSD(b.lineaAprobable)}</div>
                  <p className="text-xs text-[rgba(80,108,92,0.7)] mb-4 leading-relaxed">{b.beneficio}</p>
                  <div className="mt-auto">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-[rgba(80,108,92,0.5)]">{b.estado}</span>
                      <span className="font-bold text-[#137C53]">{b.progreso}%</span>
                    </div>
                    <div className="h-2 bg-[rgba(90,190,145,0.08)] rounded-full overflow-hidden mb-4">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${b.progreso}%` }} transition={{ duration: 1 }} className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #C5E0CF, #137C53)' }} />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[rgba(80,108,92,0.5)]">Ahorro anual</span>
                      <span className="font-bold text-[#13301F]">{fmtUSD(b.ahorroAnual)}/año</span>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA a Kapi */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <a href="/copilot/" className="btn-secondary text-sm flex items-center justify-center gap-2 py-3">
            <FileText className="w-4 h-4" />Preguntar a Kapi sobre estos datos<ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* ===== MODAL DE TRAZABILIDAD (drill-down) ===== */}
      <AnimatePresence>
        {traza && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setTraza(null)}
            className="fixed inset-0 z-[70] bg-[rgba(11,46,33,0.55)] backdrop-blur-sm flex items-start sm:items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-6 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-start gap-3 p-5 sm:p-6 border-b border-[rgba(90,190,145,0.12)]">
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
                {/* Cómo se calculó */}
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

                {/* Registros de origen */}
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
