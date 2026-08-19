'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileSpreadsheet, Eye, X, CheckCircle2, RefreshCw, ShieldCheck, Database, Search, Trash2, Edit2, Play, Square,
  RotateCcw, AlertTriangle, Loader2, Sigma,
} from 'lucide-react'
import DashboardShell from '@/shared/components/layout/DashboardShell'
import Dropzone from '@/modules/data-loader/infrastructure/ui/Dropzone'
import Link from 'next/link'
import {
  useFuentesDatos, FUENTES_DEMO_INICIALES, fuentesInactivas, ETIQUETA_FUENTE,
  type FuenteDatos,
} from '@/modules/data-loader/domain/datosPrueba'
import { CATALOGO_FACTORES, ghgClassify, resumirLineas } from '@/modules/carbon-accounting/domain/ghgClassify'
import {
  parsearArchivo, validarArchivo, huellaArchivo, ACCEPT_ARCHIVOS, MAX_ARCHIVOS_LOTE, TAMANO_MAX_MB,
} from '@/modules/data-loader/infrastructure/parsers/parseArchivo'
import { consolidar } from '@/modules/carbon-accounting/domain/huellaConsolidada'
import { MECANISMO_META, type Mecanismo } from '@/modules/carbon-accounting/domain/emissionFactors'

type Fuente = FuenteDatos

// Solo guardamos un tramo del detalle línea a línea en localStorage: el
// resumen ya se calculó sobre el archivo COMPLETO, y meter 20.000 filas en
// el storage del navegador lo revienta sin aportar nada a la revisión.
const MAX_LINEAS_GUARDADAS = 400

const AREA_POR_MECANISMO: Partial<Record<Mecanismo, string>> = {
  riego: 'Riego',
  maquinaria: 'Producción',
  n2oCampo: 'Producción',
  fertilizante: 'Producción',
  packing: 'Finanzas',
  empaque: 'Logística',
  flete: 'Logística',
}

function areaDeResumen(porMecanismo: Partial<Record<Mecanismo, number>>): string {
  const top = (Object.entries(porMecanismo) as [Mecanismo, number][])
    .sort((a, b) => b[1] - a[1])[0]
  return (top && AREA_POR_MECANISMO[top[0]]) || 'Producción'
}

const hoy = () => new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })

type EstadoCola = 'pendiente' | 'procesando' | 'ok' | 'error'
type ItemCola = {
  id: string
  file: File
  nombre: string
  pesoMB: string
  estado: EstadoCola
  motivo?: string
  /** Resultado, para poder decir "sumó X tCO₂e" sin volver a buscarlo. */
  emisionTon?: number
  reemplazo?: boolean
}

const ESTADO_COLA: Record<EstadoCola, { texto: string; clase: string }> = {
  pendiente: { texto: 'Pendiente', clase: 'bg-[rgba(80,108,92,0.08)] text-[rgba(80,108,92,0.8)] border-[rgba(80,108,92,0.15)]' },
  procesando: { texto: 'Procesando', clase: 'bg-[rgba(61,127,176,0.1)] text-[#3D7FB0] border-[rgba(61,127,176,0.25)]' },
  ok: { texto: 'Listo', clase: 'bg-[rgba(90,190,145,0.14)] text-[#137C53] border-[rgba(90,190,145,0.3)]' },
  error: { texto: 'Error', clase: 'bg-red-50 text-red-600 border-red-200' },
}

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

  const [cola, setCola] = useState<ItemCola[]>([])
  const [procesandoLote, setProcesandoLote] = useState(false)
  const [porBorrar, setPorBorrar] = useState<Fuente | null>(null)
  const [renombrando, setRenombrando] = useState<{ id: string; nombre: string } | null>(null)
  const [confirmarBorrarTodo, setConfirmarBorrarTodo] = useState(false)

  const huella = useMemo(() => consolidar(fuentesState), [fuentesState])

  const guardarNombre = () => {
    if (!renombrando) return
    const nombre = renombrando.nombre.trim()
    if (nombre) setFuentesState(prev => prev.map(f => f.id === renombrando.id ? { ...f, archivo: nombre } : f))
    setRenombrando(null)
  }

  // El progreso avanza de verdad: antes se quedaba clavado en 45% para siempre,
  // que era justo el reclamo del feedback.
  const hayProcesando = fuentesState.some(f => f.estado === 'procesando' && f.isDemo)
  useEffect(() => {
    if (!hayProcesando) return
    const t = setInterval(() => {
      setFuentesState(prev => prev.map(f => {
        if (f.estado !== 'procesando' || !f.isDemo) return f
        const siguiente = (f.progress ?? 0) + Math.random() * 8 + 4
        return siguiente >= 100
          ? { ...f, estado: 'sincronizado', progress: 100, actualizado: hoy() }
          : { ...f, progress: Math.round(siguiente) }
      }))
    }, 900)
    return () => clearInterval(t)
  }, [hayProcesando])

  const handleDelete = (id: string) => {
    setFuentesState(prev => prev.filter(f => f.id !== id))
    setPorBorrar(null)
  }
  const handleDeleteAll = () => {
    setFuentesState([])
    setConfirmarBorrarTodo(false)
  }
  const handleCancelProcess = (id: string) => setFuentesState(prev => prev.map(f => f.id === id ? { ...f, estado: 'error', motivoError: 'Procesamiento cancelado por el usuario' } : f))
  const handleRetryProcess = (id: string) => setFuentesState(prev => prev.map(f => f.id === id ? { ...f, estado: 'procesando', progress: 0, motivoError: undefined } : f))

  // ============================================================
  // Cola de subida (arrastrar y soltar / selección múltiple)
  // ============================================================
  const agregarACola = useCallback((archivos: File[]) => {
    setCola(prev => {
      const espacio = Math.max(0, MAX_ARCHIVOS_LOTE - prev.length)
      const nuevos = archivos.slice(0, espacio).map((file, i): ItemCola => {
        const invalido = validarArchivo(file)
        return {
          id: `cola-${Date.now()}-${i}-${file.name}`,
          file,
          nombre: file.name,
          pesoMB: (file.size / 1024 / 1024).toFixed(2),
          estado: invalido ? 'error' : 'pendiente',
          motivo: invalido ?? undefined,
        }
      })
      const excedente = archivos.length - nuevos.length
      if (excedente > 0) {
        nuevos.push({
          id: `cola-limite-${Date.now()}`,
          file: archivos[archivos.length - 1],
          nombre: `${excedente} archivo(s) no agregados`,
          pesoMB: '0.00',
          estado: 'error',
          motivo: `El lote admite hasta ${MAX_ARCHIVOS_LOTE} archivos a la vez`,
        })
      }
      return [...prev, ...nuevos]
    })
  }, [])

  const quitarDeCola = (id: string) => setCola(prev => prev.filter(c => c.id !== id))

  const procesarUno = useCallback(async (item: ItemCola) => {
    const marca = huellaArchivo(item.file)
    try {
      const parseado = await parsearArchivo(item.file)
      const lineas = ghgClassify(parseado.lineas)
      const resumen = resumirLineas(lineas) // sobre el archivo completo
      const area = areaDeResumen(resumen.porMecanismo)

      let reemplazo = false
      setFuentesState(prev => {
        // Idempotencia: mismo archivo (huella) o mismo nombre → actualiza,
        // no duplica. Volver a subir el cierre de mayo corrige mayo.
        const existente = prev.find(f => !f.isDemo && (f.huella === marca || f.archivo === item.file.name))
        reemplazo = !!existente
        const fuente: FuenteDatos = {
          id: existente?.id ?? `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          area,
          archivo: item.file.name,
          actualizado: hoy(),
          estado: 'sincronizado',
          origen: 'configuracion',
          huella: marca,
          hojas: parseado.hojas,
          lineas: lineas.slice(0, MAX_LINEAS_GUARDADAS),
          resumen,
          preview: { columnas: parseado.columnas, filas: parseado.filasPreview },
        }
        return existente ? prev.map(f => (f.id === existente.id ? fuente : f)) : [...prev, fuente]
      })

      setCola(prev => prev.map(c => c.id === item.id
        ? { ...c, estado: 'ok', emisionTon: resumen.emisionTon, reemplazo, motivo: undefined }
        : c))
    } catch (e) {
      const motivo = e instanceof Error ? e.message : 'No se pudo leer el archivo'
      // Degradación honesta: el archivo entra a la tabla en estado error con
      // su motivo, y no aporta ni un gramo al total (RNF-7.5).
      setFuentesState(prev => [...prev, {
        id: `user-err-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        area: 'Sin clasificar',
        archivo: item.file.name,
        actualizado: hoy(),
        estado: 'error',
        origen: 'configuracion',
        huella: marca,
        motivoError: motivo,
        preview: { columnas: [], filas: [] },
      }])
      setCola(prev => prev.map(c => (c.id === item.id ? { ...c, estado: 'error', motivo } : c)))
    }
  }, [setFuentesState])

  const confirmarCola = async () => {
    setProcesandoLote(true)
    const pendientes = cola.filter(c => c.estado === 'pendiente')
    for (const item of pendientes) {
      setCola(prev => prev.map(c => (c.id === item.id ? { ...c, estado: 'procesando' } : c)))
      // Un archivo con error no aborta el resto del lote (RNF-8.3).
      await procesarUno(item)
    }
    setProcesandoLote(false)
  }

  const pendientes = cola.filter(c => c.estado === 'pendiente').length

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
          <div className="flex items-center gap-2 flex-wrap">
            {inactivas.length > 0 && (
              <button
                onClick={() => setFuentesState(prev => [
                  ...FUENTES_DEMO_INICIALES,
                  ...prev.filter(f => !f.isDemo),
                ])}
                title="Vuelve a vincular las 4 fuentes demo originales"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[rgba(90,190,145,0.3)] text-[#137C53] text-xs font-semibold hover:bg-[rgba(90,190,145,0.08)] active:scale-95 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Restaurar datos demo
              </button>
            )}
            {fuentesState.length > 0 && (
              <button
                onClick={() => setConfirmarBorrarTodo(true)}
                title="Elimina todas las fuentes de datos vinculadas (demo y tuyas)"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 active:scale-95 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" /> Eliminar todos los datos
              </button>
            )}
          </div>
        </div>

        {/* --- Zona de carga múltiple --- */}
        <Dropzone
          onArchivos={agregarACola}
          accept={ACCEPT_ARCHIVOS}
          disabled={procesandoLote}
          ayuda={`Varios a la vez · .xlsx, .csv y .xml (SUNAT UBL 2.1) · hasta ${MAX_ARCHIVOS_LOTE} archivos de ${TAMANO_MAX_MB} MB`}
        />

        <AnimatePresence>
          {cola.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mt-4 rounded-2xl border border-[rgba(90,190,145,0.18)] overflow-hidden"
            >
              <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-[rgba(244,246,242,0.8)] border-b border-[rgba(90,190,145,0.12)]">
                <span className="text-xs font-bold text-[#13301F]">Cola de subida · {cola.length} archivo(s)</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCola([])}
                    disabled={procesandoLote}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[rgba(80,108,92,0.75)] hover:bg-[rgba(90,190,145,0.1)] disabled:opacity-40 transition-colors"
                  >
                    Vaciar
                  </button>
                  <button
                    onClick={confirmarCola}
                    disabled={procesandoLote || pendientes === 0}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#13301F] text-white text-xs font-semibold hover:bg-[#0E2418] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    {procesandoLote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    {procesandoLote ? 'Procesando…' : `Procesar ${pendientes} archivo(s)`}
                  </button>
                </div>
              </div>
              <ul className="divide-y divide-[rgba(90,190,145,0.08)]">
                {cola.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                    <FileSpreadsheet className="w-4 h-4 text-[#137C53] flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[#13301F] truncate">{c.nombre}</p>
                      <p className="text-[11px] text-[rgba(80,108,92,0.6)]">
                        {c.motivo
                          ? c.motivo
                          : c.estado === 'ok'
                            ? `${c.reemplazo ? 'Actualizó la fuente existente' : 'Vinculado'} · +${c.emisionTon?.toLocaleString('es-PE')} tCO₂e`
                            : `${c.pesoMB} MB`}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${ESTADO_COLA[c.estado].clase}`}>
                      {ESTADO_COLA[c.estado].texto}
                    </span>
                    {c.estado !== 'procesando' && (
                      <button
                        onClick={() => quitarDeCola(c.id)}
                        aria-label={`Quitar ${c.nombre} de la cola`}
                        className="p-1 rounded-lg text-[rgba(80,108,92,0.5)] hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        {inactivas.length > 0 && (
          <div className="mt-5 flex items-start gap-2.5 rounded-2xl bg-amber-50 border border-amber-200 p-3.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>Sin {inactivas.map((id) => ETIQUETA_FUENTE[id]).join(' y ')}</strong>, el cálculo de huella ya
              no incluye esos datos: revisa el Scope correspondiente en{' '}
              <Link href="/analisis/?tab=huella" className="underline font-semibold hover:text-amber-900">Análisis</Link>{' '}
              — va a haber bajado.
            </p>
          </div>
        )}

        {huella.archivosUsuario.length > 0 && (
          <div className="mt-5 flex items-start gap-2.5 rounded-2xl bg-[rgba(90,190,145,0.07)] border border-[rgba(90,190,145,0.2)] p-3.5">
            <Sigma className="w-4 h-4 text-[#137C53] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-[rgba(80,108,92,0.85)] leading-relaxed">
              <strong className="text-[#13301F]">{huella.archivosUsuario.length} archivo(s) tuyos</strong> aportan{' '}
              <strong className="text-[#13301F]">{huella.aporteUsuarioTon.toLocaleString('es-PE')} tCO₂e</strong> al
              inventario. El total del{' '}
              <Link href="/dashboard/" className="underline font-semibold hover:text-[#137C53]">Dashboard</Link>{' '}
              ya los incluye.
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 my-5 items-start sm:items-center justify-between">
          <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(80,108,92,0.5)]" />
              <input type="text" placeholder="Buscar archivo..." aria-label="Buscar archivo" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-[rgba(90,190,145,0.04)] border border-[rgba(90,190,145,0.15)] rounded-xl text-sm focus:outline-none focus:border-[#137C53]" />
            </div>
            <select aria-label="Filtrar por área" value={filterArea} onChange={(e) => setFilterArea(e.target.value)} className="px-3 py-2 bg-[rgba(90,190,145,0.04)] border border-[rgba(90,190,145,0.15)] rounded-xl text-sm focus:outline-none focus:border-[#137C53]">
              <option value="Todas">Todas las áreas</option><option value="Riego">Riego</option><option value="Logística">Logística</option><option value="Finanzas">Finanzas</option><option value="Producción">Producción</option><option value="Sin clasificar">Sin clasificar</option>
            </select>
            <select aria-label="Filtrar por estado" value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} className="px-3 py-2 bg-[rgba(90,190,145,0.04)] border border-[rgba(90,190,145,0.15)] rounded-xl text-sm focus:outline-none focus:border-[#137C53]">
              <option value="Todos">Todos los estados</option><option value="sincronizado">Sincronizado</option><option value="procesando">En proceso</option><option value="error">Error</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-[rgba(80,108,92,0.5)] border-b border-[rgba(90,190,145,0.12)]">
                <th className="py-2.5 pr-3 font-semibold">Área</th>
                <th className="py-2.5 pr-3 font-semibold">Archivo</th>
                <th className="py-2.5 pr-3 font-semibold text-right">Aporte</th>
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
                        {f.origen === 'upload' && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[rgba(61,127,176,0.1)] text-[#3D7FB0] uppercase border border-[rgba(61,127,176,0.25)]">Desde Analizar Datos</span>}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 pr-3 text-right whitespace-nowrap">
                    {f.resumen ? (
                      <span className="font-bold text-[#137C53]">{f.resumen.emisionTon.toLocaleString('es-PE')} <span className="text-[10px] font-semibold text-[rgba(80,108,92,0.5)]">tCO₂e</span></span>
                    ) : (
                      <span className="text-[11px] text-[rgba(80,108,92,0.45)]">{f.isDemo ? 'motor de campaña' : 'sin dato'}</span>
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
                      <span title={f.motivoError} className="inline-flex flex-col gap-0.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-600 border border-red-200 w-fit"><X className="w-3.5 h-3.5" /> Error</span>
                        {f.motivoError && <span className="text-[10px] text-red-500 leading-tight max-w-[190px]">{f.motivoError}</span>}
                      </span>
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
              {filteredFuentes.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-sm text-[rgba(80,108,92,0.6)]">No hay fuentes vinculadas que coincidan. Arrastra tus archivos arriba para empezar.</td></tr>
              )}
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
        <p className="text-xs text-[rgba(80,108,92,0.6)] mb-5">
          Fuentes oficiales aplicadas en el cálculo, con su versión. Esta misma tabla se imprime en el informe técnico
          descargable — un auditor puede rastrear cada número hasta su factor.
        </p>
        <div className="overflow-x-auto rounded-2xl border border-[rgba(90,190,145,0.12)]">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="bg-[rgba(244,246,242,0.9)] text-left text-[11px] uppercase tracking-wide text-[rgba(80,108,92,0.55)]">
                <th className="px-4 py-2.5 font-semibold">Factor</th>
                <th className="px-4 py-2.5 font-semibold text-right">Valor</th>
                <th className="px-4 py-2.5 font-semibold">Unidad</th>
                <th className="px-4 py-2.5 font-semibold">Fuente</th>
                <th className="px-4 py-2.5 font-semibold">Versión</th>
                <th className="px-4 py-2.5 font-semibold">Alcance / mecanismo</th>
              </tr>
            </thead>
            <tbody>
              {CATALOGO_FACTORES.map((f) => (
                <tr key={f.clave} className="border-t border-[rgba(90,190,145,0.08)]">
                  <td className="px-4 py-2.5 font-semibold text-[#13301F]">{f.label}</td>
                  <td className="px-4 py-2.5 text-right font-black text-[#137C53]">{f.valor}</td>
                  <td className="px-4 py-2.5 text-[rgba(80,108,92,0.75)]">{f.unidad}</td>
                  <td className="px-4 py-2.5 text-[rgba(80,108,92,0.75)]">{f.fuente}</td>
                  <td className="px-4 py-2.5 text-[rgba(80,108,92,0.75)] whitespace-nowrap">{f.version}</td>
                  <td className="px-4 py-2.5 text-[rgba(80,108,92,0.75)] whitespace-nowrap">Scope {f.scope} · {MECANISMO_META[f.mecanismo].label}</td>
                </tr>
              ))}
            </tbody>
          </table>
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

      {/* ===== Modal Confirmar borrado total ===== */}
      <AnimatePresence>
        {confirmarBorrarTodo && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setConfirmarBorrarTodo(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
            >
              <h3 className="text-lg font-black text-[#13301F] mb-2">¿Eliminar todos los datos?</h3>
              <p className="text-sm text-[rgba(80,108,92,0.75)] mb-5">
                Se quitarán <strong className="text-[#13301F]">las {fuentesState.length} fuente(s) vinculadas</strong> (demo
                y propias). El cálculo de huella, el Dashboard, el Plan de reducción y Kapi quedarán en cero hasta que
                vuelvas a vincular datos. Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setConfirmarBorrarTodo(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-[rgba(80,108,92,0.8)] hover:bg-[rgba(90,190,145,0.08)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteAll}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  Eliminar todo
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
                  <p className="text-xs text-[rgba(80,108,92,0.6)]">
                    Área {preview.area} · vista previa de las filas leídas
                    {preview.hojas?.length ? ` · hojas: ${preview.hojas.join(', ')}` : ''}
                  </p>
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
                {preview.resumen && (
                  <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-xl bg-[rgba(244,246,242,0.8)] border border-[rgba(90,190,145,0.12)] px-3 py-2.5 mb-3 text-xs">
                    <span className="text-[rgba(80,108,92,0.8)]">Líneas leídas: <strong className="text-[#13301F]">{preview.resumen.leidas}</strong></span>
                    <span className="text-[rgba(80,108,92,0.8)]">Ignoradas: <strong className="text-[#13301F]">{preview.resumen.ignoradas}</strong></span>
                    <span className="text-[rgba(80,108,92,0.8)]">Emisión: <strong className="text-[#137C53]">{preview.resumen.emisionTon.toLocaleString('es-PE')} tCO₂e</strong></span>
                    <span className="text-[rgba(80,108,92,0.8)]">S1 {preview.resumen.scopes.s1} · S2 {preview.resumen.scopes.s2} · S3 {preview.resumen.scopes.s3}</span>
                  </div>
                )}
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
                <p className="text-[11px] text-[rgba(80,108,92,0.45)] mt-2">{(preview?.preview?.filas || []).length} filas mostradas · {(preview?.preview?.columnas || []).length} columnas detectadas</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardShell>
  )
}
