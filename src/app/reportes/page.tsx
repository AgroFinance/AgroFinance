'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Download, FileSpreadsheet, FileJson, Info } from 'lucide-react'
import DashboardShell from '@/components/layout/DashboardShell'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { campanias } from '@/lib/pilotEngine'
import { FUENTE_META, type FuenteEmision } from '@/lib/emissionFactors'

const templates = [
  {
    id: 'sll',
    title: 'Dossier para Crédito Verde (SLL)',
    description: 'Reporte ejecutivo con los indicadores que piden los bancos para evaluar una Sustainability Linked Loan.',
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
const fechaMasReciente = campanias
  .flatMap((c) => c.envios.map((e) => e.fecha))
  .sort()
  .at(-1) as string

function inicioDePeriodo(periodo: PeriodoId): Date | null {
  if (periodo === 'todo') return null
  const ref = new Date(fechaMasReciente)
  const meses = periodo === '1m' ? 1 : 3
  return new Date(ref.getFullYear(), ref.getMonth() - meses, ref.getDate())
}

const fmt = (n: number, d = 2) => n.toLocaleString('es-PE', { minimumFractionDigits: d, maximumFractionDigits: d })

export default function ReportesPage() {
  const [cultivosSel, setCultivosSel] = useState<string[]>(cultivosDisponibles)
  const [scopesSel, setScopesSel] = useState<(1 | 2 | 3)[]>([1, 2, 3])
  const [periodo, setPeriodo] = useState<PeriodoId>('todo')

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

  // Descripción legible de los filtros: va en el encabezado de cada export.
  const resumenFiltros = [
    `Cultivos: ${cultivosSel.length ? cultivosSel.join(', ') : 'ninguno'}`,
    `Alcances: ${scopesSel.length ? scopesSel.sort().map((s) => `Scope ${s}`).join(', ') : 'ninguno'}`,
    `Período: ${PERIODOS.find((p) => p.id === periodo)!.label}`,
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

  const descargarExcel = (titulo: string) => {
    const ws = XLSX.utils.json_to_sheet(filasTabulares())
    XLSX.utils.sheet_add_aoa(
      ws,
      [[titulo], resumenFiltros, ['PLAN GRATUITO — documento de demostración con datos de prueba'], []],
      { origin: 'A1' },
    )
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Huella')
    XLSX.writeFile(wb, `${nombreArchivo(titulo)}.xlsx`)
  }

  const descargarCSV = (titulo: string) => {
    const ws = XLSX.utils.json_to_sheet(filasTabulares())
    const cabecera = [titulo, ...resumenFiltros, 'PLAN GRATUITO — datos de prueba'].join('\n') + '\n\n'
    const blob = new Blob([cabecera + XLSX.utils.sheet_to_csv(ws)], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${nombreArchivo(titulo)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const descargarPDF = (titulo: string) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    doc.setFillColor(19, 48, 31)
    doc.rect(0, 0, 210, 34, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text(titulo, 14, 16)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text('AgroFinance AI · Chavín de Huántar S.A.C. · Campaña 2025-2026', 14, 24)

    doc.setTextColor(80, 108, 92)
    doc.setFontSize(9)
    resumenFiltros.forEach((linea, i) => doc.text(linea, 14, 45 + i * 5))

    doc.setTextColor(19, 48, 31)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(`Huella total: ${fmt(resultado.totalTon, 3)} tCO2e`, 14, 66)
    doc.text(`Intensidad: ${fmt(resultado.intensidad, 4)} kgCO2e/kg`, 14, 72)
    doc.text(`Kilos exportados: ${resultado.kilos.toLocaleString('es-PE')} kg`, 14, 78)

    autoTable(doc, {
      startY: 86,
      head: [['Fuente de emisión', 'Alcance', 'tCO2e']],
      body: resultado.filas.map((f) => [f.label, `Scope ${f.scope}`, fmt(f.ton, 3)]),
      foot: [['TOTAL', '', fmt(resultado.totalTon, 3)]],
      headStyles: { fillColor: [19, 124, 83] },
      footStyles: { fillColor: [244, 246, 242], textColor: [19, 48, 31], fontStyle: 'bold' },
      styles: { fontSize: 9 },
    })

    if (resultado.esParcial) {
      const y = (doc as any).lastAutoTable.finalY + 8
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(8)
      doc.setTextColor(80, 108, 92)
      doc.text(
        `Nota: el período seleccionado prorratea las emisiones anuales según los ${resultado.enviosIncluidos} envíos`,
        14, y,
      )
      doc.text('registrados en la ventana, sobre el total de kilos exportados.', 14, y + 4)
    }

    // Marca de agua del plan gratuito, en diagonal sobre cada página.
    const paginas = doc.getNumberOfPages()
    for (let p = 1; p <= paginas; p++) {
      doc.setPage(p)
      doc.saveGraphicsState()
      // @ts-expect-error GState existe en runtime pero no está en los tipos.
      doc.setGState(new doc.GState({ opacity: 0.12 }))
      doc.setTextColor(19, 124, 83)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(46)
      doc.text('PLAN GRATUITO', 105, 160, { align: 'center', angle: 32 })
      doc.restoreGraphicsState()
    }

    doc.save(`${nombreArchivo(titulo)}.pdf`)
  }

  return (
    <DashboardShell>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-[#13301F] tracking-tight">Biblioteca de Reportes</h1>
        <p className="text-[rgba(80,108,92,0.6)] mt-2 text-sm max-w-2xl">
          Arma el reporte con lo que necesitas y descárgalo en el formato que te pidan. Todo disponible en el plan
          gratuito, con marca de agua.
        </p>
      </motion.div>

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
                <p className="text-[11px] uppercase tracking-wide text-[rgba(80,108,92,0.5)] font-semibold">Fuentes</p>
                <p className="text-xl font-black text-[#13301F]">{resultado.filas.length}</p>
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
                  onClick={() => descargarPDF(template.title)}
                  disabled={seleccionVacia}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold transition-colors flex-1 justify-center border border-red-100"
                >
                  <Download className="w-3.5 h-3.5" /> PDF
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
