'use client'

import { motion } from 'framer-motion'
import { Droplet, CheckCircle2, Circle, Info } from 'lucide-react'
import DashboardShell from '@/shared/components/layout/DashboardShell'
import TerminoTooltip from '@/shared/components/ui/TerminoTooltip'
import { useHuellaHidrica, checklistCertificadoAzul, NOTA_CERTIFICADO_AZUL } from '@/modules/water-and-esg/domain/huellaHidrica'

const MECANISMO_LABEL: Record<'riego' | 'packing' | 'otro', string> = {
  riego: 'Riego',
  packing: 'Packing / lavado',
  otro: 'Otros consumos de agua',
}

export default function HuellaHidricaPage() {
  const hidrica = useHuellaHidrica()
  const checklist = checklistCertificadoAzul(hidrica)
  const cumplidos = checklist.filter((c) => c.cumplido).length

  return (
    <DashboardShell>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-[#13301F] tracking-tight flex items-center gap-2.5">
          <Droplet className="w-7 h-7 text-[#137C53]" /> Huella hídrica
        </h1>
        <p className="text-sm text-[rgba(80,108,92,0.6)] mt-1 max-w-2xl">
          Consumo de agua por mecanismo, a partir de los mismos archivos que ya vinculaste en Configuración, y tu
          avance hacia el Certificado Azul de la Autoridad Nacional del Agua (ANA).
        </p>
      </motion.div>

      {!hidrica.tieneDatos && (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-2xl border border-[rgba(210,162,74,0.3)] bg-[rgba(210,162,74,0.08)] p-4 mb-6"
        >
          <Info className="w-4 h-4 text-[#8C5F14] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[#8C5F14]">
            Todavía no se reconoce ninguna columna de agua en tus archivos vinculados. Sube un Excel con una columna
            como <code className="px-1 py-0.5 rounded bg-white/60 text-xs">riego_agua_m3</code> o{' '}
            <code className="px-1 py-0.5 rounded bg-white/60 text-xs">agua_lavado_m3</code> desde{' '}
            <a href="/configuracion/" className="underline font-semibold">Configuración</a> para que este panel
            deje de mostrar "sin dato".
          </p>
        </motion.div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl border border-[rgba(90,190,145,0.12)] p-5 shadow-[0_2px_16px_rgba(90,110,95,0.06)]">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[rgba(80,108,92,0.5)] mb-2">Consumo total</div>
          <div className="text-2xl font-black text-[#13301F]">
            {hidrica.m3Total === null ? 'sin dato' : hidrica.m3Total.toLocaleString('es-PE')}
            {hidrica.m3Total !== null && <span className="text-sm font-bold text-[rgba(80,108,92,0.5)] ml-1">m³</span>}
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-[rgba(90,190,145,0.12)] p-5 shadow-[0_2px_16px_rgba(90,110,95,0.06)]">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[rgba(80,108,92,0.5)] mb-2 flex items-center gap-1">
            Intensidad hídrica <TerminoTooltip termino="Intensidad hídrica" texto="Litros de agua por kilo de producto exportado. Se calcula con los mismos kilos de envío que usa la huella de carbono." />
          </div>
          <div className="text-2xl font-black text-[#13301F]">
            {hidrica.intensidad === null ? 'sin dato' : hidrica.intensidad}
            {hidrica.intensidad !== null && <span className="text-sm font-bold text-[rgba(80,108,92,0.5)] ml-1">L/kg</span>}
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl border border-[rgba(90,190,145,0.12)] p-5 shadow-[0_2px_16px_rgba(90,110,95,0.06)]">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[rgba(80,108,92,0.5)] mb-2">Certificado Azul</div>
          <div className="text-2xl font-black text-[#13301F]">{cumplidos}<span className="text-sm font-bold text-[rgba(80,108,92,0.5)]">/{checklist.length} requisitos</span></div>
        </motion.div>
      </div>

      {/* Desglose por mecanismo */}
      {hidrica.tieneDatos && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-[rgba(90,190,145,0.12)] p-5 sm:p-6 shadow-[0_2px_16px_rgba(90,110,95,0.06)] mb-6">
          <h3 className="font-bold text-[#13301F] text-base mb-4">Consumo por mecanismo</h3>
          <div className="space-y-3">
            {(Object.keys(hidrica.porMecanismo) as (keyof typeof hidrica.porMecanismo)[])
              .filter((m) => hidrica.porMecanismo[m] > 0)
              .sort((a, b) => hidrica.porMecanismo[b] - hidrica.porMecanismo[a])
              .map((m) => {
                const pct = hidrica.m3Total ? (hidrica.porMecanismo[m] / hidrica.m3Total) * 100 : 0
                return (
                  <div key={m}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-semibold text-[#13301F]">{MECANISMO_LABEL[m]}</span>
                      <span className="text-[rgba(80,108,92,0.6)]">{hidrica.porMecanismo[m].toLocaleString('es-PE')} m³ · {pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-[rgba(90,190,145,0.08)] rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }}
                        className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #7DD3FC, #0EA5E9)' }} />
                    </div>
                  </div>
                )
              })}
          </div>
        </motion.div>
      )}

      {/* Checklist Certificado Azul */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="bg-white rounded-2xl border border-[rgba(90,190,145,0.12)] p-5 sm:p-6 shadow-[0_2px_16px_rgba(90,110,95,0.06)]">
        <h3 className="font-bold text-[#13301F] text-base mb-1">Checklist Certificado Azul</h3>
        <p className="text-xs text-[rgba(80,108,92,0.6)] mb-5">{NOTA_CERTIFICADO_AZUL}</p>
        <div className="space-y-1.5">
          {checklist.map((item) => (
            <div key={item.id} className="flex items-start gap-2.5 py-2 border-b border-[rgba(90,190,145,0.08)] last:border-0">
              {item.cumplido
                ? <CheckCircle2 className="w-4 h-4 text-[#137C53] flex-shrink-0 mt-0.5" />
                : <Circle className="w-4 h-4 text-[rgba(80,108,92,0.3)] flex-shrink-0 mt-0.5" />}
              <div>
                <div className="text-sm font-semibold text-[#13301F]">
                  {item.titulo}
                  {item.gestionExterna && (
                    <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-[rgba(80,108,92,0.45)]">Gestión con ANA</span>
                  )}
                </div>
                <p className="text-xs text-[rgba(80,108,92,0.6)]">{item.detalle}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </DashboardShell>
  )
}
