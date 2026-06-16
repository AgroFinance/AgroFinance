'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileSpreadsheet, Plus, Eye, X, CheckCircle2, RefreshCw, ShieldCheck, Database,
} from 'lucide-react'
import DashboardShell from '@/components/layout/DashboardShell'
import { campos, packing, envios } from '@/lib/pilotData'
import { FE } from '@/lib/emissionFactors'

type Preview = { columnas: string[]; filas: (string | number)[][] }
type Fuente = { area: string; archivo: string; actualizado: string; estado: 'sincronizado' | 'procesando'; preview: Preview }

// Fuentes = los Excel propios de cada área (data real de DATA/). La plataforma los LEE.
const fuentes: Fuente[] = [
  {
    area: 'Riego', archivo: 'Control_de_Campo_.xlsx', actualizado: '01 Jun 2026', estado: 'sincronizado',
    preview: {
      columnas: ['id_campo', 'empresa', 'cultivo', 'hectareas', 'electricidad_riego_kwh', 'fertilizante_nitrogenado_kg'],
      filas: campos.map((c) => [c.idCampo, c.empresa, c.cultivo, c.hectareas, c.electricidadRiegoKwh, c.fertilizanteKg]),
    },
  },
  {
    area: 'Logística', archivo: 'Tracking_Aduanas_Exportacion.xlsx', actualizado: '28 May 2026', estado: 'sincronizado',
    preview: {
      columnas: ['id_envio', 'cultivo', 'fecha_despacho', 'puerto_destino_europa', 'peso_neto_fruta_kg', 'distancia_maritima_km'],
      filas: envios.slice(0, 14).map((e) => [e.idEnvio, e.cultivo, e.fecha, e.puertoDestino, e.pesoNetoKg, e.distanciaMaritimaKm]),
    },
  },
  {
    area: 'Finanzas', archivo: 'Reporte_Mensual_Packing_y_Mermas.xlsx', actualizado: '30 May 2026', estado: 'sincronizado',
    preview: {
      columnas: ['id_packing', 'empresa', 'electricidad_packing_kwh', 'toneladas_procesadas', 'ratio_descarte_local_pct'],
      filas: packing.map((p) => [p.idPacking, p.empresa, p.electricidadPackingKwh, p.toneladasProcesadas, p.ratioDescartePct]),
    },
  },
  {
    area: 'Producción', archivo: 'Control_de_Campo_Masivo_Q1_Q4.xlsx', actualizado: 'En proceso', estado: 'procesando',
    preview: {
      columnas: ['id_campo', 'cultivo', 'diesel_campo_gal', 'rendimiento_total_tn'],
      filas: campos.map((c) => [c.idCampo, c.cultivo, c.dieselGal, c.rendimientoTon]),
    },
  },
]

const factores = [
  { nombre: 'SEIN 2025', fuente: 'MINAM / COES', valor: FE.electricidadSEIN.valor, unidad: 'kgCO₂e/kWh' },
  { nombre: 'Diésel B5', fuente: 'IPCC / DEFRA', valor: FE.dieselLitro.valor, unidad: 'kgCO₂/litro' },
  { nombre: 'Flete marítimo reefer', fuente: 'GLEC / ISO 14083', valor: FE.buqueReefer.valor, unidad: 'kgCO₂e/t·km' },
  { nombre: 'Camión reefer', fuente: 'DEFRA / GLEC', valor: FE.camionReefer.valor, unidad: 'kgCO₂e/t·km' },
  { nombre: 'Urea (producción)', fuente: 'Ecoinvent + IPCC 2019', valor: FE.ureaProduccion.valor, unidad: 'kgCO₂e/kg' },
  { nombre: 'Cartón corrugado', fuente: 'Ecoinvent / DEFRA', valor: FE.cartonCorrugado.valor, unidad: 'kgCO₂e/kg' },
]

export default function ConfiguracionPage() {
  const [preview, setPreview] = useState<Fuente | null>(null)

  return (
    <DashboardShell>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-[#13301F] tracking-tight">Configuración</h1>
        <p className="text-[rgba(80,108,92,0.6)] mt-1 text-sm">Fuentes de datos y factores de emisión activos del cálculo</p>
      </motion.div>

      {/* ===== Fuentes de datos ===== */}
      <div className="bg-white rounded-3xl border border-[rgba(90,190,145,0.12)] shadow-sm p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div>
            <h2 className="text-base font-bold text-[#13301F]">Fuentes de datos</h2>
            <p className="text-xs text-[rgba(80,108,92,0.6)] mt-0.5 max-w-xl">AgroFinance lee los archivos Excel que cada área de tu empresa ya usa — sin plantillas que llenar.</p>
          </div>
          <button className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#13301F] text-white text-xs font-semibold hover:bg-[#0E2418] active:scale-95 transition-all">
            <Plus className="w-4 h-4" /> Vincular nuevo archivo
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-[rgba(80,108,92,0.5)] border-b border-[rgba(90,190,145,0.12)]">
                <th className="py-2.5 pr-3 font-semibold">Área</th>
                <th className="py-2.5 pr-3 font-semibold">Archivo</th>
                <th className="py-2.5 pr-3 font-semibold">Última actualización</th>
                <th className="py-2.5 pr-3 font-semibold">Estado</th>
                <th className="py-2.5 text-right font-semibold">Datos</th>
              </tr>
            </thead>
            <tbody>
              {fuentes.map((f) => (
                <tr key={f.area} className="border-b border-[rgba(90,190,145,0.07)] last:border-0">
                  <td className="py-3.5 pr-3 font-bold text-[#13301F]">{f.area}</td>
                  <td className="py-3.5 pr-3">
                    <span className="inline-flex items-center gap-2 text-[rgba(80,108,92,0.85)]">
                      <FileSpreadsheet className="w-4 h-4 text-[#137C53]" /> {f.archivo}
                    </span>
                  </td>
                  <td className="py-3.5 pr-3 text-[rgba(80,108,92,0.7)]">{f.actualizado}</td>
                  <td className="py-3.5 pr-3">
                    {f.estado === 'sincronizado' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[rgba(90,190,145,0.12)] text-[#137C53] border border-[rgba(90,190,145,0.25)]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Sincronizado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[rgba(61,127,176,0.1)] text-[#3D7FB0] border border-[rgba(61,127,176,0.22)]">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '2.5s' }} /> Procesando
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 text-right">
                    <button onClick={() => setPreview(f)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#137C53] hover:text-[#0E7A4E] transition-colors">
                      <Eye className="w-4 h-4" /> Previsualizar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex items-start gap-2.5 rounded-2xl bg-[rgba(90,190,145,0.06)] border border-[rgba(90,190,145,0.15)] p-3.5">
          <ShieldCheck className="w-4 h-4 text-[#137C53] flex-shrink-0 mt-0.5" />
          <p className="text-xs text-[rgba(80,108,92,0.8)] leading-relaxed">
            <strong className="text-[#13301F]">Onboarding sin fricción:</strong> estos son los Excel propios de cada área (riego, logística, finanzas, producción), no plantillas de AgroFinance. La plataforma se adapta a tus archivos — no al revés.
          </p>
        </div>
      </div>

      {/* ===== Factores de emisión activos ===== */}
      <div className="bg-white rounded-3xl border border-[rgba(90,190,145,0.12)] shadow-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <Database className="w-4 h-4 text-[#137C53]" />
          <h2 className="text-base font-bold text-[#13301F]">Factores de emisión activos</h2>
        </div>
        <p className="text-xs text-[rgba(80,108,92,0.6)] mb-5">Fuentes oficiales aplicadas en el cálculo de la huella (versionadas por fuente)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {factores.map((f) => (
            <div key={f.nombre} className="rounded-2xl border border-[rgba(90,190,145,0.12)] bg-[rgba(244,246,242,0.6)] p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#13301F]">{f.nombre}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[rgba(80,108,92,0.45)]">{f.fuente}</span>
              </div>
              <div className="mt-2 text-2xl font-black text-[#137C53]">
                {f.valor} <span className="text-xs font-semibold text-[rgba(80,108,92,0.5)]">{f.unidad}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-[rgba(80,108,92,0.45)] mt-4">GWP IPCC AR6 (GWP-100). El factor SEIN se actualiza con el valor oficial anual del MINAM/COES.</p>
      </div>

      {/* ===== Modal Previsualizar Excel ===== */}
      <AnimatePresence>
        {preview && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setPreview(null)}
            className="fixed inset-0 z-[70] bg-[rgba(11,46,33,0.55)] backdrop-blur-sm flex items-start sm:items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl my-6 overflow-hidden"
            >
              <div className="flex items-start gap-3 p-5 sm:p-6 border-b border-[rgba(90,190,145,0.12)]">
                <span className="flex-shrink-0 w-9 h-9 rounded-xl bg-[rgba(90,190,145,0.12)] flex items-center justify-center"><FileSpreadsheet className="w-5 h-5 text-[#137C53]" /></span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-black text-[#13301F] leading-tight truncate">{preview.archivo}</h3>
                  <p className="text-xs text-[rgba(80,108,92,0.6)]">Área {preview.area} · vista previa de las filas leídas</p>
                </div>
                <button onClick={() => setPreview(null)} className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[rgba(80,108,92,0.5)] hover:bg-[rgba(90,190,145,0.1)] hover:text-[#13301F] transition-colors" aria-label="Cerrar">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-5 sm:px-6 pt-4">
                <div className="flex items-center gap-2 rounded-xl bg-[rgba(90,190,145,0.06)] border border-[rgba(90,190,145,0.15)] px-3 py-2 mb-3">
                  <ShieldCheck className="w-4 h-4 text-[#137C53] flex-shrink-0" />
                  <p className="text-xs font-semibold text-[#137C53]">AgroFinance no modifica tus archivos — solo los lee.</p>
                </div>
              </div>

              <div className="px-5 sm:px-6 pb-5 max-h-[60vh] overflow-auto">
                <div className="rounded-xl border border-[rgba(90,190,145,0.12)] overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[rgba(244,246,242,0.95)] text-[rgba(80,108,92,0.55)] text-left uppercase tracking-wide text-[10px] sticky top-0">
                        {preview.columnas.map((c) => <th key={c} className="px-3 py-2 font-semibold whitespace-nowrap">{c}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.filas.map((fila, i) => (
                        <tr key={i} className="border-t border-[rgba(90,190,145,0.07)]">
                          {fila.map((cell, j) => (
                            <td key={j} className={`px-3 py-2 whitespace-nowrap ${j === 0 ? 'font-semibold text-[#13301F]' : 'text-[rgba(80,108,92,0.8)]'}`}>{typeof cell === 'number' ? cell.toLocaleString('es-PE') : cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-[rgba(80,108,92,0.45)] mt-2">{preview.filas.length} filas leídas · {preview.columnas.length} columnas detectadas</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardShell>
  )
}
