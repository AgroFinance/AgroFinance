'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell, ComposedChart, Legend
} from 'recharts'
import {
  TrendingDown, TrendingUp, Leaf, Zap, Globe2, AlertTriangle,
  FileText, Download, RefreshCw, Bell, ChevronRight, Sparkles,
  BarChart3, Activity, Droplet
} from 'lucide-react'
import Navigation from '@/components/layout/Navigation'
import CapybaraBot from '@/components/mascot/CapybaraBot'
import { cooperativa } from '@/lib/pilotEngine'
import { getLatestAnalysisFromFirestore } from '@/lib/firebaseService'

// Data
const emissionsData = [
  { month: 'Ene', scope1: 280, scope2: 190, scope3: 1820 },
  { month: 'Feb', scope1: 265, scope2: 180, scope3: 1750 },
  { month: 'Mar', scope1: 310, scope2: 200, scope3: 1940 },
  { month: 'Abr', scope1: 290, scope2: 185, scope3: 1880 },
  { month: 'May', scope1: 275, scope2: 175, scope3: 1790 },
  { month: 'Jun', scope1: 260, scope2: 170, scope3: 1710 },
  { month: 'Jul', scope1: 285, scope2: 195, scope3: 1850 },
  { month: 'Ago', scope1: 270, scope2: 182, scope3: 1780 },
  { month: 'Sep', scope1: 295, scope2: 198, scope3: 1920 },
  { month: 'Oct', scope1: 285, scope2: 188, scope3: 1860 },
  { month: 'Nov', scope1: 275, scope2: 180, scope3: 1800 },
  { month: 'Dic', scope1: 255, scope2: 165, scope3: 1680 },
]

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

const esgRadar = [
  { subject: 'Ambiental', A: 87, fullMark: 100 },
  { subject: 'Social', A: 72, fullMark: 100 },
  { subject: 'Gobernanza', A: 91, fullMark: 100 },
  { subject: 'Clima', A: 78, fullMark: 100 },
  { subject: 'Agua', A: 65, fullMark: 100 },
  { subject: 'Biodiversidad', A: 70, fullMark: 100 },
]

const scope3Categories = [
  { cat: 'Transporte Marítimo', value: 6820, pct: 37 },
  { cat: 'Materiales Comprados', value: 4210, pct: 23 },
  { cat: 'Uso del Producto', value: 3150, pct: 17 },
  { cat: 'Residuos', value: 2040, pct: 11 },
  { cat: 'Viajes Negocio', value: 1200, pct: 7 },
  { cat: 'Otros', value: 1000, pct: 5 },
]

const aiInsights = [
  {
    type: 'alert',
    color: 'amber',
    icon: AlertTriangle,
    title: 'Alerta Scope 3',
    message: 'Tus emisiones Scope 3 aumentaron 14% vs. el mes anterior. Transporte marítimo es el principal driver.',
    action: 'Ver análisis',
    target: '/analisis/',
  },
  {
    type: 'opportunity',
    color: 'emerald',
    icon: TrendingDown,
    title: 'Oportunidad detectada',
    message: 'Optimizar la ruta Lima→Rotterdam podría reducir 840 tCO₂e anuales (-12% Scope 3).',
    action: 'Ver opciones',
    target: '/copilot/',
  },
  {
    type: 'info',
    color: 'blue',
    icon: Sparkles,
    title: 'Reporte listo',
    message: 'Tu reporte HC Perú Q3 2025 está listo para descarga y certificación.',
    action: 'Descargar',
    target: 'download',
  },
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-dark rounded-2xl p-4 border border-[rgba(90,190,145,0.15)] text-xs">
        <p className="text-[#137C53] font-semibold mb-2">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-[rgba(80,108,92,0.8)]" style={{ color: entry.color }}>
            {entry.name}: {entry.value.toLocaleString()} tCO₂e
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function DashboardPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'overview' | 'scope3' | 'esg'>('overview')
  const [refreshing, setRefreshing] = useState(false)
  const [updatedAt, setUpdatedAt] = useState('hace 2 minutos')
  const [hasData, setHasData] = useState(false)

  useEffect(() => {
    const localHasData = localStorage.getItem('agrofinance_has_data') === 'true'
    setHasData(localHasData)

    getLatestAnalysisFromFirestore().then((analysis) => {
      if (analysis) {
        setHasData(true)
        localStorage.setItem('agrofinance_has_data', 'true')
      }
    })
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    setTimeout(() => {
      setRefreshing(false)
      setUpdatedAt('hace unos segundos')
    }, 1100)
  }

  const handleInsight = (target: string) => {
    if (target === 'download') descargarReporteHC()
    else router.push(target)
  }

  const displayEmisiones = hasData
    ? emisionesMensuales.map(e => ({
        ...e,
        emisiones: +(e.emisiones * (cooperativa.huellaTotalTon / 14820)).toFixed(1),
        benchmark: +(e.benchmark * (cooperativa.huellaTotalTon / 14820)).toFixed(1)
      }))
    : emisionesMensuales.map(e => ({
        ...e,
        emisiones: 0,
        benchmark: +(e.benchmark * (cooperativa.huellaTotalTon / 14820)).toFixed(1)
      }))

  const displayScope3Categories = hasData
    ? scope3Categories
    : scope3Categories.map(c => ({ cat: c.cat, value: 0, pct: 0 }))

  const displayEsgRadar = hasData
    ? esgRadar
    : esgRadar.map(r => ({ subject: r.subject, A: 0, fullMark: r.fullMark }))

  const displayInsights = hasData
    ? aiInsights
    : [
        {
          type: 'alert',
          color: 'amber',
          icon: AlertTriangle,
          title: 'Falta información',
          message: 'Tu panel de control está vacío. Por favor sube tu carpeta de datos de campaña.',
          action: 'Ir a Carga',
          target: '/upload/',
        }
      ]

  // Descarga un reporte CSV con el resumen del dashboard
  const descargarReporteHC = () => {
    const activeKpis = [
      { label: 'Huella Total', value: hasData ? Math.round(cooperativa.huellaTotalTon) : 0, unit: 'tCO₂e' },
      { label: 'Intensidad Promedio', value: hasData ? +cooperativa.intensidadKgPorKg.toFixed(2) : 0, unit: 'kgCO₂e/kg' },
      { label: 'Ahorro Potencial Crédito Verde', value: hasData ? 99625 : 0, unit: 'USD/año' },
      { label: 'Progreso de Cumplimiento', value: hasData ? '4/5' : '0/5', unit: 'regulaciones' }
    ]

    const filas: (string | number)[][] = [
      ['Reporte HC Perú · Climate Intelligence', new Date().toLocaleString('es-PE')],
      [],
      ['KPI', 'Valor', 'Unidad'],
      ...activeKpis.map((k) => [k.label, k.value, k.unit]),
      [],
      ['Emisiones mensuales (tCO2e)'],
      ['Mes', 'Emisiones', 'Benchmark'],
      ...displayEmisiones.map((d) => [d.mes, d.emisiones, d.benchmark]),
      [],
      ['Cumplimiento por Framework'],
      ['Framework', 'Región', 'Estado'],
      ...[
        { nombre: 'CSRD / EUDR', region: 'Unión Europea', estado: hasData ? 'Listo' : 'Doc. pendiente' },
        { nombre: 'Tesco Sustainability Network', region: 'Reino Unido', estado: hasData ? 'Listo' : 'Doc. pendiente' },
        { nombre: 'ISO 14064', region: 'Verificación internacional', estado: hasData ? 'En proceso' : 'Doc. pendiente' },
        { nombre: 'BBVA Sustainability-Linked Loan', region: 'Banca verde', estado: hasData ? 'Doc. pendiente' : 'Doc. pendiente' },
        { nombre: 'MINAM Huella de Carbono Perú', region: 'Perú', estado: hasData ? 'Listo' : 'Doc. pendiente' },
      ].map((c) => [c.nombre, c.region, c.estado]),
    ]
    const csv = filas.map((f) => f.map((c) => `"${c ?? ''}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Reporte_HC_Peru_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-[#FBF4D6]">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">

        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <div className="badge badge-emerald mb-3 inline-flex">
              <BarChart3 className="w-3 h-3" />
              Dashboard ESG · 2025
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-[#13301F] tracking-tight">
              Climate Intelligence
            </h1>
            <p className="text-[rgba(80,108,92,0.6)] mt-1 text-sm">
              Análisis en tiempo real · Actualizado {updatedAt}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2.5 glass rounded-xl text-xs font-semibold text-[#137C53] border border-[rgba(90,190,145,0.2)] hover:border-[rgba(90,190,145,0.4)] transition-all disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Actualizando…' : 'Actualizar'}
            </button>
            <button onClick={descargarReporteHC} className="flex items-center gap-2 px-4 py-2.5 btn-primary text-xs rounded-xl">
              <Download className="w-3.5 h-3.5" />
              Exportar HC Perú
            </button>
          </div>
        </motion.div>

        {/* Warning banner when empty */}
        {!hasData && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-3xl border border-[rgba(210,145,47,0.3)] bg-[rgba(251,244,214,0.98)] p-6 mb-8 text-center shadow-xl max-w-2xl mx-auto"
          >
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center mb-4 text-left">
              <div className="flex-shrink-0 bg-white/40 p-2 rounded-2xl border border-[rgba(90,190,145,0.15)]">
                <CapybaraBot size="md" mood="thinking" showGlow />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#13301F] flex items-center gap-1.5">
                  🐾 Kapi te advierte: ¡Panel sin datos!
                </h3>
                <p className="text-xs text-[rgba(80,108,92,0.8)] leading-relaxed mt-1">
                  Tu base de datos está vacía. Por favor, sube tu carpeta de archivos de campaña desde <strong>C:\AgroFinance-main\DATA</strong> en la sección de carga para activar el cálculo automático de emisiones y las gráficas.
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/upload/')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2BA470] to-[#137C53] text-[#FBF4D6] font-bold text-xs shadow-md hover:brightness-105 active:scale-95 transition-all"
            >
              Ir a Cargar Archivos de DATA ➔
            </button>
          </motion.div>
        )}

        {/* AI Insights Bar */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex gap-4 overflow-x-auto pb-2">
            {displayInsights.map((insight, i) => {
              const Icon = insight.icon
              const colors: Record<string, { bg: string, border: string, text: string }> = {
                amber: { bg: 'rgba(210,145,47,0.08)', border: 'rgba(210,145,47,0.2)', text: '#D2A24A' },
                emerald: { bg: 'rgba(90,190,145,0.08)', border: 'rgba(90,190,145,0.2)', text: '#137C53' },
                blue: { bg: 'rgba(61,127,176,0.08)', border: 'rgba(61,127,176,0.2)', text: '#3D7FB0' },
              }
              const c = colors[insight.color]
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.1 }}
                  className="flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-2xl min-w-[320px]"
                  style={{ background: c.bg, border: `1px solid ${c.border}` }}
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
                    <Icon className="w-4 h-4" style={{ color: c.text }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold mb-0.5" style={{ color: c.text }}>{insight.title}</div>
                    <div className="text-xs text-[rgba(80,108,92,0.7)] truncate">{insight.message}</div>
                  </div>
                  <button onClick={() => handleInsight(insight.target)} className="text-xs font-semibold flex items-center gap-1 flex-shrink-0 hover:gap-2 transition-all" style={{ color: c.text }}>
                    {insight.action} <ChevronRight className="w-3 h-3" />
                  </button>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Card 1: HUELLA TOTAL */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="metric-card"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10">
                <Leaf className="w-5 h-5 text-[#137C53]" />
              </div>
              {hasData && (
                <div className="flex items-center gap-1 text-xs font-bold text-[#137C53]">
                  <TrendingDown className="w-3.5 h-3.5" />
                  8%
                </div>
              )}
            </div>
            <div className="text-2xl font-black text-[#13301F] mb-1">
              {hasData ? Math.round(cooperativa.huellaTotalTon).toLocaleString('es-PE') : '0'}
            </div>
            <div className="text-xs text-[rgba(80,108,92,0.5)]">tCO₂e</div>
            <div className="text-xs font-medium text-[rgba(80,108,92,0.6)] mt-1">Huella Total</div>
          </motion.div>

          {/* Card 2: INTENSIDAD PROMEDIO */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="metric-card"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10">
                <Activity className="w-5 h-5 text-[#3D7FB0]" />
              </div>
            </div>
            <div className="text-2xl font-black text-[#13301F] mb-1">
              {hasData ? cooperativa.intensidadKgPorKg.toFixed(2) : '0.00'}
            </div>
            <div className="text-xs text-[rgba(80,108,92,0.5)]">kgCO₂e/kg</div>
            <div className="text-xs font-medium text-[rgba(80,108,92,0.6)] mt-1">
              Benchmark sector: <span className="font-semibold">0.65</span>
            </div>
          </motion.div>

          {/* Card 3: AHORRO POTENCIAL CREDITO VERDE */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.36 }}
            className="metric-card"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/10">
                <Zap className="w-5 h-5 text-[#D2A24A]" />
              </div>
            </div>
            <div className="text-2xl font-black text-[#13301F] mb-1">
              {hasData ? '$99,625' : '$0'}
            </div>
            <div className="text-xs text-[rgba(80,108,92,0.5)]">/año</div>
            <div className="text-xs font-medium text-[rgba(80,108,92,0.6)] mt-1">
              {hasData ? '−35 bps con BBVA SLL' : 'Requiere vinculación'}
            </div>
          </motion.div>

          {/* Card 4: PROGRESO DE CUMPLIMIENTO */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.44 }}
            className="metric-card"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10">
                <Globe2 className="w-5 h-5 text-[#137C53]" />
              </div>
            </div>
            <div className="text-2xl font-black text-[#13301F] mb-1">
              {hasData ? '4/5' : '0/5'}
            </div>
            <div className="text-xs text-[rgba(80,108,92,0.5)]">regulaciones</div>
            <div className="text-xs font-medium text-[rgba(80,108,92,0.6)] mt-1">
              {hasData ? 'activas' : 'pendiente'}
            </div>
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 glass rounded-2xl border border-[rgba(90,190,145,0.1)] w-fit mb-8">
          {[
            { id: 'overview', label: 'Resumen' },
            { id: 'scope3', label: 'Scope 3' },
            { id: 'esg', label: 'Score ESG' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-[rgba(90,190,145,0.15)] text-[#137C53] border border-[rgba(90,190,145,0.25)]'
                  : 'text-[rgba(80,108,92,0.5)] hover:text-[rgba(80,108,92,0.8)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Chart Area */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
            >
              {/* Main Emissions Chart */}
              <div className="lg:col-span-2 glass-card rounded-3xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-bold text-[#13301F] text-base">Evolución mensual de emisiones</h3>
                    <p className="text-xs text-[rgba(80,108,92,0.5)] mt-0.5">tCO₂e — últimos 12 meses vs benchmark sectorial</p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(90,190,145,0.08)] text-xs text-[#137C53] font-semibold">
                    {hasData ? (
                      <>
                        <TrendingDown className="w-3.5 h-3.5 animate-bounce" />
                        tendencia a la baja
                      </>
                    ) : (
                      'Esperando datos'
                    )}
                  </div>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={displayEmisiones} margin={{ top: 16, right: 8, left: -8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(90,190,145,0.06)" />
                      <XAxis
                        dataKey="mes"
                        tick={{ fill: 'rgba(80,108,92,0.4)', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: 'rgba(80,108,92,0.4)', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={48}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: '1px solid rgba(90,190,145,0.2)',
                          background: 'rgba(255, 255, 255, 0.95)',
                          fontSize: 12,
                          boxShadow: '0 8px 24px rgba(16,40,28,0.10)',
                        }}
                        formatter={(v: number, name: string) => [
                          `${v.toFixed(1)} tCO₂e`,
                          name === 'emisiones' ? 'Emisiones' : 'Benchmark',
                        ]}
                      />
                      <Legend
                        iconType="circle"
                        wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                        formatter={(value) => (value === 'emisiones' ? 'Emisiones AgroFinance' : 'Benchmark sectorial')}
                      />
                      <Bar dataKey="emisiones" fill="#2d6a4f" radius={[4, 4, 0, 0]} maxBarSize={28}>
                        {displayEmisiones.map((_, i) => (
                          <Cell key={i} fill={i >= displayEmisiones.length - 3 ? '#52b788' : '#2d6a4f'} />
                        ))}
                      </Bar>
                      <Line
                        type="monotone"
                        dataKey="benchmark"
                        stroke="#1a1a1a"
                        strokeWidth={2}
                        strokeDasharray="5 4"
                        dot={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Sidebar with Compliance and Water Footprint */}
              <div className="flex flex-col gap-6">
                {/* Compliance Card */}
                <div className="glass-card rounded-3xl p-6 flex flex-col flex-1">
                  <h3 className="font-bold text-[#13301F] text-base mb-1">Estado de cumplimiento</h3>
                  <p className="text-xs text-[rgba(80,108,92,0.5)] mb-4">Regulaciones y marcos activos</p>
                  
                  <div className="space-y-3 flex-1">
                    {[
                      { nombre: 'CSRD / EUDR', region: 'Unión Europea', estado: hasData ? 'listo' : 'pendiente' },
                      { nombre: 'Tesco Sustainability Network', region: 'Reino Unido', estado: hasData ? 'listo' : 'pendiente' },
                      { nombre: 'ISO 14064', region: 'Verificación internacional', estado: hasData ? 'proceso' : 'pendiente' },
                      { nombre: 'BBVA Sustainability-Linked Loan', region: 'Banca verde', estado: hasData ? 'pendiente' : 'pendiente' },
                      { nombre: 'MINAM Huella de Carbono Perú', region: 'Perú', estado: hasData ? 'listo' : 'pendiente' },
                    ].map((r, i) => {
                      const badgeStyles: Record<'listo' | 'proceso' | 'pendiente', { text: string; classes: string }> = {
                        listo: { text: 'Listo', classes: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
                        proceso: { text: 'En proceso', classes: 'bg-blue-100 text-blue-800 border-blue-200' },
                        pendiente: { text: 'Doc. pendiente', classes: 'bg-amber-100 text-amber-800 border-amber-200' },
                      }
                      const activeStyle = badgeStyles[r.estado as 'listo' | 'proceso' | 'pendiente']
                      return (
                        <div key={i} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/40 border border-white/20">
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-[#13301F] truncate">{r.nombre}</div>
                            <div className="text-[10px] text-[rgba(80,108,92,0.5)] truncate">{r.region}</div>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${activeStyle.classes}`}>
                            {activeStyle.text}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Water Footprint Card */}
                <div className="glass-card rounded-3xl p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 flex-shrink-0">
                      <Droplet className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-[#13301F]">Huella hídrica</div>
                      <div className="text-[10px] text-[rgba(80,108,92,0.5)] font-semibold">Indicador complementario</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-blue-700 leading-none">
                        {hasData ? '1.42' : '0.00'} <span className="text-[10px] font-bold text-[rgba(80,108,92,0.5)] font-semibold">m³/kg</span>
                      </div>
                      <div className="text-[10px] font-bold text-[rgba(80,108,92,0.5)] mt-1 font-semibold">
                        {hasData ? '-5% vs camp. ant.' : 'Sin datos'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'scope3' && (
            <motion.div
              key="scope3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="glass-card rounded-3xl p-6 mb-8"
            >
              <div className="mb-6">
                <h3 className="font-bold text-[#13301F] text-base mb-1">Desglose Scope 3 por Categoría</h3>
                <p className="text-xs text-[rgba(80,108,92,0.5)]">18,420 tCO₂e · Cadena de valor completa</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={displayScope3Categories} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(90,190,145,0.06)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: 'rgba(80,108,92,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="cat" type="category" tick={{ fill: 'rgba(80,108,92,0.6)', fontSize: 11 }} axisLine={false} tickLine={false} width={140} />
                    <Tooltip formatter={(value: any) => [`${value.toLocaleString()} tCO₂e`, 'Emisiones']} contentStyle={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(90,190,145,0.2)', borderRadius: 12 }} labelStyle={{ color: '#137C53' }} itemStyle={{ color: 'rgba(80,108,92,0.8)' }} />
                    <Bar dataKey="value" fill="url(#barGrad)" radius={[0, 6, 6, 0]}>
                      <defs>
                        <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#C5E0CF" />
                          <stop offset="100%" stopColor="#137C53" />
                        </linearGradient>
                      </defs>
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {displayScope3Categories.map((cat, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="text-xs text-[rgba(80,108,92,0.6)] w-36 truncate">{cat.cat}</div>
                      <div className="flex-1 h-2 bg-[rgba(90,190,145,0.08)] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${cat.pct}%` }}
                          transition={{ duration: 1, delay: i * 0.1 }}
                          className="h-full rounded-full"
                          style={{ background: `linear-gradient(90deg, #C5E0CF, #137C53)` }}
                        />
                      </div>
                      <div className="text-xs font-bold text-[#137C53] w-8 text-right">{cat.pct}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'esg' && (
            <motion.div
              key="esg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"
            >
              <div className="glass-card rounded-3xl p-6">
                <h3 className="font-bold text-[#13301F] text-base mb-1">Radar ESG</h3>
                <p className="text-xs text-[rgba(80,108,92,0.5)] mb-6">Score total: 87/100 · Ranking: Nivel A</p>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={displayEsgRadar}>
                    <PolarGrid stroke="rgba(90,190,145,0.1)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(80,108,92,0.6)', fontSize: 11 }} />
                    <Radar name="ESG Score" dataKey="A" stroke="#137C53" fill="#137C53" fillOpacity={0.1} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="glass-card rounded-3xl p-6">
                <h3 className="font-bold text-[#13301F] text-base mb-6">Cumplimiento por Framework</h3>
                <div className="space-y-4">
                  {[
                    { label: 'GRI Standards', score: hasData ? 92 : 0, color: '#137C53' },
                    { label: 'TCFD', score: hasData ? 85 : 0, color: '#3D7FB0' },
                    { label: 'CDP', score: hasData ? 78 : 0, color: '#D2A24A' },
                    { label: 'ISO 14064', score: hasData ? 95 : 0, color: '#137C53' },
                    { label: 'HC Perú', score: hasData ? 100 : 0, color: '#10B981' },
                    { label: 'GHG Protocol', score: hasData ? 89 : 0, color: '#3D7FB0' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="text-xs font-medium text-[rgba(80,108,92,0.7)] w-28">{item.label}</div>
                      <div className="flex-1 h-2.5 bg-[rgba(90,190,145,0.06)] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item.score}%` }}
                          transition={{ duration: 1.2, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                          className="h-full rounded-full"
                          style={{ background: `linear-gradient(90deg, ${item.color}50, ${item.color})` }}
                        />
                      </div>
                      <div className="text-xs font-bold w-10 text-right" style={{ color: item.color }}>{item.score}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reports section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card rounded-3xl p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-[#13301F] text-base">Reportes Recientes</h3>
            <a href="/upload/" className="text-xs text-[#137C53] font-semibold flex items-center gap-1 hover:gap-2 transition-all">
              Ver todos <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { name: 'HC Perú Q3 2025', date: 'Sep 30, 2025', status: hasData ? 'Certificado' : 'Falta Datos', color: hasData ? 'emerald' : 'muted' },
              { name: 'Reporte GRI Q2 2025', date: 'Jun 30, 2025', status: hasData ? 'Aprobado' : 'Falta Datos', color: hasData ? 'blue' : 'muted' },
              { name: 'TCFD Anual 2024', date: 'Dic 31, 2024', status: hasData ? 'Archivado' : 'Falta Datos', color: 'muted' },
            ].map((r, i) => (
              <div key={i} onClick={descargarReporteHC} className="flex items-center gap-3 p-4 rounded-2xl bg-[rgba(255,255,255,0.5)] border border-[rgba(90,190,145,0.08)] hover:border-[rgba(90,190,145,0.2)] transition-all cursor-pointer group">
                <div className="w-10 h-10 rounded-xl bg-[rgba(90,190,145,0.08)] flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#137C53]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[#13301F] truncate">{r.name}</div>
                  <div className="text-xs text-[rgba(80,108,92,0.5)]">{r.date}</div>
                </div>
                <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.color === 'emerald' ? 'badge-emerald' : r.color === 'blue' ? 'badge-blue' : 'bg-[rgba(90,190,145,0.05)] text-[rgba(80,108,92,0.4)]'}`}>
                  {r.status}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
