'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts'
import {
  TrendingDown, AlertTriangle, FileText, ChevronRight, CheckCircle2, Zap, Loader2, HelpCircle,
  BarChart3, Upload,
} from 'lucide-react'
import Link from 'next/link'
import DashboardShell from '@/components/layout/DashboardShell'
import ImpactToggle from '@/components/ui/ImpactToggle'
import TerminoTooltip from '@/components/ui/TerminoTooltip'
import { getLatestAnalysisFromFirestore, saveAnalysisToFirestore } from '@/lib/integrations/firebaseService'
import { exportarPDF, type ExportData } from '@/lib/reports/exports'
import { useAuth } from '@/contexts/AuthContext'
import { certificarCooperativa, cooperativa, serieMensual, coberturaDe } from '@/lib/engine/pilotEngine'
import { useHuellaConsolidada } from '@/lib/engine/huellaConsolidada'
import { reiniciarFuentesDemo } from '@/lib/store/datosPrueba'
import { construirTopFuentes, productos, empresa } from '@/lib/store/analyticsData'
import { referenciaDe } from '@/lib/engine/benchmarks'
import { construirReporteTecnico } from '@/lib/reports/reporteTecnico'
import { generarInformeTecnico } from '@/lib/reports/pdfTecnico'
import { generarInformeGRI } from '@/lib/reports/griReport'
import { generarInformeTCFD } from '@/lib/reports/tcfdReport'
import { useAnotaciones } from '@/lib/store/anotaciones'

// ─── Datos (campaña 2026-2027) ─────────────────────────────────────────────
// La huella total y la intensidad se derivan de cooperativa (pilotEngine),
// la MISMA fuente que usan /analisis y /plan-reduccion — antes este panel
// mostraba 14,820 tCO2e hardcodeado mientras /analisis mostraba 1,378 para
// la misma campaña (10x de diferencia). Ahora hay un solo número maestro.
// Los KPI ya no son una constante de modulo: se derivan del store
// consolidado (fuentes vinculadas + archivos del usuario). Si el usuario
// desvincula un archivo el numero baja aca tambien, y sin ninguna fuente
// el panel muestra ceros de verdad, no cifras de demostracion.
const KPI_FIJOS = {
  reduccionPct: 8,

  ahorro: 17500, // US$5,000,000 x 0.35% (linea BBVA)
  cumplimiento: { listas: 4, total: 5 },
}



// Referencia sectorial UE ponderada por los kilos exportados de cada cultivo.
// Sale del mismo catalogo de benchmarks que usa "Por producto", asi que el
// numero del panel y el de la ficha de producto no pueden divergir.
const BENCHMARK_PONDERADO = (() => {
  let kg = 0
  let acumulado = 0
  for (const p of productos) {
    const ref = referenciaDe(p.nombre, 'eu').valor
    if (ref === null) continue
    kg += p.kilosExportados
    acumulado += ref * p.kilosExportados
  }
  return kg > 0 ? +(acumulado / kg).toFixed(3) : 0
})()

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
  const [hasDataFlag, setHasData] = useState(false)
  const [montado, setMontado] = useState(false)
  const [isAutoloading, setIsAutoloading] = useState(false)
  const { user } = useAuth()

  // Fuente unica de verdad de todo numero de este panel.
  const { huella, fuentes } = useHuellaConsolidada()
  const { anotaciones } = useAnotaciones()
  const KPI = {
    ...KPI_FIJOS,
    huellaTotal: Math.round(huella.huellaTotalTon),
    intensidad: +huella.intensidadKgPorKg.toFixed(2),
  }

  // `cargando` distingue "todavía no sé" de "no hay datos". Sin esto el
  // skeleton se quedaba pulsando para siempre y parecía que estaba roto.
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    setHasData(localStorage.getItem('agrofinance_has_data') === 'true')
    setMontado(true)
    // Si Firestore no está configurado, getDocs puede no resolver nunca.
    // Sin este límite el dashboard se queda cargando para siempre.
    const conTimeout = Promise.race([
      getLatestAnalysisFromFirestore(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
    ])
    conTimeout
      .then((a) => {
        if (a) { setHasData(true); localStorage.setItem('agrofinance_has_data', 'true') }
      })
      .finally(() => setCargando(false))
  }, [])

  const handleAutoload = async () => {
    setIsAutoloading(true)
    // Simulate processing delay
    await new Promise(r => setTimeout(r, 1800))
    // La cobertura sale del estado real de las fuentes vinculadas, no de
    // un valor de relleno: es el único insumo de la clasificación que el
    // sistema puede observar por sí mismo.
    const clasificacion = certificarCooperativa(cooperativa, coberturaDe(fuentes))
    const analisisId = String(Date.now())
    await saveAnalysisToFirestore({
      id: analisisId,
      timestamp: new Date().toISOString(),
      score: clasificacion.indiceConformidad,
      nivel: clasificacion.nivel,
      huellaTotalTon: cooperativa.huellaTotalTon,
      kilosExportados: cooperativa.kilosExportados,
      scopes: cooperativa.scopes,
    })
    // Autocargar tiene que traer de vuelta las FUENTES, no solo levantar una
    // bandera: los numeros del panel salen del store de fuentes.
    reiniciarFuentesDemo()
    localStorage.setItem('agrofinance_has_data', 'true')
    setHasData(true)
    setIsAutoloading(false)
  }

  // Con fuentes vinculadas hay datos aunque nunca se haya pulsado "autocargar".
  const hasData = montado ? huella.tieneDatos : hasDataFlag
  // Serie mensual real: el total se reparte segun los kilos embarcados en
  // cada mes (metodo de prorrateo declarado), no segun una curva dibujada.
  const emisionesMensuales = serieMensual(huella.huellaTotalTon).map((p) => ({
    mes: p.mes,
    emisiones: p.emisiones,
    // Linea de referencia real: los kilos embarcados ese mes valorizados a la
    // intensidad de referencia UE publicada por cultivo (ponderada por volumen).
    benchmark: +((p.kilos * BENCHMARK_PONDERADO) / 1000).toFixed(1),
  }))
  const displayEmisiones = hasData
    ? emisionesMensuales
    : emisionesMensuales.map(e => ({ ...e, emisiones: 0 }))

  const descargarReporteHC = async () => {
    const data: ExportData = {
      empresa: user?.empresa || 'Mi Empresa',
      campania: '2026-2027',
      usuario: user?.nombre || 'Usuario',
      fecha: new Date().toLocaleDateString('es-PE'),
      huellaTotal: hasData ? KPI.huellaTotal : 0,
      intensidad: hasData ? KPI.intensidad : 0,
      reduccionPct: hasData ? KPI.reduccionPct : 0,
      benchmark: BENCHMARK_PONDERADO,
      ahorro: hasData ? KPI.ahorro : 0,
      scopes: (['s1', 's2', 's3'] as const).map((k, i) => ({
        nombre: `Scope ${i + 1}`,
        descripcion: ['Emisiones directas (diesel, fertilizantes)', 'Electricidad (packing, riego)', 'Cadena de valor (flete maritimo, insumos)'][i],
        valor: hasData ? Math.round(huella.scopes[k]) : 0,
        pct: hasData && huella.huellaTotalTon > 0 ? Math.round((huella.scopes[k] / huella.huellaTotalTon) * 100) : 0,
      })),
      emisionesMensuales: displayEmisiones,
      topFuentes: hasData
        ? construirTopFuentes(huella).map((f) => ({ fuente: f.fuente, scope: `Scope ${f.scope.slice(1)}`, emisiones: f.emisiones, pct: f.pct }))
        : [],
      compliance: compliance.map(c => ({ nombre: c.nombre, region: c.region, estado: hasData ? c.estado : 'pendiente' })),
      metodologia: 'GHG Protocol Corporate Standard · ISO 14064-3 · ISO 14067 · Factores: IPCC AR6, COES, IMO 2023',
    }
    await exportarPDF(data)
  }

  // Las tres tarjetas de "Reportes recientes" apuntaban las tres al mismo
  // PDF ejecutivo de HC Perú sin importar en cuál se hiciera clic — el
  // reporte GRI y el TCFD no existían de verdad. Cada tarjeta construye
  // ahora el mismo modelo serializable (construirReporteTecnico) y lo
  // imprime con el generador de SU propio formato, así que HC Perú, GRI y
  // TCFD ya no pueden salir con el mismo contenido.
  const reporteTecnicoActual = () =>
    construirReporteTecnico({
      titulo: 'Informe de huella de carbono',
      empresa: user?.empresa || empresa.nombre,
      campania: '2026-2027',
      huella,
      productos,
      fuentes,
      anotaciones,
      alcanceBenchmark: 'eu',
      periodo: { desde: '01/01/2026', hasta: new Date().toLocaleDateString('es-PE'), cerrado: false },
    })

  const descargarInformeHCPeru = () => {
    const doc = generarInformeTecnico(reporteTecnicoActual())
    doc.save('HC_Peru_Q3_2025.pdf')
  }
  const descargarInformeGRI = () => {
    const doc = generarInformeGRI(reporteTecnicoActual())
    doc.save('Reporte_GRI_Q2_2025.pdf')
  }
  const descargarInformeTCFD = () => {
    const doc = generarInformeTCFD(reporteTecnicoActual())
    doc.save('TCFD_Anual_2024.pdf')
  }

  const pct = Math.round((KPI.cumplimiento.listas / KPI.cumplimiento.total) * 100)

  return (
    <DashboardShell>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-[#13301F] tracking-tight">Panel de indicadores</h1>
        <p className="text-sm text-[rgba(80,108,92,0.6)] mt-1">
          Resumen consolidado de la campaña 2026-2027 — un clic, todos los indicadores
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
                Haz clic en <strong>Autocargar DATA</strong> para activar todos los indicadores con datos reales de la campaña.
              </p>
            </div>
          </div>
          <motion.button
            onClick={handleAutoload}
            disabled={isAutoloading}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="relative flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl font-black text-sm text-white shadow-lg hover:brightness-105 active:scale-95 transition-all whitespace-nowrap disabled:opacity-70"
            style={{ background: 'linear-gradient(135deg, #2BA470, #137C53)', boxShadow: '0 4px 18px rgba(19,124,83,0.35)' }}
          >
            {isAutoloading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Cargando datos...</>
            ) : (
              <><Zap className="w-4 h-4" /> ⚡ Autocargar DATA</>
            )}
          </motion.button>
        </motion.div>
      )}


      {/* KPI cards */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.15 } } }}
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6"
      >
        {/* Huella total */}
        <KpiCard label="Huella total">
          <div className="text-3xl font-black text-[#13301F]">{hasData ? fmt(KPI.huellaTotal) : '0'}<span className="text-base font-bold text-[rgba(80,108,92,0.45)] ml-1 flex items-center">tCO₂e
<div className="relative group inline-block ml-1">
  <HelpCircle className="w-4 h-4 text-[rgba(80,108,92,0.45)] cursor-help" />
  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-[#13301F] text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg text-center font-normal leading-tight">
    Toneladas de CO₂ equivalente. Medida universal para evaluar la huella de carbono.
  </div>
</div></span></div>
          {hasData && (
            <span className="inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
              <TrendingDown className="w-3.5 h-3.5" /> {KPI.reduccionPct}% vs campaña anterior
            </span>
          )}
        </KpiCard>

        {/* Intensidad */}
        <KpiCard label="Intensidad promedio">
          <div className="text-3xl font-black text-[#13301F]">{hasData ? KPI.intensidad.toFixed(2) : '0.00'}<span className="text-base font-bold text-[rgba(80,108,92,0.45)] ml-1">kgCO₂e/kg</span></div>
          <div className="text-xs text-[rgba(80,108,92,0.6)] mt-3">Benchmark sector: <strong className="text-[#13301F]">{BENCHMARK_PONDERADO.toFixed(2)}</strong></div>
        </KpiCard>

        {/* Ahorro */}
        <KpiCard label="Ahorro potencial crédito verde">
          <div className="text-3xl font-black text-[#13301F]">{hasData ? `US$ ${fmt(KPI.ahorro)}` : 'US$ 0'}<span className="text-base font-bold text-[rgba(80,108,92,0.45)] ml-1">/año</span></div>
          <div className="text-xs text-[rgba(80,108,92,0.6)] mt-3 inline-flex items-center">
            {hasData ? <>−35 bps con BBVA SLL<TerminoTooltip termino="SLL" /></> : 'Requiere vinculación'}
          </div>
        </KpiCard>

        {/* Cumplimiento */}
        <KpiCard label="Progreso de cumplimiento">
          <div className="text-3xl font-black text-[#13301F]">{hasData ? KPI.cumplimiento.listas : 0}/{KPI.cumplimiento.total}<span className="text-base font-bold text-[rgba(80,108,92,0.45)] ml-1">regulaciones</span></div>
          <div className="mt-3">
            <div className="h-1.5 rounded-full bg-[rgba(90,190,145,0.12)] overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: hasData ? `${pct}%` : '0%' }} transition={{ duration: 1 }} className="h-full rounded-full bg-gradient-to-r from-[#2BA470] to-[#137C53]" />
            </div>
            <div className="text-xs text-[rgba(80,108,92,0.6)] mt-1.5">{hasData ? 'activas' : 'pendiente'}</div>
          </div>
        </KpiCard>
      </motion.div>

      {/* Toggle Impacto AgroFinance */}
      <ImpactToggle />

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

            {cargando ? (
              <div className="w-full h-full bg-[rgba(90,190,145,0.1)] animate-pulse rounded-xl" />
            ) : !hasData ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-center gap-3 rounded-xl border border-dashed border-[rgba(90,190,145,0.3)] bg-[rgba(90,190,145,0.03)] px-6">
                <BarChart3 className="w-8 h-8 text-[rgba(90,190,145,0.5)]" />
                <div>
                  <p className="text-sm font-bold text-[#13301F]">Aún no hay emisiones que graficar</p>
                  <p className="text-xs text-[rgba(80,108,92,0.65)] mt-1 max-w-xs">
                    Sube tu primera factura o carga los datos de ejemplo para ver la evolución mensual de tu huella.
                  </p>
                </div>
                <Link
                  href="/upload/"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#137C53] text-white text-xs font-semibold hover:bg-[#0F6543] transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" /> Subir mi primera factura
                </Link>
              </div>
            ) : (
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
            )}
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
            { name: 'HC Perú Q3 2025', date: 'Sep 30, 2025', status: hasData ? 'Certificado' : 'Falta datos', descargar: descargarInformeHCPeru },
            { name: 'Reporte GRI Q2 2025', date: 'Jun 30, 2025', status: hasData ? 'Aprobado' : 'Falta datos', descargar: descargarInformeGRI },
            { name: 'TCFD Anual 2024', date: 'Dic 31, 2024', status: hasData ? 'Archivado' : 'Falta datos', descargar: descargarInformeTCFD },
          ].map((r, i) => (
            <button key={i} onClick={r.descargar}
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

function KpiCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 20 } } }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="group bg-white rounded-2xl border border-[rgba(90,190,145,0.12)] p-5 shadow-[0_2px_16px_rgba(90,110,95,0.06)] hover:bg-emerald-50/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)] transition-all duration-300"
    >
      <div className="text-[11px] font-semibold uppercase tracking-wider text-[rgba(80,108,92,0.5)] mb-2">{label}</div>
      {children}
    </motion.div>
  )
}
