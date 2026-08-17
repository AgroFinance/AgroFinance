'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Sparkles, Download, FileSpreadsheet, RotateCcw, CheckCircle2, Lock,
} from 'lucide-react'
import DashboardShell from '@/components/layout/DashboardShell'
import { cooperativa } from '@/lib/pilotEngine'
import {
  construirAcciones, reduccionTon, reduccionPct, armarPlanKapi, METALL,
  type AccionReduccion, type Categoria,
} from '@/lib/reduccionActions'

const fmtTon = (n: number) => n.toLocaleString('es-PE', { maximumFractionDigits: 1 })
const fmtPct = (n: number) => n.toLocaleString('es-PE', { maximumFractionDigits: 2 })

const CATEGORIA_COLOR: Record<Categoria, string> = {
  Transporte: 'bg-blue-50 text-blue-700 border-blue-200',
  Fertilizantes: 'bg-amber-50 text-amber-700 border-amber-200',
  Empaque: 'bg-stone-100 text-stone-700 border-stone-200',
  Energía: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Residuos: 'bg-purple-50 text-purple-700 border-purple-200',
}

export default function PlanReduccionPage() {
  const acciones = useMemo(() => construirAcciones(), [])
  const totalTon = cooperativa.huellaTotalTon
  const metaTon = totalTon * (METALL.pctObjetivo / 100)

  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set())

  const acumuladoTon = useMemo(
    () => acciones.filter((a) => seleccionadas.has(a.id)).reduce((sum, a) => sum + reduccionTon(a, totalTon), 0),
    [acciones, seleccionadas, totalTon],
  )
  const progresoPct = metaTon > 0 ? Math.min(100, (acumuladoTon / metaTon) * 100) : 0
  const metaCumplida = acumuladoTon >= metaTon

  const toggle = (id: string) => {
    setSeleccionadas((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const queKapiArmeElPlan = () => setSeleccionadas(armarPlanKapi(acciones, totalTon))
  const empezarDeCero = () => setSeleccionadas(new Set())

  const exportarCSV = () => {
    const header = ['Acción', 'Categoría', 'Alcance', 'Reducción (tCO2e)', '% de la huella', 'Inversión Neta (Sin IGV)', 'Seleccionada']
    const rows = acciones.map((a) => [
      a.titulo, a.categoria, `Alcance ${a.scope}`, fmtTon(reduccionTon(a, totalTon)),
      fmtPct(reduccionPct(a, totalTon)), a.inversionLabel, seleccionadas.has(a.id) ? 'Sí' : 'No',
    ])
    const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'plan-de-reduccion-agrofinance.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <DashboardShell>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#13301F]">Plan de reducción</h1>
            <p className="text-sm text-[rgba(80,108,92,0.75)] mt-1 max-w-xl">
              Reducir no es un gesto verde: es el covenant que activa el descuento en su tasa.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={empezarDeCero}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border border-[rgba(80,108,92,0.2)] text-[#13301F] hover:bg-[rgba(80,108,92,0.05)] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Empezar de cero
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={queKapiArmeElPlan}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-white bg-[#137C53] hover:bg-[#0F6543] transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" /> Que Kapi arme el plan
            </motion.button>
          </div>
        </div>

        {/* Meta comprometida con el banco */}
        <div className="rounded-2xl border border-[rgba(80,108,92,0.15)] bg-white p-5 mb-6 print:break-inside-avoid print:border-[rgba(80,108,92,0.4)]">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <div>
              <span className="text-[11px] font-semibold tracking-wide text-[rgba(80,108,92,0.6)] uppercase">
                Meta comprometida · {METALL.banco}
              </span>
              <p className="text-base font-semibold text-[#13301F] mt-0.5">
                Reducir {METALL.pctObjetivo}% de la huella en 12 meses
              </p>
            </div>
            <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-semibold ${
              metaCumplida
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-[rgba(80,108,92,0.06)] border-[rgba(80,108,92,0.15)] text-[rgba(80,108,92,0.75)]'
            }`}>
              {metaCumplida ? <CheckCircle2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              {metaCumplida ? `-${METALL.bpsDescuento} bps activado` : `-${METALL.bpsDescuento} bps bloqueado`}
            </div>
          </div>

          <div className="h-2.5 rounded-full bg-[rgba(80,108,92,0.1)] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-[#137C53]"
              initial={{ width: 0 }}
              animate={{ width: `${progresoPct}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
          <p className="text-xs text-[rgba(80,108,92,0.7)] mt-2">
            {fmtTon(acumuladoTon)} de {fmtTon(metaTon)} tCO₂e seleccionadas · {fmtPct(progresoPct)}% de la meta
            {!metaCumplida && ` · faltan ${fmtTon(Math.max(0, metaTon - acumuladoTon))} tCO₂e para activar el descuento sobre la línea de US$${METALL.lineaAprobableUSD.toLocaleString('en-US')}`}
          </p>
        </div>

        {/* Export */}
        <div className="flex items-center justify-end gap-2 mb-3 print:hidden">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={exportarCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[rgba(80,108,92,0.2)] text-[#13301F] hover:bg-[rgba(80,108,92,0.05)] transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Descargar Excel (CSV)
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[rgba(80,108,92,0.2)] text-[#13301F] hover:bg-[rgba(80,108,92,0.05)] transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Exportar dossier PDF
          </motion.button>
        </div>

        {/* Tabla de acciones */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="rounded-2xl border border-[rgba(80,108,92,0.15)] bg-white overflow-hidden print:break-inside-avoid"
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(80,108,92,0.1)] text-left text-[11px] font-semibold tracking-wide text-[rgba(80,108,92,0.55)] uppercase">
                <th className="px-4 py-3 w-10" />
                <th className="px-2 py-3">Acción</th>
                <th className="px-2 py-3">Reducción</th>
                <th className="px-2 py-3">Inversión Neta (Sin IGV)</th>
                <th className="px-2 py-3">Alcance</th>
                <th className="px-4 py-3 text-right">Periodo</th>
              </tr>
            </thead>
            <tbody>
              {acciones.map((a) => {
                const ton = reduccionTon(a, totalTon)
                const pct = reduccionPct(a, totalTon)
                const activa = seleccionadas.has(a.id)
                return (
                  <tr
                    key={a.id}
                    onClick={() => toggle(a.id)}
                    className={`border-b border-[rgba(80,108,92,0.08)] last:border-0 cursor-pointer transition-colors print:break-inside-avoid ${
                      activa ? 'bg-emerald-50/60' : 'hover:bg-[rgba(80,108,92,0.03)]'
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={activa}
                        onChange={() => toggle(a.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded accent-[#137C53]"
                      />
                    </td>
                    <td className="px-2 py-3.5">
                      <p className="font-medium text-[#13301F]">{a.titulo}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${CATEGORIA_COLOR[a.categoria]}`}>
                          {a.categoria}
                        </span>
                        <span className="text-xs text-[rgba(80,108,92,0.6)]">{a.detalle}</span>
                      </div>
                    </td>
                    <td className="px-2 py-3.5">
                      <p className="font-semibold text-[#13301F]">{fmtTon(ton)} tCO₂e</p>
                      <p className="text-xs text-[rgba(80,108,92,0.6)]">{fmtPct(pct)}% de la huella</p>
                    </td>
                    <td className="px-2 py-3.5 text-[rgba(80,108,92,0.85)]">{a.inversionLabel}</td>
                    <td className="px-2 py-3.5">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[rgba(80,108,92,0.08)] text-[#13301F]">
                        Alcance {a.scope}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right text-[rgba(80,108,92,0.75)]">{a.periodo}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </motion.div>

        <p className="text-xs text-[rgba(80,108,92,0.55)] mt-3">
          Reducciones estimadas sobre el inventario de la campaña ({fmtTon(totalTon)} tCO₂e), calculado bajo GHG Protocol
          + ISO 14067 con factores MINAM/COES SEIN, IPCC 2019 e ISO 14083 para transporte.
        </p>
      </div>
    </DashboardShell>
  )
}
