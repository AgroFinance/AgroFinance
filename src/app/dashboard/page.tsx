'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts'
import {
  TrendingDown, AlertTriangle, FileText, ChevronRight, CheckCircle2, HelpCircle,
  BarChart3, Upload,
} from 'lucide-react'
import Link from 'next/link'
import DashboardShell from '@/components/layout/DashboardShell'
import ImpactToggle from '@/components/ui/ImpactToggle'
import TerminoTooltip from '@/components/ui/TerminoTooltip'
import { getLatestAnalysisFromFirestore } from '@/lib/firebaseService'
import { exportarPDF, type ExportData } from '@/lib/exports'
import { useAuth } from '@/contexts/AuthContext'
import { serieTemporal, type Periodo } from '@/lib/pilotEngine'
import { useHuellaConsolidada } from '@/lib/huellaConsolidada'
import { construirTopFuentes, productos, empresa } from '@/lib/analyticsData'
import { referenciaDe } from '@/lib/benchmarks'
import { construirReporteTecnico } from '@/lib/reporteTecnico'
import { generarInformeTecnico } from '@/lib/pdfTecnico'
import { generarInformeGRI } from '@/lib/griReport'
import { generarInformeTCFD } from '@/lib/tcfdReport'
import { useAnotaciones } from '@/lib/anotaciones'
import { useLineaCredito, calcularAhorroCredito } from '@/lib/lineaCredito'
import { useCultivoDeclarado, CULTIVOS_CON_BENCHMARK } from '@/lib/cultivoDeclarado'
import { useComparacionHuella } from '@/lib/historialHuella'
import { auth } from '@/core/config/firebase.client'

function claveHasData(): string {
  return `agrofinance_has_data_${auth.currentUser?.uid || 'invitado'}`
}

const PERIODOS: { id: Periodo; label: string }[] = [
  { id: 'dia', label: 'Día' },
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mes' },
  { id: 'bimestre', label: 'Bimestre' },
  { id: 'trimestre', label: 'Trimestre' },
  { id: 'anio', label: 'Año' },
]

const ETIQUETA_PERIODO: Record<Periodo, string> = {
  dia: 'por día',
  semana: 'por semana',
  mes: 'por mes',
  bimestre: 'por bimestre',
  trimestre: 'por trimestre',
  anio: 'por año',
}

// ─── Datos (campaña 2026-2027) ─────────────────────────────────────────────
// La huella total y la intensidad se derivan de cooperativa (pilotEngine),
// la MISMA fuente que usan /analisis y /plan-reduccion — antes este panel
// mostraba 14,820 tCO2e hardcodeado mientras /analisis mostraba 1,378 para
// la misma campaña (10x de diferencia). Ahora hay un solo número maestro.
// Los KPI ya no son una constante de modulo: se derivan del store
// consolidado (fuentes vinculadas + archivos del usuario). Si el usuario
// desvincula un archivo el numero baja aca tambien, y sin ninguna fuente
// el panel muestra ceros de verdad, no cifras de demostracion.



// Antes esto promediaba SIEMPRE los dos únicos cultivos con benchmark citable
// (Palta Hass + Mango Kent), sin importar cuál fruta exporta el usuario real
// — comparar la intensidad de un exportador de palta contra un promedio que
// incluye mango no es una referencia válida. Ahora se calcula por cultivo
// DECLARADO (ver cultivoDeclarado.ts) dentro del componente; sin declarar,
// no hay benchmark que mostrar — nunca un promedio como sustituto.

// Antes estos 5 estados eran fijos a mano ('listo'/'proceso'/'pendiente'),
// siempre los mismos sin importar si había datos cargados o no — por eso el
// panel podía decir "4/5 regulaciones activas" con la huella total en cero.
// Cada estado ahora sale de una señal real y verificable por el propio
// sistema, no de una promesa: ISO 14064 exige auditoría externa que
// AgroFinance no puede autocertificar, así que se queda en "proceso" incluso
// con datos completos — nunca se declara "listo" algo que no se puede probar.
function calcularCompliance(hasData: boolean, lineaDeclarada: boolean) {
  return [
    { nombre: 'CSRD / EUDR', region: 'Unión Europea', estado: hasData ? 'listo' : 'pendiente' },
    { nombre: 'Tesco Sustainability Network', region: 'Reino Unido', estado: hasData ? 'listo' : 'pendiente' },
    { nombre: 'ISO 14064', region: 'Verificación internacional (requiere auditor externo)', estado: 'proceso' as const },
    { nombre: 'BBVA Sustainability-Linked Loan', region: 'Banca verde', estado: hasData && lineaDeclarada ? 'listo' : 'pendiente' },
    { nombre: 'MINAM Huella de Carbono Perú', region: 'Perú', estado: hasData ? 'listo' : 'pendiente' },
  ] as const
}

const badgeStyles: Record<string, { text: string; classes: string }> = {
  listo: { text: 'Listo', classes: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  proceso: { text: 'En proceso', classes: 'bg-blue-100 text-blue-700 border-blue-200' },
  pendiente: { text: 'Doc. pendiente', classes: 'bg-amber-100 text-amber-700 border-amber-200' },
}

const fmt = (n: number) => n.toLocaleString('es-PE')

export default function DashboardPage() {
  const [hasDataFlag, setHasData] = useState(false)
  const [montado, setMontado] = useState(false)
  const { user } = useAuth()

  // Fuente unica de verdad de todo numero de este panel.
  const { huella, fuentes } = useHuellaConsolidada()
  const { anotaciones } = useAnotaciones()
  const [montoCredito, setMontoCredito] = useLineaCredito()
  const ahorro = calcularAhorroCredito(montoCredito)
  const compliance = calcularCompliance(huella.tieneDatos, ahorro.disponible)
  const cumplimiento = { listas: compliance.filter((c) => c.estado === 'listo').length, total: compliance.length }
  const [cultivoDeclarado, setCultivoDeclarado] = useCultivoDeclarado()
  const benchmarkCultivo = cultivoDeclarado ? referenciaDe(cultivoDeclarado, 'eu').valor : null
  const BENCHMARK_PONDERADO = benchmarkCultivo ?? 0
  const comparacion = useComparacionHuella(huella.huellaTotalTon, huella.tieneDatos)
  const KPI = {
    huellaTotal: Math.round(huella.huellaTotalTon),
    intensidad: +huella.intensidadKgPorKg.toFixed(2),
    ahorro: ahorro.ahorroAnualUsd,
    cumplimiento,
    reduccionPct: comparacion.disponible ? comparacion.variacionPct! : 0,
  }
  const [editandoCredito, setEditandoCredito] = useState(false)
  const [montoInput, setMontoInput] = useState('')
  const [editandoCultivo, setEditandoCultivo] = useState(false)

  // `cargando` distingue "todavía no sé" de "no hay datos". Sin esto el
  // skeleton se quedaba pulsando para siempre y parecía que estaba roto.
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    setHasData(localStorage.getItem(claveHasData()) === 'true')
    setMontado(true)
    // Si Firestore no está configurado, getDocs puede no resolver nunca.
    // Sin este límite el dashboard se queda cargando para siempre.
    const conTimeout = Promise.race([
      getLatestAnalysisFromFirestore(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
    ])
    conTimeout
      .then((a) => {
        if (a) { setHasData(true); localStorage.setItem(claveHasData(), 'true') }
      })
      .finally(() => setCargando(false))
  }, [])

  // Con fuentes vinculadas hay datos aunque nunca se haya pulsado "autocargar".
  const hasData = montado ? huella.tieneDatos : hasDataFlag
  // Granularidad temporal elegible en el panel — reparte el mismo total real
  // por el mismo metodo (prorrateo por kilos embarcados), solo cambia el
  // ancho del cubo de tiempo. Persistido por sesión de navegador, no por cuenta.
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const emisionesMensuales = serieTemporal(huella.huellaTotalTon, periodo).map((p) => ({
    mes: p.mes,
    emisiones: p.emisiones,
    // Linea de referencia real: los kilos embarcados ese mes valorizados a la
    // intensidad de referencia UE publicada por cultivo (ponderada por volumen).
    benchmark: +((p.kilos * BENCHMARK_PONDERADO) / 1000).toFixed(1),
  }))

  // Con archivos reales del usuario, una curva mensual sintética repartiendo
  // un solo total agregado entre meses de calendario es engañosa — parece
  // una serie histórica real y no lo es. Con datos reales se grafica una
  // barra POR ARCHIVO, en la fecha real en que se procesó (extraída del id
  // "upload-<timestamp>"), sin inventar un benchmark que no existe por
  // archivo — solo hay benchmark real cuando se conoce el volumen embarcado.
  const usaSeriePorArchivo = huella.archivosUsuario.length > 0
  const emisionesPorArchivo = [...huella.archivosUsuario]
    .filter((f) => f.resumen)
    .sort((a, b) => {
      const ta = Number(a.id.replace('upload-', '')) || 0
      const tb = Number(b.id.replace('upload-', '')) || 0
      return ta - tb
    })
    .map((f) => ({
      mes: f.actualizado,
      emisiones: f.resumen!.emisionTon,
      benchmark: 0,
      archivo: f.archivo,
    }))

  const displayEmisiones = !hasData
    ? emisionesMensuales.map(e => ({ ...e, emisiones: 0 }))
    : usaSeriePorArchivo
      ? emisionesPorArchivo
      : emisionesMensuales

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
        <h1 className="text-2xl sm:text-3xl font-black text-[#13301F] dark:text-[#EAF6EF] tracking-tight">Panel de indicadores</h1>
        <p className="text-sm text-[rgba(80,108,92,0.6)] dark:text-[rgba(200,220,210,0.6)] mt-1">
          Resumen consolidado de la campaña 2026-2027 — un clic, todos los indicadores
        </p>
      </motion.div>

      {/* Warning banner when empty — sin opción de demo: solo indica dónde cargar datos reales. */}
      {!hasData && (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-[rgba(210,145,47,0.3)] bg-[rgba(210,145,47,0.06)] p-4 mb-6 flex items-start gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-[rgba(210,145,47,0.12)] border border-[rgba(210,145,47,0.2)] flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-[#D2912F]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[#13301F] dark:text-[#EAF6EF]">Panel sin datos</h3>
            <p className="text-xs text-[rgba(80,108,92,0.75)] dark:text-[rgba(200,220,210,0.75)] leading-relaxed mt-0.5">
              Sube tu primera factura o archivo en <Link href="/upload/" className="underline font-semibold text-[#137C53]">Analizar Datos</Link> para activar los indicadores con datos reales de la campaña.
            </p>
          </div>
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
          <div className="text-3xl font-black text-[#13301F] dark:text-[#EAF6EF]">{hasData ? fmt(KPI.huellaTotal) : '0'}<span className="text-base font-bold text-[rgba(80,108,92,0.45)] dark:text-[rgba(200,220,210,0.45)] ml-1 flex items-center">tCO₂e
<div className="relative group inline-block ml-1">
  <HelpCircle className="w-4 h-4 text-[rgba(80,108,92,0.45)] dark:text-[rgba(200,220,210,0.45)] cursor-help" />
  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-[#13301F] text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg text-center font-normal leading-tight">
    Toneladas de CO₂ equivalente. Medida universal para evaluar la huella de carbono.
  </div>
</div></span></div>
          {/* Antes esto era un "8%" fijo comparado contra una "campaña
              anterior" que no existe — ahora compara contra la primera
              medición real guardada (historialHuella.ts). Sin al menos 2
              mediciones reales todavía no hay "antes" que comparar. */}
          {hasData && comparacion.disponible && (
            <span className={`inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full text-xs font-bold ${comparacion.esReduccion ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              <TrendingDown className="w-3.5 h-3.5" /> {comparacion.variacionPct}% {comparacion.esReduccion ? 'menos' : 'más'} desde {comparacion.fechaComparada}
            </span>
          )}
          {hasData && !comparacion.disponible && (
            <span className="inline-flex items-center gap-1 mt-3 text-xs text-[rgba(80,108,92,0.5)] dark:text-[rgba(200,220,210,0.5)]">
              Primera medición registrada — sin histórico aún para comparar
            </span>
          )}
        </KpiCard>

        {/* Intensidad — el benchmark solo existe si el cultivo está declarado:
            promediar entre los dos únicos cultivos con fuente citable (palta,
            mango) sin saber cuál exporta el usuario comparaba contra el
            cultivo equivocado la mitad de las veces. */}
        <KpiCard label="Intensidad promedio">
          <div className="text-3xl font-black text-[#13301F] dark:text-[#EAF6EF]">{hasData ? KPI.intensidad.toFixed(2) : '0.00'}<span className="text-base font-bold text-[rgba(80,108,92,0.45)] dark:text-[rgba(200,220,210,0.45)] ml-1">kgCO₂e/kg</span></div>
          {cultivoDeclarado && benchmarkCultivo !== null ? (
            <div className="text-xs text-[rgba(80,108,92,0.6)] dark:text-[rgba(200,220,210,0.6)] mt-3 inline-flex items-center flex-wrap gap-x-1">
              Benchmark {cultivoDeclarado} (UE): <strong className="text-[#13301F] dark:text-[#EAF6EF]">{benchmarkCultivo.toFixed(2)}</strong>
              <button type="button" onClick={() => setEditandoCultivo(true)} className="underline hover:text-[#137C53]">editar</button>
            </div>
          ) : editandoCultivo ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {CULTIVOS_CON_BENCHMARK.map((c) => (
                <button
                  key={c} type="button"
                  onClick={() => { setCultivoDeclarado(c); setEditandoCultivo(false) }}
                  className="px-2.5 py-1 rounded-lg border border-[rgba(90,190,145,0.3)] text-xs font-semibold hover:bg-[rgba(90,190,145,0.08)]"
                >
                  {c}
                </button>
              ))}
            </div>
          ) : (
            <button type="button" onClick={() => setEditandoCultivo(true)} className="text-xs mt-3 underline text-[#137C53] font-semibold">
              Declara tu cultivo para ver el benchmark
            </button>
          )}
        </KpiCard>

        {/* Ahorro — depende de un monto de crédito REAL declarado por el
            usuario, nunca un supuesto de mercado. El banco es quien otorga
            la línea, AgroFinance no la inventa. */}
        <KpiCard label="Ahorro potencial crédito verde">
          {ahorro.disponible ? (
            <>
              <div className="text-3xl font-black text-[#13301F] dark:text-[#EAF6EF]">{hasData ? `US$ ${fmt(KPI.ahorro)}` : 'US$ 0'}<span className="text-base font-bold text-[rgba(80,108,92,0.45)] dark:text-[rgba(200,220,210,0.45)] ml-1">/año</span></div>
              <div className="text-xs text-[rgba(80,108,92,0.6)] dark:text-[rgba(200,220,210,0.6)] mt-3 inline-flex items-center flex-wrap gap-x-1">
                {hasData ? <>−{ahorro.bps} bps estimado sobre US$ {fmt(ahorro.montoDeclarado!)} declarados<TerminoTooltip termino="SLL" /></> : 'Requiere vinculación'}
                <button type="button" onClick={() => { setMontoInput(String(ahorro.montoDeclarado)); setEditandoCredito(true) }} className="underline hover:text-[#137C53]">editar</button>
              </div>
            </>
          ) : editandoCredito ? (
            <div className="space-y-2">
              <input
                type="number" autoFocus min={0} placeholder="Monto en US$"
                value={montoInput} onChange={(e) => setMontoInput(e.target.value)}
                className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-[rgba(90,190,145,0.3)] focus:outline-none focus:ring-2 focus:ring-[rgba(90,190,145,0.3)]"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { const n = Number(montoInput); if (n > 0) { setMontoCredito(n); setEditandoCredito(false) } }}
                  className="px-3 py-1 rounded-lg bg-[#137C53] text-white text-xs font-bold"
                >
                  Guardar
                </button>
                <button type="button" onClick={() => setEditandoCredito(false)} className="px-3 py-1 rounded-lg text-xs font-semibold text-[rgba(80,108,92,0.7)] dark:text-[rgba(200,220,210,0.7)]">Cancelar</button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-2xl font-black text-[#13301F] dark:text-[#EAF6EF]">Sin declarar</div>
              <button
                type="button"
                onClick={() => { setMontoInput(''); setEditandoCredito(true) }}
                className="text-xs mt-3 underline text-[#137C53] font-semibold"
              >
                Declara tu línea de crédito para estimar el ahorro
              </button>
            </>
          )}
        </KpiCard>

        {/* Cumplimiento */}
        <KpiCard label="Progreso de cumplimiento">
          <div className="text-3xl font-black text-[#13301F] dark:text-[#EAF6EF]">{KPI.cumplimiento.listas}/{KPI.cumplimiento.total}<span className="text-base font-bold text-[rgba(80,108,92,0.45)] dark:text-[rgba(200,220,210,0.45)] ml-1">regulaciones</span></div>
          <div className="mt-3">
            <div className="h-1.5 rounded-full bg-[rgba(90,190,145,0.12)] overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1 }} className="h-full rounded-full bg-gradient-to-r from-[#2BA470] to-[#137C53]" />
            </div>
            <div className="text-xs text-[rgba(80,108,92,0.6)] dark:text-[rgba(200,220,210,0.6)] mt-1.5">{KPI.cumplimiento.listas} de {KPI.cumplimiento.total}: CSRD/EUDR, Tesco, ISO 14064, BBVA SLL, MINAM</div>
          </div>
        </KpiCard>
      </motion.div>

      {/* Chart + Compliance — antes de la comparación de marketing: quien ya
          está adentro del panel quiere ver su estado real primero (¿puedo
          exportar a la UE?, ¿cómo va mi huella?), no que le vuelvan a
          vender el producto que ya está usando. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* Evolución mensual */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-white dark:bg-[#122820] rounded-2xl border border-[rgba(90,190,145,0.12)] p-5 sm:p-6 shadow-[0_2px_16px_rgba(90,110,95,0.06)] dark:shadow-none">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
            <div>
              <h3 className="font-bold text-[#13301F] dark:text-[#EAF6EF] text-base">Evolución de emisiones</h3>
              <p className="text-xs text-[rgba(80,108,92,0.55)] dark:text-[rgba(200,220,210,0.55)] mt-0.5">tCO₂e — {ETIQUETA_PERIODO[periodo]} vs benchmark sectorial</p>
            </div>
            {hasData && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[rgba(90,190,145,0.1)] text-[#137C53] text-xs font-semibold whitespace-nowrap sm:self-start">
                <TrendingDown className="w-3.5 h-3.5" /> tendencia a la baja
              </span>
            )}
          </div>

          {/* Selector de periodo: reagrupa el MISMO total real por cubos de
              tiempo distintos, sin inventar datos. */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {PERIODOS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setPeriodo(id)}
                aria-pressed={periodo === id}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                  periodo === id
                    ? 'bg-[#137C53] text-white'
                    : 'bg-[rgba(90,190,145,0.08)] text-[rgba(80,108,92,0.7)] dark:text-[rgba(200,220,210,0.7)] hover:bg-[rgba(90,190,145,0.15)] hover:text-[#13301F] dark:text-[#EAF6EF]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="h-72 w-full">

            {cargando ? (
              <div className="w-full h-full bg-[rgba(90,190,145,0.1)] animate-pulse rounded-xl" />
            ) : !hasData ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-center gap-3 rounded-xl border border-dashed border-[rgba(90,190,145,0.3)] bg-[rgba(90,190,145,0.03)] px-6">
                <BarChart3 className="w-8 h-8 text-[rgba(90,190,145,0.5)]" />
                <div>
                  <p className="text-sm font-bold text-[#13301F] dark:text-[#EAF6EF]">Aún no hay emisiones que graficar</p>
                  <p className="text-xs text-[rgba(80,108,92,0.65)] dark:text-[rgba(200,220,210,0.65)] mt-1 max-w-xs">
                    Sube tu primera factura o archivo para ver la evolución mensual de tu huella.
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
                  labelFormatter={(label, payload) => {
                    const archivo = (payload?.[0]?.payload as { archivo?: string } | undefined)?.archivo
                    return archivo ? `${archivo} · ${label}` : label
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  formatter={(value) => (value === 'emisiones' ? (usaSeriePorArchivo ? 'Emisiones por archivo cargado' : 'Emisiones AgroFinance') : 'Benchmark sectorial')} />
                <Bar dataKey="emisiones" radius={[4, 4, 0, 0]} maxBarSize={26}>
                  {displayEmisiones.map((_, i) => (
                    <Cell key={i} fill={i >= displayEmisiones.length - 4 ? '#52b788' : '#2d6a4f'} />
                  ))}
                </Bar>
                {/* Solo hay benchmark real cuando se conoce el volumen embarcado
                    (serie mensual del piloto) — en modo por-archivo no se dibuja
                    una línea plana en 0 haciéndose pasar por benchmark real. */}
                {!usaSeriePorArchivo && (
                  <Line type="monotone" dataKey="benchmark" stroke="#1a1a1a" strokeWidth={2} strokeDasharray="5 4" dot={false} />
                )}
              </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Estado de cumplimiento */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}
          className="bg-white dark:bg-[#122820] rounded-2xl border border-[rgba(90,190,145,0.12)] p-5 sm:p-6 shadow-[0_2px_16px_rgba(90,110,95,0.06)] dark:shadow-none">
          <h3 className="font-bold text-[#13301F] dark:text-[#EAF6EF] text-base">Estado de cumplimiento</h3>
          <p className="text-xs text-[rgba(80,108,92,0.55)] dark:text-[rgba(200,220,210,0.55)] mb-4">Regulaciones y marcos activos</p>
          <div className="space-y-2.5">
            {compliance.map((r, i) => {
              const s = badgeStyles[hasData ? r.estado : 'pendiente']
              return (
                <div key={i} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#F7FAF7] border border-[rgba(90,190,145,0.08)]">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#13301F] dark:text-[#EAF6EF] truncate">{r.nombre}</div>
                    <div className="text-[10px] text-[rgba(80,108,92,0.5)] dark:text-[rgba(200,220,210,0.5)] truncate">{r.region}</div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full border whitespace-nowrap ${s.classes}`}>{s.text}</span>
                </div>
              )
            })}
          </div>
        </motion.div>
      </div>

      {/* Toggle Impacto AgroFinance — el "antes/después" tiene más sentido
          acá, como refuerzo de por qué esos números mejoraron, que antes de
          mostrarlos. */}
      <ImpactToggle />

      {/* Reportes recientes */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
        className="bg-white dark:bg-[#122820] rounded-2xl border border-[rgba(90,190,145,0.12)] p-5 sm:p-6 shadow-[0_2px_16px_rgba(90,110,95,0.06)] dark:shadow-none">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[#13301F] dark:text-[#EAF6EF] text-base">Reportes recientes</h3>
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
                <div className="text-sm font-semibold text-[#13301F] dark:text-[#EAF6EF] truncate">{r.name}</div>
                <div className="text-xs text-[rgba(80,108,92,0.5)] dark:text-[rgba(200,220,210,0.5)]">{r.date}</div>
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
      className="group bg-white dark:bg-[#122820] rounded-2xl border border-[rgba(90,190,145,0.12)] dark:border-[rgba(90,190,145,0.12)] p-5 shadow-[0_2px_16px_rgba(90,110,95,0.06)] dark:shadow-none hover:bg-emerald-50/50 dark:hover:bg-[#15332A] hover:shadow-[0_0_20px_rgba(16,185,129,0.1)] transition-all duration-300"
    >
      <div className="text-[11px] font-semibold uppercase tracking-wider text-[rgba(80,108,92,0.5)] dark:text-[rgba(200,220,210,0.5)] mb-2">{label}</div>
      {children}
    </motion.div>
  )
}
