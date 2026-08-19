'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  FileText, Download, FileSpreadsheet, FileJson, Info, ShieldCheck, CheckCircle2, Circle, BadgeCheck,
  PackageCheck, Target, MinusCircle,
} from 'lucide-react'
import DashboardShell from '@/shared/components/layout/DashboardShell'
import * as XLSX from 'xlsx'
import { campanias } from '@/modules/carbon-accounting/domain/pilotEngine'
import { FUENTE_META, type FuenteEmision } from '@/modules/carbon-accounting/domain/emissionFactors'
import { construirProductos, empresa } from '@/modules/carbon-accounting/domain/analyticsData'
import { useHuellaConsolidada } from '@/modules/carbon-accounting/domain/huellaConsolidada'
import { fuentesActivasDesde } from '@/modules/data-loader/domain/datosPrueba'
import { useAnotaciones } from '@/modules/carbon-accounting/domain/anotaciones'
import {
  construirReporteTecnico, evaluarChecklist, NIVEL_VALIDEZ,
} from '@/modules/compliance-reports/infrastructure/exporters/reporteTecnico'
import { generarInformeTecnico } from '@/modules/compliance-reports/infrastructure/exporters/pdfTecnico'
import { generarInformeGRI } from '@/modules/compliance-reports/infrastructure/exporters/griReport'
import { generarInformeTCFD } from '@/modules/compliance-reports/infrastructure/exporters/tcfdReport'
import { CATALOGO_FACTORES } from '@/modules/carbon-accounting/domain/ghgClassify'
import type { AlcanceBenchmark } from '@/modules/carbon-accounting/domain/benchmarks'
import { useGastoAmbiental, resumirGasto, formatoPEN } from '@/modules/water-and-esg/domain/gastoAmbiental'
import { resumirODS, ESTADO_LABEL, NOTA_ODS } from '@/modules/water-and-esg/domain/ods'
import { useHuellaHidrica } from '@/modules/water-and-esg/domain/huellaHidrica'
import { construirAcciones } from '@/modules/green-financing/domain/reduccionActions'
import { generarPaqueteVerificacion } from '@/modules/compliance-reports/infrastructure/exporters/paqueteVerificacion'

const templates = [
  {
    id: 'sll',
    title: 'Dossier para Crédito Verde (SLL)',
    description: 'Informe técnico completo con los indicadores que piden los bancos para evaluar una Sustainability Linked Loan.',
    formatos: { pdf: true, excel: true, csv: true },
  },
  {
    id: 'hc-peru',
    title: 'Reporte de Declaración Minam (HC Perú)',
    description: 'Formato compatible con la plataforma Huella de Carbono Perú del Ministerio del Ambiente.',
    formatos: { pdf: true, excel: true, csv: true },
  },
  {
    id: 'eudr',
    title: 'Informe de Cumplimiento Normativo EUDR',
    description: 'Documentación para exportar a la Unión Europea, certificando cadena de suministro libre de deforestación.',
    formatos: { pdf: true, excel: false, csv: true },
  },
  {
    id: 'gri',
    title: 'Reporte GRI (GRI 2 + GRI 305)',
    description: 'Divulgaciones por código GRI real: perfil de la organización y las siete divulgaciones de GRI 305: Emissions.',
    formatos: { pdf: true, excel: false, csv: false },
  },
  {
    id: 'tcfd',
    title: 'Reporte TCFD (4 pilares)',
    description: 'Gobernanza, Estrategia, Gestión de riesgos y Métricas y objetivos — el formato que evalúan bancos y fondos.',
    formatos: { pdf: true, excel: false, csv: false },
  },
]

const PERIODOS = [
  { id: 'todo', label: 'Toda la campaña' },
  { id: '3m', label: 'Últimos 3 meses' },
  { id: '1m', label: 'Último mes' },
] as const
type PeriodoId = (typeof PERIODOS)[number]['id']

const cultivosDisponibles = Array.from(new Set(campanias.map((c) => c.cultivo))).sort()

// La data del piloto es de la campaña 2026, así que los períodos se calculan
// contra el último envío registrado — no contra la fecha de hoy, que dejaría
// "último mes" siempre vacío.
const fechasEnvios = campanias.flatMap((c) => c.envios.map((e) => e.fecha)).sort()
const fechaMasAntigua = fechasEnvios[0] as string
const fechaMasReciente = fechasEnvios.at(-1) as string

function inicioDePeriodo(periodo: PeriodoId): Date | null {
  if (periodo === 'todo') return null
  const ref = new Date(fechaMasReciente)
  const meses = periodo === '1m' ? 1 : 3
  return new Date(ref.getFullYear(), ref.getMonth() - meses, ref.getDate())
}

const fmt = (n: number, d = 2) => n.toLocaleString('es-PE', { minimumFractionDigits: d, maximumFractionDigits: d })
const fechaLegible = (iso: string) => new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })

export default function ReportesPage() {
  const [cultivosSel, setCultivosSel] = useState<string[]>(cultivosDisponibles)
  const [scopesSel, setScopesSel] = useState<(1 | 2 | 3)[]>([1, 2, 3])
  const [periodo, setPeriodo] = useState<PeriodoId>('todo')

  const { huella, fuentes } = useHuellaConsolidada()
  const { anotaciones } = useAnotaciones()
  const productos = useMemo(() => construirProductos(fuentesActivasDesde(fuentes)), [fuentes])

  const toggle = <T,>(lista: T[], set: (v: T[]) => void, valor: T) =>
    set(lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor])

  const resultado = useMemo(() => {
    const desde = inicioDePeriodo(periodo)
    const seleccionadas = campanias.filter((c) => cultivosSel.includes(c.cultivo))

    // El período se aplica prorrateando por los kilos efectivamente enviados
    // dentro de la ventana. Se declara en el reporte para no fingir precisión.
    let kilosPeriodo = 0
    let kilosTotales = 0
    let enviosIncluidos = 0
    for (const c of seleccionadas) {
      for (const e of c.envios) {
        kilosTotales += e.pesoNetoKg
        if (!desde || new Date(e.fecha) >= desde) {
          kilosPeriodo += e.pesoNetoKg
          enviosIncluidos++
        }
      }
    }
    const share = kilosTotales > 0 ? kilosPeriodo / kilosTotales : 0

    // Desglose por fuente, filtrado por los alcances marcados.
    const porFuente = new Map<FuenteEmision, number>()
    for (const c of seleccionadas) {
      for (const [fuente, ton] of Object.entries(c.pcf.desglose) as [FuenteEmision, number][]) {
        if (!scopesSel.includes(FUENTE_META[fuente].scope)) continue
        porFuente.set(fuente, (porFuente.get(fuente) ?? 0) + ton * share)
      }
    }

    const filas = [...porFuente.entries()]
      .map(([fuente, ton]) => ({
        fuente,
        label: FUENTE_META[fuente].label,
        scope: FUENTE_META[fuente].scope,
        ton: +ton.toFixed(3),
      }))
      .sort((a, b) => b.ton - a.ton)

    const totalTon = +filas.reduce((s, f) => s + f.ton, 0).toFixed(3)
    const kilos = Math.round(kilosPeriodo)

    return {
      filas,
      totalTon,
      kilos,
      enviosIncluidos,
      intensidad: kilos > 0 ? +((totalTon * 1000) / kilos).toFixed(4) : 0,
      esParcial: periodo !== 'todo',
    }
  }, [cultivosSel, scopesSel, periodo])

  const seleccionVacia = cultivosSel.length === 0 || scopesSel.length === 0

  // Checklist "listo para auditoría" — declarativo, evaluado contra el
  // estado real del reporte (no una lista pintada).
  const checklist = useMemo(
    () => evaluarChecklist({ fuentes, huella, anotaciones, periodoCerrado: periodo === 'todo' }),
    [fuentes, huella, anotaciones, periodo],
  )
  const cumplidos = checklist.filter((c) => c.cumplido).length

  // ------------------------------------------------------------
  // Gasto ambiental y ODS — se derivan de lo ya cargado, no se piden
  // aparte. Ambos viajan al paquete de verificación (RF-B5 / RF-C8).
  // ------------------------------------------------------------
  const { estado: gasto } = useGastoAmbiental()
  const hidrica = useHuellaHidrica()
  const resumenGasto = useMemo(
    () => resumirGasto(gasto, huella.huellaTotalTon),
    [gasto, huella.huellaTotalTon],
  )
  const ods = useMemo(
    () => resumirODS({
      huella,
      fuentes,
      gasto: resumenGasto,
      aguaM3: hidrica.m3Total,
      accionesReduccion: construirAcciones().length,
    }),
    [huella, fuentes, resumenGasto, hidrica.m3Total],
  )

  const [generandoPaquete, setGenerandoPaquete] = useState(false)

  const descargarPaquete = async () => {
    setGenerandoPaquete(true)
    try {
      await generarPaqueteVerificacion({
        empresa: empresa.nombre,
        campania: empresa.campania,
        periodo: {
          desde: fechaLegible(
            periodo === 'todo' ? fechaMasAntigua : (inicioDePeriodo(periodo) as Date).toISOString().slice(0, 10),
          ),
          hasta: fechaLegible(fechaMasReciente),
          cerrado: periodo === 'todo',
        },
        huella,
        fuentes,
        gasto,
        ods,
        responsable: empresa.nombre,
      })
    } finally {
      setGenerandoPaquete(false)
    }
  }

  // Descripción legible de los filtros: va en el encabezado de cada export.
  const resumenFiltros = [
    `Cultivos: ${cultivosSel.length ? cultivosSel.join(', ') : 'ninguno'}`,
    `Alcances: ${scopesSel.length ? [...scopesSel].sort().map((s) => `Scope ${s}`).join(', ') : 'ninguno'}`,
    `Período: ${PERIODOS.find((p) => p.id === periodo)!.label}`,
    `Nivel de validez: ${NIVEL_VALIDEZ.badge}`,
  ]

  const filasTabulares = () => [
    ...resultado.filas.map((f) => ({
      Fuente: f.label,
      Alcance: `Scope ${f.scope}`,
      'Emisiones (tCO2e)': f.ton,
    })),
    { Fuente: 'TOTAL', Alcance: '', 'Emisiones (tCO2e)': resultado.totalTon },
  ]

  // Las tildes se transliteran en vez de borrarse: "Crédito" → "Credito",
  // no "Crdito".
  const nombreArchivo = (titulo: string) =>
    `${titulo
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '_')}_${periodo}`

  // ------------------------------------------------------------
  // Modelo del informe técnico — una sola construcción para PDF/Excel/CSV
  // ------------------------------------------------------------
  const reporteDe = (titulo: string) =>
    construirReporteTecnico({
      titulo,
      empresa: empresa.nombre,
      campania: empresa.campania,
      huella,
      productos: productos.filter((p) => cultivosSel.includes(p.nombre)),
      fuentes,
      anotaciones,
      alcanceBenchmark: (anotaciones.alcanceBenchmark[cultivosSel[0]] as AlcanceBenchmark) || 'eu',
      periodo: {
        desde: fechaLegible(periodo === 'todo' ? fechaMasAntigua : (inicioDePeriodo(periodo) as Date).toISOString().slice(0, 10)),
        hasta: fechaLegible(fechaMasReciente),
        cerrado: periodo === 'todo',
      },
      // El indicador monetario y la evidencia ODS viajan al PDF junto al
      // indicador fisico: son el mismo entregable, no anexos sueltos.
      gasto: resumenGasto,
      ods,
    })

  // Cada plantilla tiene su propio formato real, no una portada distinta
  // sobre el mismo documento: HC Perú/SLL/EUDR comparten el informe técnico
  // ISO 14067, pero GRI y TCFD se organizan por su propia estructura de
  // divulgaciones y usan su propio generador.
  const generadorDe = (templateId: string) =>
    templateId === 'gri' ? generarInformeGRI : templateId === 'tcfd' ? generarInformeTCFD : generarInformeTecnico

  const descargarPDF = (titulo: string, templateId: string) => {
    const doc = generadorDe(templateId)(reporteDe(titulo))
    doc.save(`${nombreArchivo(titulo)}.pdf`)
  }

  const descargarExcel = (titulo: string) => {
    const r = reporteDe(titulo)
    const wb = XLSX.utils.book_new()

    const wsResumen = XLSX.utils.json_to_sheet(filasTabulares())
    XLSX.utils.sheet_add_aoa(wsResumen, [[titulo], resumenFiltros, []], { origin: 'A1' })
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(r.activityData.map((a) => ({
        Insumo: a.input, Valor: a.valor ?? 'sin dato', Unidad: a.unidad, Origen: a.origen,
      }))),
      'Activity data',
    )
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(r.factores.map((f) => ({
        Factor: f.factor, Valor: f.valor, Unidad: f.unidad, Fuente: f.fuente, Version: f.version, Alcance: `Scope ${f.scope}`, Mecanismo: f.mecanismo,
      }))),
      'Factores',
    )
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(r.resultados.mecanismos.map((m) => ({
        Mecanismo: m.label, 'kgCO2e/kg': m.intensidad ?? 'sin dato', '% del total': m.pct ?? 'sin dato',
      }))),
      'Por mecanismo',
    )
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(r.checklist.map((c) => ({
        Estado: c.cumplido ? 'Cumplido' : 'Pendiente', Requisito: c.titulo, Detalle: c.detalle,
      }))),
      'Checklist auditoria',
    )

    XLSX.writeFile(wb, `${nombreArchivo(titulo)}.xlsx`)
  }

  const descargarCSV = (titulo: string) => {
    const ws = XLSX.utils.json_to_sheet(filasTabulares())
    const cabecera = [titulo, ...resumenFiltros].join('\n') + '\n\n'
    const blob = new Blob([cabecera + XLSX.utils.sheet_to_csv(ws)], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${nombreArchivo(titulo)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <DashboardShell>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-[#13301F] tracking-tight">Biblioteca de Reportes</h1>
        <p className="text-[rgba(80,108,92,0.6)] mt-2 text-sm max-w-2xl">
          Arma el informe con lo que necesitas y descárgalo en el formato que te pidan. El PDF sale como informe
          técnico completo: objetivo y alcance, límites del sistema, datos de actividad, factores con fuente y versión,
          resultados por mecanismo y periodo de captura.
        </p>
      </motion.div>

      {/* ===== Nivel de validez ===== */}
      <div className="bg-white rounded-3xl border border-[rgba(90,190,145,0.15)] shadow-sm p-6 mb-6">
        <div className="flex flex-wrap items-start gap-4">
          <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-[rgba(210,162,74,0.14)] border border-[rgba(210,162,74,0.4)] text-[#8C5F14] text-xs font-bold whitespace-nowrap">
            <BadgeCheck className="w-4 h-4" />
            {NIVEL_VALIDEZ.badge}
          </span>
          <p className="flex-1 min-w-[260px] text-xs text-[rgba(80,108,92,0.85)] leading-relaxed">
            {NIVEL_VALIDEZ.nota}
          </p>
        </div>
        <p className="text-[11px] text-[rgba(80,108,92,0.5)] mt-3">
          El nivel aparece también en la portada y en el pie de cada página del PDF exportado.
        </p>
      </div>

      {/* ===== Personalización del reporte ===== */}
      <div className="bg-white rounded-3xl border border-[rgba(90,190,145,0.15)] shadow-sm p-6 mb-6">
        <h2 className="text-base font-bold text-[#13301F] mb-1">Personaliza tu reporte</h2>
        <p className="text-xs text-[rgba(80,108,92,0.6)] mb-5">
          Los filtros se aplican a las tres plantillas y a todos los formatos de descarga.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <fieldset>
            <legend className="text-xs font-bold text-[#13301F] uppercase tracking-wide mb-3">Cultivos</legend>
            <div className="space-y-2">
              {cultivosDisponibles.map((cultivo) => (
                <label key={cultivo} className="flex items-center gap-2.5 text-sm text-[rgba(80,108,92,0.9)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cultivosSel.includes(cultivo)}
                    onChange={() => toggle(cultivosSel, setCultivosSel, cultivo)}
                    className="w-4 h-4 rounded accent-[#137C53]"
                  />
                  {cultivo}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs font-bold text-[#13301F] uppercase tracking-wide mb-3">Alcances</legend>
            <div className="space-y-2">
              {([1, 2, 3] as const).map((s) => (
                <label key={s} className="flex items-center gap-2.5 text-sm text-[rgba(80,108,92,0.9)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scopesSel.includes(s)}
                    onChange={() => toggle(scopesSel, setScopesSel, s)}
                    className="w-4 h-4 rounded accent-[#137C53]"
                  />
                  Scope {s}
                  <span className="text-[11px] text-[rgba(80,108,92,0.5)]">
                    {s === 1 ? '· directas' : s === 2 ? '· electricidad' : '· cadena de valor'}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs font-bold text-[#13301F] uppercase tracking-wide mb-3">Período</legend>
            <div className="space-y-2">
              {PERIODOS.map((p) => (
                <label key={p.id} className="flex items-center gap-2.5 text-sm text-[rgba(80,108,92,0.9)] cursor-pointer">
                  <input
                    type="radio"
                    name="periodo"
                    checked={periodo === p.id}
                    onChange={() => setPeriodo(p.id)}
                    className="w-4 h-4 accent-[#137C53]"
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        {/* Vista previa del resultado */}
        <div className="mt-6 pt-5 border-t border-[rgba(90,190,145,0.15)]">
          {seleccionVacia ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              Selecciona al menos un cultivo y un alcance para generar el reporte.
            </p>
          ) : (
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-[rgba(80,108,92,0.5)] font-semibold">Huella seleccionada</p>
                <p className="text-xl font-black text-[#13301F]">{fmt(resultado.totalTon, 2)} <span className="text-sm font-bold text-[rgba(80,108,92,0.45)]">tCO₂e</span></p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-[rgba(80,108,92,0.5)] font-semibold">Intensidad</p>
                <p className="text-xl font-black text-[#13301F]">{fmt(resultado.intensidad, 3)} <span className="text-sm font-bold text-[rgba(80,108,92,0.45)]">kgCO₂e/kg</span></p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-[rgba(80,108,92,0.5)] font-semibold">Envíos incluidos</p>
                <p className="text-xl font-black text-[#13301F]">{resultado.enviosIncluidos}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-[rgba(80,108,92,0.5)] font-semibold">Factores documentados</p>
                <p className="text-xl font-black text-[#13301F]">{CATALOGO_FACTORES.length}</p>
              </div>
            </div>
          )}

          {resultado.esParcial && !seleccionVacia && (
            <p className="flex items-start gap-2 text-[11px] text-[rgba(80,108,92,0.65)] mt-4">
              <Info className="w-3.5 h-3.5 mt-px shrink-0" />
              El período prorratea las emisiones anuales según los kilos enviados en la ventana. La nota queda escrita en
              el reporte descargado.
            </p>
          )}
        </div>
      </div>

      {/* ===== Checklist listo para auditoría ===== */}
      <div className="bg-white rounded-3xl border border-[rgba(90,190,145,0.15)] shadow-sm p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#137C53]" />
            <h2 className="text-base font-bold text-[#13301F]">Listo para auditoría</h2>
          </div>
          <span className="text-xs font-bold text-[rgba(80,108,92,0.7)]">{cumplidos} de {checklist.length} requisitos cubiertos</span>
        </div>
        <p className="text-xs text-[rgba(80,108,92,0.6)] mb-4">
          Qué tiene y qué le falta a este reporte para pasar una verificación externa. Nada de esto bloquea la descarga
          del reporte autodeclarado.
        </p>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {checklist.map(({ item, cumplido }) => (
            <li
              key={item.id}
              className={`flex items-start gap-2.5 rounded-2xl border p-3 ${
                cumplido
                  ? 'border-[rgba(90,190,145,0.3)] bg-[rgba(90,190,145,0.06)]'
                  : 'border-[rgba(210,162,74,0.3)] bg-[rgba(210,162,74,0.06)]'
              }`}
            >
              {cumplido
                ? <CheckCircle2 className="w-4 h-4 text-[#137C53] flex-shrink-0 mt-0.5" />
                : <Circle className="w-4 h-4 text-[#B8862B] flex-shrink-0 mt-0.5" />}
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#13301F] leading-tight">
                  {item.titulo}
                  <span className={`ml-2 text-[10px] font-bold uppercase tracking-wide ${cumplido ? 'text-[#137C53]' : 'text-[#B8862B]'}`}>
                    {cumplido ? 'Cumplido' : 'Pendiente'}
                  </span>
                </p>
                <p className="text-[11px] text-[rgba(80,108,92,0.7)] leading-snug mt-0.5">{item.detalle}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* ===== Paquete de verificación (RF-C5) ===== */}
      <div className="bg-white rounded-3xl border border-[rgba(90,190,145,0.15)] shadow-sm p-6 mb-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex-1 min-w-[280px]">
            <div className="flex items-center gap-2 mb-1">
              <PackageCheck className="w-4 h-4 text-[#137C53]" />
              <h2 className="text-base font-bold text-[#13301F]">Paquete de verificación</h2>
            </div>
            <p className="text-xs text-[rgba(80,108,92,0.75)] leading-relaxed">
              El libro Excel que se le entrega al verificador acreditado. Trae la cadena completa —archivo, hoja,
              fila, factor, versión y emisión— más las dos hojas que un auditor revisa primero: las líneas que se
              excluyeron con su motivo, y las correcciones donde una persona sobreescribió a la máquina. Con esto
              no tiene que volver a pedirte los Excel originales.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {[
                `${fuentes.length} fuentes`,
                `${fuentes.reduce((n, f) => n + (f.lineas?.length ?? 0), 0)} líneas`,
                `${fuentes.reduce((n, f) => n + (f.lineas ?? []).filter((l) => l.corregido).length, 0)} correcciones`,
                `${resumenGasto.partidas} ${resumenGasto.partidas === 1 ? 'partida' : 'partidas'} de gasto`,
              ].map((t) => (
                <span key={t} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[rgba(90,190,145,0.12)] text-[#137C53]">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={descargarPaquete}
            disabled={generandoPaquete}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
            style={{ background: 'linear-gradient(135deg, #2BA470, #137C53)' }}
          >
            <Download className="w-4 h-4" />
            {generandoPaquete ? 'Generando…' : 'Descargar paquete'}
          </button>
        </div>
      </div>

      {/* ===== ODS (RF-C8) ===== */}
      <div className="bg-white rounded-3xl border border-[rgba(90,190,145,0.15)] shadow-sm p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[#137C53]" />
            <h2 className="text-base font-bold text-[#13301F]">Objetivos de Desarrollo Sostenible</h2>
          </div>
          <span className="text-xs font-bold text-[rgba(80,108,92,0.7)]">
            {ods.indicadoresConEvidencia} de {ods.totalIndicadores} indicadores con dato
          </span>
        </div>
        <p className="text-xs text-[rgba(80,108,92,0.6)] mb-4">
          Qué puedes sustentar con lo que ya cargaste, sin pedirle nada nuevo a las áreas.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ods.objetivos.map((o) => (
            <div
              key={o.objetivo.numero}
              className="rounded-2xl border border-[rgba(90,190,145,0.18)] p-4"
            >
              <div className="flex items-center gap-2.5 mb-2">
                <span
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-black flex-shrink-0"
                  style={{ background: o.objetivo.color }}
                >
                  {o.objetivo.numero}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#13301F] leading-tight">{o.objetivo.titulo}</p>
                  <p className={`text-[10px] font-bold uppercase tracking-wide ${
                    o.estado === 'con-evidencia' ? 'text-[#137C53]'
                      : o.estado === 'parcial' ? 'text-[#B8862B]' : 'text-[rgba(80,108,92,0.5)]'
                  }`}>
                    {ESTADO_LABEL[o.estado]}
                  </p>
                </div>
              </div>
              <ul className="space-y-1.5">
                {o.indicadores.map((i) => (
                  <li key={i.meta} className="flex items-start gap-2">
                    {i.estado === 'con-evidencia'
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-[#137C53] flex-shrink-0 mt-0.5" />
                      : i.estado === 'parcial'
                        ? <Circle className="w-3.5 h-3.5 text-[#B8862B] flex-shrink-0 mt-0.5" />
                        : <MinusCircle className="w-3.5 h-3.5 text-[rgba(80,108,92,0.35)] flex-shrink-0 mt-0.5" />}
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-[#13301F] leading-snug">
                        <span className="text-[rgba(80,108,92,0.6)]">{i.meta}</span> · {i.descripcion}
                      </p>
                      {i.dato && (
                        <p className="text-[10px] text-[rgba(80,108,92,0.65)] leading-snug">{i.dato}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex items-start gap-2.5 rounded-2xl border border-[rgba(210,162,74,0.28)] bg-[rgba(210,162,74,0.07)] p-3.5 mt-4">
          <Info className="w-4 h-4 text-[#8C5F14] flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-[#8C5F14] leading-relaxed">{NOTA_ODS}</p>
        </div>
      </div>

      {/* ===== Gasto ambiental (RF-B5) ===== */}
      <div className="bg-white rounded-3xl border border-[rgba(90,190,145,0.15)] shadow-sm p-6 mb-6">
        <h2 className="text-base font-bold text-[#13301F] mb-1">Gasto ambiental del periodo</h2>
        <p className="text-xs text-[rgba(80,108,92,0.6)] mb-4">
          El segundo entregable que suele pedir un holding: la inversión monetaria, en paralelo al indicador físico.
        </p>
        {resumenGasto.tieneDatos ? (
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-[rgba(80,108,92,0.6)]">Total</p>
              <p className="text-xl font-black text-[#13301F]">{formatoPEN(resumenGasto.totalPEN)}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-[rgba(80,108,92,0.6)]">Por tCO₂e</p>
              <p className="text-xl font-black text-[#13301F]">
                {resumenGasto.solesPorTon !== null ? formatoPEN(resumenGasto.solesPorTon) : 'Sin dato'}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-[rgba(80,108,92,0.6)]">Partidas</p>
              <p className="text-xl font-black text-[#13301F]">{resumenGasto.partidas}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2.5 rounded-2xl border border-[rgba(90,190,145,0.25)] bg-[rgba(90,190,145,0.06)] p-3.5">
            <Info className="w-4 h-4 text-[#137C53] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-[rgba(80,108,92,0.9)]">
              Sin partidas registradas. Regístralas en{' '}
              <a href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/gasto-ambiental/`} className="font-bold text-[#137C53] underline">
                Gasto ambiental
              </a>{' '}
              para que viajen al informe y al paquete de verificación.
            </p>
          </div>
        )}
      </div>

      {/* ===== Plantillas ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template, idx) => (
          <motion.div
            key={template.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white rounded-3xl border border-[rgba(90,190,145,0.15)] shadow-sm p-6 flex flex-col h-full hover:shadow-md hover:border-[#137C53]/30 transition-all"
          >
            <div className="w-12 h-12 rounded-2xl bg-[rgba(90,190,145,0.08)] flex items-center justify-center mb-4 text-[#137C53]">
              <FileText className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-[#13301F] mb-2 leading-tight">{template.title}</h2>
            <p className="text-sm text-[rgba(80,108,92,0.7)] mb-6 flex-grow">{template.description}</p>

            <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t border-[rgba(90,190,145,0.1)]">
              {template.formatos.pdf && (
                <button
                  onClick={() => descargarPDF(template.title, template.id)}
                  disabled={seleccionVacia}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold transition-colors flex-1 justify-center border border-red-100"
                >
                  <Download className="w-3.5 h-3.5" /> {template.id === 'gri' ? 'PDF GRI' : template.id === 'tcfd' ? 'PDF TCFD' : 'PDF técnico'}
                </button>
              )}
              {template.formatos.excel && (
                <button
                  onClick={() => descargarExcel(template.title)}
                  disabled={seleccionVacia}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold transition-colors flex-1 justify-center border border-green-200"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                </button>
              )}
              {template.formatos.csv && (
                <button
                  onClick={() => descargarCSV(template.title)}
                  disabled={seleccionVacia}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold transition-colors flex-1 justify-center border border-blue-100"
                >
                  <FileJson className="w-3.5 h-3.5" /> CSV
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </DashboardShell>
  )
}
