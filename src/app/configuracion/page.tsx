'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileSpreadsheet, Plus, Eye, X, CheckCircle2, RefreshCw, ShieldCheck, Database, Search, Trash2, Edit2, Play, Square,
  RotateCcw, AlertTriangle,
} from 'lucide-react'
import DashboardShell from '@/components/layout/DashboardShell'
import { FE } from '@/lib/emissionFactors'
import {
  useFuentesDatos, FUENTES_DEMO_INICIALES, fuentesInactivas, ETIQUETA_FUENTE,
  type FuenteDatos,
} from '@/lib/datosPrueba'

type Fuente = FuenteDatos

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

  // Persistido en localStorage: borrar aquí ahora se queda borrado al salir
  // y volver, y el motor de cálculo (Análisis) recalcula la huella real
  // según qué fuentes siguen vinculadas.
  const [fuentesState, setFuentesState] = useFuentesDatos()
  const inactivas = fuentesInactivas(fuentesState)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterArea, setFilterArea] = useState('Todas')
  const [filterEstado, setFilterEstado] = useState('Todos')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [porBorrar, setPorBorrar] = useState<Fuente | null>(null)
  const [renombrando, setRenombrando] = useState<{ id: string; nombre: string } | null>(null)

  const guardarNombre = () => {
    if (!renombrando) return
    const nombre = renombrando.nombre.trim()
    if (nombre) setFuentesState(prev => prev.map(f => f.id === renombrando.id ? { ...f, archivo: nombre } : f))
    setRenombrando(null)
  }

  // El progreso avanza de verdad: antes se quedaba clavado en 45% para siempre,
  // que era justo el reclamo del feedback.
  const hayProcesando = fuentesState.some(f => f.estado === 'procesando')
  useEffect(() => {
    if (!hayProcesando) return
    const t = setInterval(() => {
      setFuentesState(prev => prev.map(f => {
        if (f.estado !== 'procesando') return f
        const siguiente = (f.progress ?? 0) + Math.random() * 8 + 4
        return siguiente >= 100
          ? { ...f, estado: 'sincronizado', progress: 100, actualizado: new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) }
          : { ...f, progress: Math.round(siguiente) }
      }))
    }, 900)
    return () => clearInterval(t)
  }, [hayProcesando])

  const handleDelete = (id: string) => {
    setFuentesState(prev => prev.filter(f => f.id !== id))
    setPorBorrar(null)
  }
  const handleCancelProcess = (id: string) => setFuentesState(prev => prev.map(f => f.id === id ? { ...f, estado: 'error' } : f))
  const handleRetryProcess = (id: string) => setFuentesState(prev => prev.map(f => f.id === id ? { ...f, estado: 'procesando', progress: 0 } : f))

  const handleVincularArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    setFuentesState(prev => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        area: 'Producción',
        archivo: archivo.name,
        actualizado: 'En proceso',
        estado: 'procesando',
        progress: 0,
        preview: { columnas: [], filas: [] },
      },
    ])
    e.target.value = ''
  }

  const filteredFuentes = fuentesState.filter(f => {
    const matchesSearch = f.archivo.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesArea = filterArea === 'Todas' || f.area === filterArea
    const matchesEstado = filterEstado === 'Todos' || f.estado === filterEstado
    return matchesSearch && matchesArea && matchesEstado
  })


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
          <div className="flex items-center gap-2">
            {inactivas.length > 0 && (
              <button
                onClick={() => setFuentesState(FUENTES_DEMO_INICIALES)}
                title="Vuelve a vincular las 4 fuentes demo originales"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[rgba(90,190,145,0.3)] text-[#137C53] text-xs font-semibold hover:bg-[rgba(90,190,145,0.08)] active:scale-95 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Restaurar datos demo
              </button>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#13301F] text-white text-xs font-semibold hover:bg-[#0E2418] active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" /> Vincular nuevo archivo
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleVincularArchivo}
            className="hidden"
          />
        </div>

        {inactivas.length > 0 && (
          <div className="mb-5 flex items-start gap-2.5 rounded-2xl bg-amber-50 border border-amber-200 p-3.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>Sin {inactivas.map((id) => ETIQUETA_FUENTE[id]).join(' y ')}</strong>, el cálculo de huella ya
              no incluye esos datos: revisa el Scope correspondiente en{' '}
              <a href="/analisis/?tab=huella" className="underline font-semibold hover:text-amber-900">Análisis</a>{' '}
              — va a haber bajado.
            </p>
          </div>
        )}


        <div className="flex flex-col sm:flex-row gap-3 mb-5 items-start sm:items-center justify-between">
          <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(80,108,92,0.5)]" />
              <input type="text" placeholder="Buscar archivo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-[rgba(90,190,145,0.04)] border border-[rgba(90,190,145,0.15)] rounded-xl text-sm focus:outline-none focus:border-[#137C53]" />
            </div>
            <select value={filterArea} onChange={(e) => setFilterArea(e.target.value)} className="px-3 py-2 bg-[rgba(90,190,145,0.04)] border border-[rgba(90,190,145,0.15)] rounded-xl text-sm focus:outline-none focus:border-[#137C53]">
              <option value="Todas">Todas las áreas</option><option value="Riego">Riego</option><option value="Logística">Logística</option><option value="Finanzas">Finanzas</option><option value="Producción">Producción</option>
            </select>
            <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} className="px-3 py-2 bg-[rgba(90,190,145,0.04)] border border-[rgba(90,190,145,0.15)] rounded-xl text-sm focus:outline-none focus:border-[#137C53]">
              <option value="Todos">Todos los estados</option><option value="sincronizado">Sincronizado</option><option value="procesando">En proceso</option><option value="error">Error</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-[rgba(80,108,92,0.5)] border-b border-[rgba(90,190,145,0.12)]">
                <th className="py-2.5 pr-3 font-semibold">Área</th>
                <th className="py-2.5 pr-3 font-semibold">Archivo</th>
                <th className="py-2.5 pr-3 font-semibold">Última actualización</th>
                <th className="py-2.5 pr-3 font-semibold">Estado</th>
                <th className="py-2.5 text-right font-semibold w-32">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredFuentes.map((f) => (
                <tr key={f.id} className="border-b border-[rgba(90,190,145,0.07)] last:border-0">
                  <td className="py-3.5 pr-3 font-bold text-[#13301F]">{f.area}</td>
                  <td className="py-3.5 pr-3">
                    {renombrando?.id === f.id ? (
                      <input
                        type="text"
                        value={renombrando.nombre}
                        onChange={(e) => setRenombrando({ ...renombrando, nombre: e.target.value })}
                        onKeyDown={(e) => { if (e.key === 'Enter') guardarNombre(); if (e.key === 'Escape') setRenombrando(null) }}
                        onBlur={guardarNombre}
                        autoFocus
                        aria-label="Nuevo nombre del archivo"
                        className="w-full max-w-xs text-sm px-2 py-1 bg-white border border-[rgba(90,190,145,0.4)] rounded-lg outline-none focus:border-[#137C53]"
                      />
                    ) : (
                      <span className="inline-flex items-center gap-2 text-[rgba(80,108,92,0.85)]">
                        <FileSpreadsheet className="w-4 h-4 text-[#137C53]" />
                        <span className="font-medium">{f.archivo}</span>
                        {f.isDemo && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#13301F]/5 text-[#13301F]/60 uppercase border border-[#13301F]/10">Demo</span>}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 pr-3 text-[rgba(80,108,92,0.7)]">{f.actualizado}</td>
                  <td className="py-3.5 pr-3 w-48">
                    {f.estado === 'sincronizado' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[rgba(90,190,145,0.12)] text-[#137C53] border border-[rgba(90,190,145,0.25)]"><CheckCircle2 className="w-3.5 h-3.5" /> Sincronizado</span>
                    ) : f.estado === 'procesando' ? (
                      <div className="flex flex-col gap-1 w-full max-w-[140px]">
                        <span className="inline-flex items-center justify-between gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[rgba(61,127,176,0.1)] text-[#3D7FB0] border border-[rgba(61,127,176,0.22)]"><span className="flex items-center gap-1.5"><RefreshCw className="w-3 h-3 animate-spin" /> {f.progress}%</span><span className="text-[9px] font-normal opacity-80">{Math.max(1, Math.ceil(((100 - (f.progress ?? 0)) / 8) * 0.9))} s</span></span>
                        <div className="w-full bg-[rgba(61,127,176,0.15)] rounded-full h-1 overflow-hidden"><div className="bg-[#3D7FB0] h-1 rounded-full" style={{ width: `${f.progress}%` }}></div></div>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-600 border border-red-200"><X className="w-3.5 h-3.5" /> Error</span>
                    )}
                  </td>
                  <td className="py-3.5 text-right flex items-center justify-end gap-2">
                    {f.estado === 'procesando' ? (
                      <button onClick={() => handleCancelProcess(f.id)} title="Cancelar procesamiento" aria-label={`Cancelar procesamiento de ${f.archivo}`} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"><Square className="w-4 h-4" /></button>
                    ) : f.estado === 'error' ? (
                       <button onClick={() => handleRetryProcess(f.id)} title="Reintentar" aria-label={`Reintentar ${f.archivo}`} className="p-1.5 rounded-lg text-[#3D7FB0] hover:bg-blue-50 transition-colors"><Play className="w-4 h-4" /></button>
                    ) : (
                      <button onClick={() => setPreview(f)} title="Previsualizar" aria-label={`Previsualizar ${f.archivo}`} className="p-1.5 rounded-lg text-[#137C53] hover:bg-[rgba(90,190,145,0.1)] transition-colors"><Eye className="w-4 h-4" /></button>
                    )}
                    <button onClick={() => setRenombrando({ id: f.id, nombre: f.archivo })} title="Renombrar" aria-label={`Renombrar ${f.archivo}`} className="p-1.5 rounded-lg text-[rgba(80,108,92,0.5)] hover:bg-[rgba(90,190,145,0.1)] transition-colors"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => setPorBorrar(f)} title="Eliminar" aria-label={`Eliminar ${f.archivo}`} className="p-1.5 rounded-lg text-[rgba(80,108,92,0.5)] hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
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

      {/* ===== Modal Confirmar borrado ===== */}
      <AnimatePresence>
        {porBorrar && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setPorBorrar(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
            >
              <h3 className="text-lg font-black text-[#13301F] mb-2">¿Eliminar este archivo?</h3>
              <p className="text-sm text-[rgba(80,108,92,0.75)] mb-5">
                Se quitará <strong className="text-[#13301F]">{porBorrar.archivo}</strong> de las fuentes de datos y
                dejará de usarse en el cálculo. Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setPorBorrar(null)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-[rgba(80,108,92,0.8)] hover:bg-[rgba(90,190,145,0.08)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDelete(porBorrar.id)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                  <p className="text-xs font-semibold text-[#137C53]">AgroFinance no modifica tus archivos — solo los lee. El archivo está en formato de solo lectura.</p>
                </div>
              </div>

              <div className="px-5 sm:px-6 pb-5 max-h-[60vh] overflow-auto">
                <div className="rounded-xl border border-[rgba(90,190,145,0.12)] overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[rgba(244,246,242,0.95)] text-[rgba(80,108,92,0.55)] text-left uppercase tracking-wide text-[10px] sticky top-0">
                        {(preview?.preview?.columnas || []).map((c) => <th key={c} className="px-3 py-2 font-semibold whitespace-nowrap">{c}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {(preview?.preview?.filas || []).map((fila, i) => (
                        <tr key={i} className="border-t border-[rgba(90,190,145,0.07)]">
                          {fila.map((cell, j) => (
                            <td key={j} className={`px-3 py-2 whitespace-nowrap ${j === 0 ? 'font-semibold text-[#13301F]' : 'text-[rgba(80,108,92,0.8)]'}`}>{typeof cell === 'number' ? cell.toLocaleString('es-PE') : cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-[rgba(80,108,92,0.45)] mt-2">{(preview?.preview?.filas || []).length} filas leídas · {(preview?.preview?.columnas || []).length} columnas detectadas</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardShell>
  )
}
