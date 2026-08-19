'use client'

// ============================================================
// Gasto ambiental (RF-B5)
// ------------------------------------------------------------
// La otra mitad del entregable que pide el holding: cuánto costó, en
// dinero, sostener la gestión ambiental del periodo. Convive con el
// indicador físico pero no se mezcla con él — son dos reportes distintos.
// ============================================================

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wallet, Plus, Trash2, Info, AlertTriangle, FileWarning, TrendingUp, X,
} from 'lucide-react'
import DashboardShell from '@/components/layout/DashboardShell'
import { useHuellaConsolidada } from '@/lib/engine/huellaConsolidada'
import {
  useGastoAmbiental, resumirGasto, formatoPEN, aSoles,
  CATEGORIAS, CATEGORIA_META, MONEDA_SIMBOLO,
  type CategoriaGasto, type Moneda,
} from '@/lib/engine/gastoAmbiental'

const hoyISO = () => new Date().toISOString().slice(0, 10)

const FORM_VACIO = {
  categoria: 'monitoreos' as CategoriaGasto,
  concepto: '',
  monto: '',
  moneda: 'PEN' as Moneda,
  fecha: hoyISO(),
  proveedor: '',
  respaldo: '',
}

export default function GastoAmbientalPage() {
  const { huella } = useHuellaConsolidada()
  const { estado, agregar, eliminar, setTipoCambio } = useGastoAmbiental()
  const [form, setForm] = useState(FORM_VACIO)
  const [abierto, setAbierto] = useState(false)

  const resumen = useMemo(
    () => resumirGasto(estado, huella.huellaTotalTon),
    [estado, huella.huellaTotalTon],
  )

  const montoNum = Number(form.monto)
  const montoValido = form.monto.trim() !== '' && isFinite(montoNum) && montoNum > 0
  const puedeGuardar = montoValido && form.concepto.trim().length > 2

  const guardar = () => {
    if (!puedeGuardar) return
    agregar({
      categoria: form.categoria,
      concepto: form.concepto,
      monto: montoNum,
      moneda: form.moneda,
      fecha: form.fecha,
      proveedor: form.proveedor,
      respaldo: form.respaldo,
    })
    setForm({ ...FORM_VACIO, fecha: form.fecha })
    setAbierto(false)
  }

  const campo = 'w-full px-3 py-2 rounded-xl border border-[rgba(90,190,145,0.28)] text-sm text-[#13301F] bg-white focus:outline-none focus:ring-2 focus:ring-[#137C53]/35'
  const etiqueta = 'block text-[11px] font-bold text-[#13301F] uppercase tracking-wide mb-1.5'

  return (
    <DashboardShell>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-[#13301F] tracking-tight flex items-center gap-2.5">
          <Wallet className="w-7 h-7 text-[#137C53]" /> Gasto ambiental
        </h1>
        <p className="text-sm text-[rgba(80,108,92,0.6)] mt-1 max-w-2xl">
          La inversión en dinero que sostuvo la gestión ambiental del periodo. Va en paralelo al indicador físico
          de huella: son los dos reportes que suele pedir un holding o un fondo, y hasta ahora este se armaba a mano.
        </p>
      </motion.div>

      {/* ===== KPIs ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-3xl border border-[rgba(90,190,145,0.15)] shadow-sm p-5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[rgba(80,108,92,0.6)]">Inversión total</p>
          <p className="text-2xl font-black text-[#13301F] mt-1.5">
            {resumen.tieneDatos ? formatoPEN(resumen.totalPEN) : 'Sin dato'}
          </p>
          <p className="text-[11px] text-[rgba(80,108,92,0.55)] mt-1">
            {resumen.partidas} {resumen.partidas === 1 ? 'partida registrada' : 'partidas registradas'}
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-[rgba(90,190,145,0.15)] shadow-sm p-5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[rgba(80,108,92,0.6)]">
            Intensidad de inversión
          </p>
          <p className="text-2xl font-black text-[#13301F] mt-1.5">
            {resumen.solesPorTon !== null ? formatoPEN(resumen.solesPorTon) : 'Sin dato'}
          </p>
          <p className="text-[11px] text-[rgba(80,108,92,0.55)] mt-1">
            {resumen.solesPorTon !== null
              ? 'por tonelada de CO₂e del inventario'
              : 'requiere huella calculada y gasto registrado'}
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-[rgba(90,190,145,0.15)] shadow-sm p-5">
          <label className={etiqueta} htmlFor="tc">Tipo de cambio declarado</label>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[rgba(80,108,92,0.7)]">S/</span>
            <input
              id="tc"
              type="number"
              step="0.01"
              min="0.01"
              value={estado.tipoCambio}
              onChange={(e) => setTipoCambio(Number(e.target.value))}
              className={campo}
            />
            <span className="text-sm font-bold text-[rgba(80,108,92,0.7)] whitespace-nowrap">/ US$</span>
          </div>
          <p className="text-[11px] text-[rgba(80,108,92,0.55)] mt-1.5">
            Lo declaras tú y se imprime en el informe, para que el total sea reproducible.
          </p>
        </div>
      </div>

      {/* ===== Avisos de auditoría ===== */}
      {resumen.obligacionesSinGasto.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-[rgba(210,162,74,0.3)] bg-[rgba(210,162,74,0.08)] p-4 mb-4">
          <AlertTriangle className="w-4 h-4 text-[#8C5F14] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[#8C5F14]">
            <strong>Obligaciones recurrentes sin gasto registrado:</strong>{' '}
            {resumen.obligacionesSinGasto.join(', ')}. Son declaraciones que la autoridad ambiental exige de forma
            periódica; si el periodo va sin partida, conviene confirmar que efectivamente no hubo gasto.
          </p>
        </div>
      )}

      {resumen.sinRespaldo > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-[rgba(200,80,80,0.28)] bg-[rgba(200,80,80,0.07)] p-4 mb-4">
          <FileWarning className="w-4 h-4 text-[#A33] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[#A33]">
            <strong>{resumen.sinRespaldo}</strong>{' '}
            {resumen.sinRespaldo === 1 ? 'partida no declara' : 'partidas no declaran'} documento de respaldo.
            Se incluyen en el total, pero el paquete de verificación las marca — un verificador las va a pedir.
          </p>
        </div>
      )}

      {/* ===== Alta de partida ===== */}
      <div className="bg-white rounded-3xl border border-[rgba(90,190,145,0.15)] shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between gap-4 mb-1">
          <h2 className="text-base font-bold text-[#13301F]">Registrar una partida</h2>
          <button
            onClick={() => setAbierto((v) => !v)}
            aria-expanded={abierto}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, #2BA470, #137C53)' }}
          >
            {abierto ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {abierto ? 'Cerrar' : 'Nueva partida'}
          </button>
        </div>
        <p className="text-xs text-[rgba(80,108,92,0.6)]">
          Cada partida viaja al informe y al paquete de verificación con su documento de respaldo.
        </p>

        <AnimatePresence initial={false}>
          {abierto && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-5">
                <div className="md:col-span-2">
                  <label className={etiqueta} htmlFor="cat">Categoría</label>
                  <select
                    id="cat"
                    value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value as CategoriaGasto })}
                    className={campo}
                  >
                    {CATEGORIAS.map((c) => (
                      <option key={c} value={c}>
                        {CATEGORIA_META[c].label}{CATEGORIA_META[c].obligatorio ? ' · obligación legal' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-[rgba(80,108,92,0.55)] mt-1.5">
                    {CATEGORIA_META[form.categoria].detalle}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className={etiqueta} htmlFor="concepto">Concepto</label>
                  <input
                    id="concepto"
                    value={form.concepto}
                    onChange={(e) => setForm({ ...form, concepto: e.target.value })}
                    placeholder="Ej. Monitoreo anual de calidad de agua — fundo Casma"
                    className={campo}
                  />
                </div>

                <div>
                  <label className={etiqueta} htmlFor="monto">Monto</label>
                  <div className="flex gap-2">
                    <select
                      aria-label="Moneda"
                      value={form.moneda}
                      onChange={(e) => setForm({ ...form, moneda: e.target.value as Moneda })}
                      className={`${campo} w-24`}
                    >
                      <option value="PEN">S/</option>
                      <option value="USD">US$</option>
                    </select>
                    <input
                      id="monto"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.monto}
                      onChange={(e) => setForm({ ...form, monto: e.target.value })}
                      placeholder="0.00"
                      className={campo}
                    />
                  </div>
                  {form.moneda === 'USD' && montoValido && (
                    <p className="text-[11px] text-[rgba(80,108,92,0.6)] mt-1.5">
                      Equivale a {formatoPEN(montoNum * estado.tipoCambio)} al tipo de cambio declarado.
                    </p>
                  )}
                </div>

                <div>
                  <label className={etiqueta} htmlFor="fecha">Fecha del comprobante</label>
                  <input
                    id="fecha"
                    type="date"
                    value={form.fecha}
                    onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                    className={campo}
                  />
                </div>

                <div>
                  <label className={etiqueta} htmlFor="prov">Proveedor</label>
                  <input
                    id="prov"
                    value={form.proveedor}
                    onChange={(e) => setForm({ ...form, proveedor: e.target.value })}
                    placeholder="Ej. Laboratorio ambiental acreditado"
                    className={campo}
                  />
                </div>

                <div>
                  <label className={etiqueta} htmlFor="resp">Documento de respaldo</label>
                  <input
                    id="resp"
                    value={form.respaldo}
                    onChange={(e) => setForm({ ...form, respaldo: e.target.value })}
                    placeholder="Ej. Factura F001-2451 / Informe MON-2026-03"
                    className={campo}
                  />
                </div>

                <div className="md:col-span-2 flex justify-end">
                  <button
                    onClick={guardar}
                    disabled={!puedeGuardar}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg, #2BA470, #137C53)' }}
                  >
                    Guardar partida
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ===== Desglose por categoría ===== */}
      {resumen.tieneDatos && (
        <div className="bg-white rounded-3xl border border-[rgba(90,190,145,0.15)] shadow-sm p-6 mb-6">
          <h2 className="text-base font-bold text-[#13301F] mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#137C53]" /> Distribución por categoría
          </h2>
          <div className="space-y-3">
            {resumen.porCategoria.filter((c) => c.partidas > 0).map((c) => (
              <div key={c.categoria}>
                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <span className="text-sm font-semibold text-[#13301F]">{c.label}</span>
                  <span className="text-sm font-bold text-[#13301F] whitespace-nowrap">
                    {formatoPEN(c.totalPEN)}{' '}
                    <span className="text-[rgba(80,108,92,0.55)] font-medium">· {c.pct}%</span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[rgba(90,190,145,0.14)] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${c.pct}%`, background: 'linear-gradient(90deg, #2BA470, #137C53)' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== Partidas ===== */}
      <div className="bg-white rounded-3xl border border-[rgba(90,190,145,0.15)] shadow-sm p-6">
        <h2 className="text-base font-bold text-[#13301F] mb-4">Partidas del periodo</h2>

        {!resumen.tieneDatos ? (
          <div className="flex items-start gap-3 rounded-2xl border border-[rgba(90,190,145,0.25)] bg-[rgba(90,190,145,0.06)] p-4">
            <Info className="w-4 h-4 text-[#137C53] flex-shrink-0 mt-0.5" />
            <p className="text-sm text-[rgba(80,108,92,0.9)]">
              Todavía no hay ninguna partida registrada. Mientras esté vacío, el informe declara el gasto ambiental
              como <strong>sin dato</strong> — no como cero, que significaría que no hubo inversión.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-[rgba(80,108,92,0.6)] border-b border-[rgba(90,190,145,0.18)]">
                  <th className="pb-2 font-bold">Fecha</th>
                  <th className="pb-2 font-bold">Categoría</th>
                  <th className="pb-2 font-bold">Concepto</th>
                  <th className="pb-2 font-bold">Respaldo</th>
                  <th className="pb-2 font-bold text-right">Monto</th>
                  <th className="pb-2 font-bold text-right">En soles</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {estado.partidas.map((p) => (
                  <tr key={p.id} className="border-b border-[rgba(90,190,145,0.1)] last:border-0">
                    <td className="py-2.5 text-[rgba(80,108,92,0.85)] whitespace-nowrap">{p.fecha}</td>
                    <td className="py-2.5 text-[rgba(80,108,92,0.85)]">{CATEGORIA_META[p.categoria].label}</td>
                    <td className="py-2.5 text-[#13301F] font-medium">
                      {p.concepto}
                      {p.proveedor && (
                        <span className="block text-[11px] text-[rgba(80,108,92,0.55)]">{p.proveedor}</span>
                      )}
                    </td>
                    <td className="py-2.5">
                      {p.respaldo ? (
                        <span className="text-[rgba(80,108,92,0.85)]">{p.respaldo}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#A33]">
                          <FileWarning className="w-3 h-3" /> sin respaldo
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-right whitespace-nowrap text-[rgba(80,108,92,0.85)]">
                      {MONEDA_SIMBOLO[p.moneda]} {p.monto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 text-right whitespace-nowrap font-bold text-[#13301F]">
                      {formatoPEN(aSoles(p, estado.tipoCambio))}
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => eliminar(p.id)}
                        aria-label={`Eliminar partida ${p.concepto}`}
                        className="p-1.5 rounded-lg text-[rgba(80,108,92,0.5)] hover:text-[#A33] hover:bg-[rgba(200,80,80,0.08)] transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[rgba(90,190,145,0.25)]">
                  <td colSpan={5} className="pt-3 text-right font-bold text-[#13301F]">Total del periodo</td>
                  <td className="pt-3 text-right font-black text-[#13301F] whitespace-nowrap">
                    {formatoPEN(resumen.totalPEN)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
