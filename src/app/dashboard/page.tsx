'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts'
import {
  TrendingDown, AlertTriangle, FileText, ChevronRight, CheckCircle2,
} from 'lucide-react'
import DashboardShell from '@/components/layout/DashboardShell'
import { getLatestAnalysisFromFirestore } from '@/lib/firebaseService'

// ─── Datos (campaña 2025-2026) ─────────────────────────────────────────────
const KPI = {
  huellaTotal: 14820,
  reduccionPct: 8,
  intensidad: 0.41,
  benchmark: 0.52,
  ahorro: 87500,
  cumplimiento: { listas: 4, total: 5 },
}

const emisionesMensuales = [
  { mes: 'Jul 25', emisiones: 1380, benchmark: 1560 },
  { mes: 'Ago 25', emisiones: 1310, benchmark: 1560 },
  { mes: 'Sep 25', emisiones: 1185, benchmark: 1480 },
  { mes: 'Oct 25', emisiones: 1240, benchmark: 1480 },
  { mes: 'Nov 25', emisiones: 1420, benchmark: 1520 },
  { mes: 'Dic 25', emisiones: 1510, benchmark: 1520 },
  { mes: 'Ene 26', emisiones: 1290, benchmark: 1440 },
  { mes: 'Feb 26', emisiones: 1120, benchmark: 1440 },
  { mes: 'Mar 26', emisiones: 1180, benchmark: 1400 },
  { mes: 'Abr 26', emisiones: 1095, benchmark: 1400 },
  { mes: 'May 26', emisiones: 1010, benchmark: 1360 },
  { mes: 'Jun 26', emisiones: 960, benchmark: 1360 },
]

const compliance = [
  { nombre: 'CSRD / EUDR', region: 'Unión Europea', estado: 'listo' },
  { nombre: 'Tesco Sustainability Network', region: 'Reino Unido', estado: 'listo' },
  { nombre: 'ISO 14064', region: 'Verificación internacional', estado: 'proceso' },
  { nombre: 'BBVA Sustainability-Linked Loan', region: 'Banca verde', estado: 'pendiente' },
  { nombre: 'MINAM Huella de Carbono Perú', region: 'Perú', estado: 'listo' },
] as const

const badgeStyles: Record<string, { text: string; classes: string }> = {
  listo: { text: 'Listo', classes: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  proceso: { text: 'En proceso', classes: 'bg-blue-100 text-blue-700 border-blue-200' },
  pendiente: { text: 'Doc. pendiente', classes: 'bg-amber-100 text-amber-700 border-amber-200' },
}

const fmt = (n: number) => n.toLocaleString('es-PE')

export default function DashboardPage() {
  const router = useRouter()
  const [hasData, setHasData] = useState(false)

  useEffect(() => {
    setHasData(localStorage.getItem('agrofinance_has_data') === 'true')
    getLatestAnalysisFromFirestore().then((a) => {
      if (a) { setHasData(true); localStorage.setItem('agrofinance_has_data', 'true') }
    })
  }, [])

  const displayEmisiones = hasData
    ? emisionesMensuales
    : emisionesMensuales.map(e => ({ ...e, emisiones: 0 }))

  // Descarga un reporte CSV con el resumen del dashboard
  const descargarReporteHC = () => {
    const filas: (string | number)[][] = [
      ['Reporte HC Perú · Chavín de Huántar S.A.C.', new Date().toLocaleString('es-PE')],
      [],
      ['KPI', 'Valor', 'Unidad'],
      ['Huella Total', hasData ? KPI.huellaTotal : 0, 'tCO2e'],
      ['Intensidad Promedio', hasData ? KPI.intensidad : 0, 'kgCO2e/kg'],
      ['Ahorro Potencial Crédito Verde', hasData ? KPI.ahorro : 0, 'USD/año'],
      ['Progreso de Cumplimiento', hasData ? `${KPI.cumplimiento.listas}/${KPI.cumplimiento.total}` : '0/5', 'regulaciones'],
      [],
      ['Mes', 'Emisiones', 'Benchmark'],
      ...displayEmisiones.map(d => [d.mes, d.emisiones, d.benchmark]),
    ]
    const csv = filas.map(f => f.map(c => `"${c ?? ''}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Reporte_HC_Peru_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const pct = Math.round((KPI.cumplimiento.listas / KPI.cumplimiento.total) * 100)

  return (
    <DashboardShell>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-[#13301F] tracking-tight">Panel de indicadores</h1>
        <p className="text-sm text-[rgba(80,108,92,0.6)] mt-1">
          Resumen consolidado de la campaña 2025-2026 — un clic, todos los indicadores
        </p>
      </motion.div>

      {/* Warning banner when empty */}
      {!hasData && (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-[rgba(210,145,47,0.3)] bg-[rgba(210,145,47,0.06)] p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-3"
        >
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[rgba(210,145,47,0.12)] border border-[rgba(210,145,47,0.2)] flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-[#D2912F]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-[#13301F]">Panel sin datos</h3>
              <p className="text-xs text-[rgba(80,108,92,0.75)] leading-relaxed mt-0.5">
                Sube tu carpeta de campaña desde <strong>C:\AgroFinance-main\DATA</strong> para activar los indicadores.
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push('/upload/')}
            className="flex-shrink-0 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#2BA470] to-[#137C53] text-white font-bold text-xs shadow-sm hover:brightness-105 active:scale-95 transition-all whitespace-nowrap"
          >
            Cargar datos ➔
          </button>
        </motion.div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {/* Huella total */}
        <KpiCard label="Huella total" delay={0}>
          <div className="text-3xl font-black text-[#13301F]">{hasData ? fmt(KPI.huellaTotal) : '0'}<span className="text-base font-bold text-[rgba(80,108,92,0.45)] ml-1">tCO₂e</span></div>
          {hasData && (
            <span className="inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
              <TrendingDown className="w-3.5 h-3.5" /> {KPI.reduccionPct}% vs campaña anterior
            </span>
          )}
        </KpiCard>

        {/* Intensidad */}
        <KpiCard label="Intensidad promedio" delay={0.06}>
          <div className="text-3xl font-black text-[#13301F]">{hasData ? KPI.intensidad.toFixed(2) : '0.00'}<span className="text-base font-bold text-[rgba(80,108,92,0.45)] ml-1">kgCO₂e/kg</span></div>
          <div className="text-xs text-[rgba(80,108,92,0.6)] mt-3">Benchmark sector: <strong className="text-[#13301F]">{KPI.benchmark.toFixed(2)}</strong></div>
        </KpiCard>

        {/* Ahorro */}
        <KpiCard label="Ahorro potencial crédito verde" delay={0.12}>
          <div className="text-3xl font-black text-[#13301F]">{hasData ? `US$ ${fmt(KPI.ahorro)}` : 'US$ 0'}<span className="text-base font-bold text-[rgba(80,108,92,0.45)] ml-1">/año</span></div>
          <div className="text-xs text-[rgba(80,108,92,0.6)] mt-3">{hasData ? '−35 bps con BBVA SLL' : 'Requiere vinculación'}</div>
        </KpiCard>

        {/* Cumplimiento */}
        <KpiCard label="Progreso de cumplimiento" delay={0.18}>
          <div className="text-3xl font-black text-[#13301F]">{hasData ? KPI.cumplimiento.listas : 0}/{KPI.cumplimiento.total}<span className="text-base font-bold text-[rgba(80,108,92,0.45)] ml-1">regulaciones</span></div>
          <div className="mt-3">
            <div className="h-1.5 rounded-full bg-[rgba(90,190,145,0.12)] overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: hasData ? `${pct}%` : '0%' }} transition={{ duration: 1 }} className="h-full rounded-full bg-gradient-to-r from-[#2BA470] to-[#137C53]" />
            </div>
            <div className="text-xs text-[rgba(80,108,92,0.6)] mt-1.5">{hasData ? 'activas' : 'pendiente'}</div>
          </div>
        </KpiCard>
      </div>

      {/* Chart + Compliance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* Evolución mensual */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-white rounded-2xl border border-[rgba(90,190,145,0.12)] p-5 sm:p-6 shadow-[0_2px_16px_rgba(90,110,95,0.06)]">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <h3 className="font-bold text-[#13301F] text-base">Evolución mensual de emisiones</h3>
              <p className="text-xs text-[rgba(80,108,92,0.55)] mt-0.5">tCO₂e — últimos 12 meses vs benchmark sectorial</p>
            </div>
            {hasData && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[rgba(90,190,145,0.1)] text-[#137C53] text-xs font-semibold whitespace-nowrap">
                <TrendingDown className="w-3.5 h-3.5" /> tendencia a la baja
              </span>
            )}
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={displayEmisiones} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(90,190,145,0.08)" />
                <XAxis dataKey="mes" tick={{ fill: 'rgba(80,108,92,0.45)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(80,108,92,0.45)', fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid rgba(90,190,145,0.2)', background: '#fff', fontSize: 12, boxShadow: '0 8px 24px rgba(16,40,28,0.10)' }}
                  formatter={(v: number, name: string) => [`${fmt(v)} tCO₂e`, name === 'emisiones' ? 'Emisiones' : 'Benchmark']}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  formatter={(value) => (value === 'emisiones' ? 'Emisiones AgroFinance' : 'Benchmark sectorial')} />
                <Bar dataKey="emisiones" radius={[4, 4, 0, 0]} maxBarSize={26}>
                  {displayEmisiones.map((_, i) => (
                    <Cell key={i} fill={i >= displayEmisiones.length - 4 ? '#52b788' : '#2d6a4f'} />
                  ))}
                </Bar>
                <Line type="monotone" dataKey="benchmark" stroke="#1a1a1a" strokeWidth={2} strokeDasharray="5 4" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Estado de cumplimiento */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}
          className="bg-white rounded-2xl border border-[rgba(90,190,145,0.12)] p-5 sm:p-6 shadow-[0_2px_16px_rgba(90,110,95,0.06)]">
          <h3 className="font-bold text-[#13301F] text-base">Estado de cumplimiento</h3>
          <p className="text-xs text-[rgba(80,108,92,0.55)] mb-4">Regulaciones y marcos activos</p>
          <div className="space-y-2.5">
            {compliance.map((r, i) => {
              const s = badgeStyles[hasData ? r.estado : 'pendiente']
              return (
                <div key={i} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#F7FAF7] border border-[rgba(90,190,145,0.08)]">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#13301F] truncate">{r.nombre}</div>
                    <div className="text-[10px] text-[rgba(80,108,92,0.5)] truncate">{r.region}</div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full border whitespace-nowrap ${s.classes}`}>{s.text}</span>
                </div>
              )
            })}
          </div>
        </motion.div>
      </div>

      {/* Reportes recientes */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
        className="bg-white rounded-2xl border border-[rgba(90,190,145,0.12)] p-5 sm:p-6 shadow-[0_2px_16px_rgba(90,110,95,0.06)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[#13301F] text-base">Reportes recientes</h3>
          <button onClick={descargarReporteHC} className="text-xs text-[#137C53] font-semibold flex items-center gap-1 hover:gap-2 transition-all">
            Descargar todos <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { name: 'HC Perú Q3 2025', date: 'Sep 30, 2025', status: hasData ? 'Certificado' : 'Falta datos' },
            { name: 'Reporte GRI Q2 2025', date: 'Jun 30, 2025', status: hasData ? 'Aprobado' : 'Falta datos' },
            { name: 'TCFD Anual 2024', date: 'Dic 31, 2024', status: hasData ? 'Archivado' : 'Falta datos' },
          ].map((r, i) => (
            <button key={i} onClick={descargarReporteHC}
              className="flex items-center gap-3 p-4 rounded-xl bg-[#F7FAF7] border border-[rgba(90,190,145,0.08)] hover:border-[rgba(90,190,145,0.25)] transition-all text-left">
              <div className="w-10 h-10 rounded-xl bg-[rgba(90,190,145,0.1)] flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-[#137C53]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[#13301F] truncate">{r.name}</div>
                <div className="text-xs text-[rgba(80,108,92,0.5)]">{r.date}</div>
              </div>
              {hasData && <CheckCircle2 className="w-4 h-4 text-[#137C53] flex-shrink-0" />}
            </button>
          ))}
        </div>
      </motion.div>
    </DashboardShell>
  )
}

function KpiCard({ label, children, delay }: { label: string; children: React.ReactNode; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="bg-white rounded-2xl border border-[rgba(90,190,145,0.12)] p-5 shadow-[0_2px_16px_rgba(90,110,95,0.06)]"
    >
      <div className="text-[11px] font-semibold uppercase tracking-wider text-[rgba(80,108,92,0.5)] mb-2">{label}</div>
      {children}
    </motion.div>
  )
}
