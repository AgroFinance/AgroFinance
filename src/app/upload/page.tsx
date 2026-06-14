'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import {
  Upload, FileSpreadsheet, CheckCircle2,
  Zap, AlertCircle, X, Sparkles, Star, TrendingDown,
  Globe2, ListChecks, Lock, Database, Calculator,
  GitBranch, ClipboardCheck, Award
} from 'lucide-react'
import Navigation from '@/components/layout/Navigation'
import CapybaraBot from '@/components/mascot/CapybaraBot'
import Cronograma from '@/components/Cronograma'
import { type Certificacion } from '@/lib/certification'
import { certificarCooperativa, cooperativa, campanias } from '@/lib/pilotEngine'
import { saveAnalysisToFirestore, clearAnalysesFromFirestore } from '@/lib/firebaseService'

type Stage = 'idle' | 'uploading' | 'scanning' | 'analyzing' | 'complete' | 'error'

const scanMessages = [
  'Leyendo estructura de datos...',
  'Detectando emisiones Scope 1...',
  'Calculando Scope 2 por factor de red...',
  'Mapeando categorías Scope 3...',
  'Validando factores de emisión GHG Protocol...',
  'Aplicando metodología HC Perú...',
  'Generando análisis ESG automático...',
  'Calculando huella de carbono total...',
  'Preparando reporte preliminar...',
]

const acceptedTypes = {
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'text/csv': ['.csv'],
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
}

export default function UploadPage() {
  const [stage, setStage] = useState<Stage>('idle')
  const [files, setFiles] = useState<File[]>([])
  const [progress, setProgress] = useState(0)
  const [scanIndex, setScanIndex] = useState(0)
  const [clasificacion, setClasificacion] = useState<Certificacion | null>(null)
  const [analisisId, setAnalisisId] = useState('')

  const onDrop = useCallback((accepted: File[]) => {
    if (!accepted.length) return
    setFiles(accepted)
    startUpload(accepted)
  }, [])

  const handleSimulateDataUpload = () => {
    const simulatedFiles = [
      new File([''], 'Control_de_Campo_.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      new File([''], 'Control_de_Campo_Masivo_Q1_Q4.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      new File([''], 'mype_campos_fijos.csv', { type: 'text/csv' }),
      new File([''], 'mype_envios_variables.csv', { type: 'text/csv' }),
      new File([''], 'mype_packing_fijos.csv', { type: 'text/csv' }),
      new File([''], 'Reporte_Mensual_Packing_y_Mermas.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
      new File([''], 'Reporte_Mensual_Packing_y_Mermas.pdf', { type: 'application/pdf' }),
      new File([''], 'Tracking_Aduanas_Exportacion.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      new File([''], 'Tracking_Aduanas_Masivo.csv', { type: 'text/csv' }),
      new File([''], 'Control_de_Campo_ - Hoja 10.pdf', { type: 'application/pdf' })
    ]
    setFiles(simulatedFiles)
    startUpload(simulatedFiles)
  }

  const startUpload = (accepted: File[]) => {
    setStage('uploading')
    setProgress(0)

    // Simulate upload progress
    let p = 0
    const uploadInterval = setInterval(() => {
      p += Math.random() * 15 + 5
      if (p >= 100) {
        clearInterval(uploadInterval)
        setProgress(100)
        setTimeout(() => startScanning(), 300)
      } else {
        setProgress(Math.min(p, 99))
      }
    }, 150)
  }

  const startScanning = () => {
    setStage('scanning')
    setProgress(0)
    let idx = 0

    const scanInterval = setInterval(() => {
      idx++
      setScanIndex(idx % scanMessages.length)
      setProgress(Math.min((idx / scanMessages.length) * 100, 95))

      if (idx >= scanMessages.length) {
        clearInterval(scanInterval)
        setProgress(100)
        // Piloto real: procesa la data de las mypes
        const resClasificacion = certificarCooperativa()
        setClasificacion(resClasificacion)
        const newAnalisisId = String(Date.now())
        setAnalisisId(newAnalisisId)
        
        // Guardar en Firestore de forma real
        saveAnalysisToFirestore({
          id: newAnalisisId,
          timestamp: new Date().toISOString(),
          score: resClasificacion.score,
          nivel: resClasificacion.nivel,
          huellaTotalTon: cooperativa.huellaTotalTon,
          kilosExportados: cooperativa.kilosExportados,
          scopes: cooperativa.scopes
        })

        // Activamos las gráficas globales
        localStorage.setItem('agrofinance_has_data', 'true')
        setTimeout(() => setStage('complete'), 600)
      }
    }, 700)
  }

  const reset = () => {
    setStage('idle')
    setFiles([])
    setProgress(0)
    setScanIndex(0)
    setClasificacion(null)
    setAnalisisId('')
    localStorage.removeItem('agrofinance_has_data')
    clearAnalysesFromFirestore()
  }


  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: acceptedTypes,
    maxFiles: 5,
    maxSize: 50 * 1024 * 1024,
  })

  return (
    <div className="min-h-screen bg-[#FBF4D6]">
      <Navigation />

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 rounded-full bg-gradient-radial from-[rgba(90,190,145,0.06)] to-transparent blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full bg-gradient-radial from-[rgba(61,127,176,0.05)] to-transparent blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="badge badge-emerald mb-5 inline-flex">
            <Zap className="w-3 h-3" />
            Análisis con IA · Procesamiento instantáneo
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#13301F] tracking-tight mb-3">
            Analiza tus datos de{' '}
            <span className="gradient-text">emisiones.</span>
          </h1>
          <p className="text-[rgba(80,108,92,0.6)] text-base max-w-lg mx-auto">
            Sube tus archivos operativos y nuestra IA calculará automáticamente tu huella de carbono Scope 1, 2 y 3.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* IDLE — Drop Zone */}
          {stage === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
            >
              <div
                {...getRootProps()}
                className={`relative rounded-3xl border-2 border-dashed p-16 text-center cursor-pointer transition-all duration-300 overflow-hidden ${
                  isDragActive && !isDragReject
                    ? 'border-[#137C53] bg-[rgba(90,190,145,0.06)] scale-[1.01]'
                    : isDragReject
                    ? 'border-red-500 bg-[rgba(239,68,68,0.05)]'
                    : 'border-[rgba(90,190,145,0.2)] bg-[rgba(255,255,255,0.5)] hover:border-[rgba(90,190,145,0.4)] hover:bg-[rgba(255,255,255,0.7)]'
                }`}
              >
                <input {...getInputProps()} />

                {/* Animated background grid when dragging */}
                <AnimatePresence>
                  {isDragActive && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-grid opacity-30"
                    />
                  )}
                </AnimatePresence>

                {/* Floating particles */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-1 h-1 rounded-full bg-[#137C53]"
                      style={{
                        left: `${10 + i * 11}%`,
                        top: `${20 + (i % 3) * 25}%`,
                      }}
                      animate={{
                        y: [-10, 10, -10],
                        opacity: [0.2, 0.7, 0.2],
                      }}
                      transition={{
                        duration: 3 + i * 0.3,
                        repeat: Infinity,
                        delay: i * 0.4,
                      }}
                    />
                  ))}
                </div>

                <div className="relative">
                  {/* Speech bubble */}
                  <div className="relative mb-6 max-w-md mx-auto p-4 rounded-2xl bg-[rgba(90,190,145,0.06)] border border-[rgba(90,190,145,0.18)] text-xs text-[#13301F] font-semibold leading-relaxed shadow-sm">
                    🐾 <strong>Kapi te guía:</strong> &quot;¡Hola! Para empezar a medir la huella, por favor sube los archivos de la carpeta local <strong>C:\AgroFinance-main\DATA</strong> (puedes arrastrar múltiples archivos o usar el botón de abajo para cargarlos todos juntos).&quot;
                  </div>

                  <motion.div
                    animate={isDragActive ? { scale: 1.15, y: -5 } : { scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="mx-auto mb-5"
                  >
                    <CapybaraBot size="lg" mood="scanning" showGlow />
                  </motion.div>

                  <div className="mb-5">
                    <motion.div
                      animate={isDragActive ? { y: -3 } : { y: 0 }}
                      className="w-16 h-16 mx-auto rounded-2xl bg-[rgba(90,190,145,0.1)] border border-[rgba(90,190,145,0.2)] flex items-center justify-center mb-4"
                    >
                      <Upload className={`w-7 h-7 transition-colors ${isDragActive ? 'text-[#137C53]' : 'text-[rgba(80,108,92,0.5)]'}`} />
                    </motion.div>
                  </div>

                  {isDragActive && !isDragReject ? (
                    <p className="text-[#137C53] text-lg font-bold">¡Suelta para analizar con IA!</p>
                  ) : isDragReject ? (
                    <p className="text-red-400 text-lg font-bold">Formato no soportado</p>
                  ) : (
                    <>
                      <p className="text-[#13301F] text-lg font-bold mb-2">
                        Arrastra tus archivos de campaña aquí
                      </p>
                      <p className="text-[rgba(80,108,92,0.5)] text-sm mb-6">
                        o haz clic para seleccionar
                      </p>

                      <div className="mb-6">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSimulateDataUpload();
                          }}
                          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2BA470] to-[#137C53] text-[#FBF4D6] font-bold text-xs shadow-md hover:brightness-105 active:scale-95 transition-all flex items-center gap-1.5 mx-auto"
                        >
                          <Database className="w-3.5 h-3.5" />
                          Autocargar Carpeta DATA (10 archivos)
                        </button>
                      </div>
                    </>
                  )}

                  <div className="flex flex-wrap justify-center gap-2">
                    {['.xlsx', '.xls', '.csv', '.pdf', '.txt'].map(ext => (
                      <span key={ext} className="badge badge-emerald">{ext}</span>
                    ))}
                  </div>
                  <p className="text-xs text-[rgba(80,108,92,0.3)] mt-4">Máx. 5 archivos · 50MB por archivo</p>
                </div>
              </div>

              {/* Info cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                {[
                  { icon: '🔒', title: 'Datos seguros', desc: 'Cifrado end-to-end. Tus datos nunca se comparten.' },
                  { icon: '⚡', title: 'Análisis en 2 min', desc: 'IA optimizada para datos agroexportadores.' },
                  { icon: '📋', title: 'Reporte automático', desc: 'HC Perú, GRI y Scope 1/2/3 generados al instante.' },
                ].map((item, i) => (
                  <div key={i} className="glass-card rounded-2xl p-4 text-center">
                    <div className="text-2xl mb-2">{item.icon}</div>
                    <div className="text-sm font-semibold text-[#13301F] mb-1">{item.title}</div>
                    <div className="text-xs text-[rgba(80,108,92,0.5)]">{item.desc}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* UPLOADING */}
          {stage === 'uploading' && (
            <motion.div
              key="uploading"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="glass-card rounded-3xl p-12 text-center"
            >
              <CapybaraBot size="lg" mood="thinking" showGlow className="mx-auto mb-6" />
              <h3 className="text-xl font-bold text-[#13301F] mb-2">Subiendo archivos...</h3>
              <p className="text-[rgba(80,108,92,0.5)] text-sm mb-8">
                {files.map(f => f.name).join(', ')}
              </p>
              <div className="w-full bg-[rgba(90,190,145,0.08)] rounded-full h-2 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #C5E0CF, #137C53)' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: 'easeOut' }}
                />
              </div>
              <p className="text-sm text-[#137C53] font-bold mt-3">{Math.round(progress)}%</p>
            </motion.div>
          )}

          {/* SCANNING */}
          {stage === 'scanning' && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="glass-card rounded-3xl p-12 text-center overflow-hidden relative"
            >
              {/* Scan line effect */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                  className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(90,190,145,0.5)] to-transparent"
                  animate={{ y: ['0%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />
              </div>

              <CapybaraBot size="lg" mood="scanning" showGlow className="mx-auto mb-6" />

              <div className="badge badge-emerald mb-4 inline-flex">
                <Sparkles className="w-3 h-3" />
                IA Analizando
              </div>

              <AnimatePresence mode="wait">
                <motion.p
                  key={scanIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-[#13301F] text-lg font-bold mb-2"
                >
                  {scanMessages[scanIndex]}
                </motion.p>
              </AnimatePresence>

              <p className="text-[rgba(80,108,92,0.5)] text-sm mb-8">
                Aplicando metodología GHG Protocol + HC Perú
              </p>

              {/* Progress */}
              <div className="w-full bg-[rgba(90,190,145,0.08)] rounded-full h-3 overflow-hidden mb-3">
                <motion.div
                  className="h-full rounded-full relative overflow-hidden"
                  style={{ background: 'linear-gradient(90deg, #C5E0CF, #137C53)' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: 'easeOut' }}
                >
                  <div className="absolute inset-0 shimmer" />
                </motion.div>
              </div>
              <p className="text-xs text-[rgba(80,108,92,0.5)]">
                Paso {Math.min(scanIndex + 1, scanMessages.length)} de {scanMessages.length}
              </p>

              {/* Processing dots */}
              <div className="flex justify-center gap-2 mt-6">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-[#137C53]"
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* COMPLETE — Clasificación + Reporte de Kapi */}
          {stage === 'complete' && clasificacion && (() => {
            const c = clasificacion
            const m = c.metricas
            const fmt = (n: number) => n.toLocaleString('es-PE')
            const scopeCards = [
              { label: 'Scope 1', value: m.scopes.s1, color: '#137C53' },
              { label: 'Scope 2', value: m.scopes.s2, color: '#3D7FB0' },
              { label: 'Scope 3', value: m.scopes.s3, color: '#D2A24A' },
              { label: 'Total', value: c.total, color: '#10B981' },
            ]
            const cadena = [
              { icon: Database, label: 'Datos' },
              { icon: Calculator, label: 'Métricas' },
              { icon: ClipboardCheck, label: 'Criterios' },
              { icon: GitBranch, label: 'Evaluación' },
              { icon: Award, label: `Nivel ${c.nivel}` },
            ]
            return (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="space-y-6"
            >
              {/* ---- Tarjeta de clasificación ---- */}
              <div className="glass-card rounded-3xl p-8 sm:p-10 text-center relative overflow-hidden">
                {/* Celebration particles */}
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1.5 h-1.5 rounded-full"
                    style={{
                      background: i % 3 === 0 ? '#137C53' : i % 3 === 1 ? '#3D7FB0' : '#D2A24A',
                      left: `${10 + i * 7}%`,
                      top: `${15 + (i % 4) * 15}%`,
                    }}
                    initial={{ opacity: 0, y: 0 }}
                    animate={{ opacity: [0, 1, 0], y: -40, x: (i % 2 === 0 ? 10 : -10) }}
                    transition={{ duration: 1.5, delay: i * 0.1 }}
                  />
                ))}

                <div className="badge badge-emerald mb-4 inline-flex">
                  <CheckCircle2 className="w-3 h-3" />
                  Análisis completado
                </div>

                <CapybaraBot size="md" mood="happy" showGlow className="mx-auto mb-4" />

                <p className="text-xs uppercase tracking-widest text-[rgba(80,108,92,0.5)] mb-2">
                  Tu clasificación de huella de carbono
                </p>

                {/* Nivel + etiqueta */}
                <div className="flex items-center justify-center gap-4 mb-2">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black"
                    style={{ background: `${c.color}1f`, border: `1.5px solid ${c.color}`, color: c.color }}
                  >
                    {c.nivel}
                  </div>
                  <div className="text-left">
                    <h3 className="text-2xl font-black text-[#13301F]">Nivel {c.nivel} · {c.etiqueta}</h3>
                    <p className="text-sm" style={{ color: c.color }}>{c.estado}</p>
                  </div>
                </div>

                {/* Estrellas */}
                <div className="flex items-center justify-center gap-1.5 mb-3">
                  {[1, 2, 3, 4].map((s) => (
                    <motion.div
                      key={s}
                      initial={{ scale: 0, rotate: -30 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.2 + s * 0.12, type: 'spring', stiffness: 260 }}
                    >
                      <Star
                        className="w-7 h-7"
                        style={{ color: s <= c.estrellas ? c.color : 'rgba(80,108,92,0.15)' }}
                        fill={s <= c.estrellas ? c.color : 'transparent'}
                      />
                    </motion.div>
                  ))}
                  <span className="text-sm font-bold text-[rgba(80,108,92,0.6)] ml-2">{c.estrellas} de 4</span>
                </div>

                {/* Índice de conformidad */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6 text-xs font-bold" style={{ background: `${c.color}14`, border: `1px solid ${c.color}40`, color: c.color }}>
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  Índice de conformidad: {c.indiceConformidad}%
                </div>

                {/* Scopes */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left mb-6">
                  {scopeCards.map((r, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className="p-4 rounded-2xl bg-[rgba(255,255,255,0.7)] border border-[rgba(90,190,145,0.1)]"
                    >
                      <div className="text-xs text-[rgba(80,108,92,0.5)] mb-1">{r.label}</div>
                      <div className="text-xl font-black" style={{ color: r.color }}>{fmt(r.value)}</div>
                      <div className="text-xs text-[rgba(80,108,92,0.4)]">tCO₂e</div>
                    </motion.div>
                  ))}
                </div>

                {/* Intensidad vs benchmark + hotspot real del motor */}
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[rgba(255,255,255,0.6)] border border-[rgba(90,190,145,0.1)] text-xs">
                    <TrendingDown className="w-3.5 h-3.5" style={{ color: m.intensidad <= m.benchmark ? '#137C53' : '#D2A24A' }} />
                    <span className="text-[rgba(80,108,92,0.7)]">
                      Intensidad <strong style={{ color: '#13301F' }}>{m.intensidad} kgCO₂e/kg</strong>
                      {' '}vs. benchmark sector {m.benchmark}
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[rgba(255,255,255,0.6)] border border-[rgba(90,190,145,0.1)] text-xs">
                    <AlertCircle className="w-3.5 h-3.5 text-[#D2A24A]" />
                    <span className="text-[rgba(80,108,92,0.7)]">
                      Hotspot: <strong style={{ color: '#13301F' }}>{cooperativa.hotspot.label}</strong> ({cooperativa.hotspot.pct}%)
                    </span>
                  </div>
                </div>

                {/* Procedencia de la data del piloto */}
                <p className="text-[11px] text-[rgba(80,108,92,0.45)] mt-4">
                  Consolidado de <strong className="text-[rgba(80,108,92,0.7)]">{new Set(campanias.map((c) => c.empresa)).size} mypes</strong> ·
                  {' '}{campanias.reduce((s, c) => s + c.envios.length, 0)} envíos ·
                  {' '}{fmt(Math.round(cooperativa.kilosExportados / 1000))} t exportadas · campaña 2026
                </p>
              </div>

              {/* ---- Cadena de evidencia + tabla de justificación técnica ---- */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="glass-card rounded-3xl p-6 sm:p-8"
              >
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[rgba(80,108,92,0.5)] mb-4">
                  <GitBranch className="w-3.5 h-3.5" /> Cómo se determinó tu nivel
                </div>

                {/* Cadena de evidencia */}
                <div className="flex items-center justify-between gap-1 mb-7 overflow-x-auto">
                  {cadena.map((paso, i) => {
                    const Icon = paso.icon
                    const last = i === cadena.length - 1
                    return (
                      <div key={i} className="flex items-center gap-1 flex-shrink-0">
                        <div className="flex flex-col items-center gap-1.5">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{
                              background: last ? `${c.color}1f` : 'rgba(90,190,145,0.07)',
                              border: `1px solid ${last ? c.color : 'rgba(90,190,145,0.2)'}`,
                            }}
                          >
                            <Icon className="w-4 h-4" style={{ color: last ? c.color : '#137C53' }} />
                          </div>
                          <span className="text-[10px] font-medium" style={{ color: last ? c.color : 'rgba(80,108,92,0.6)' }}>{paso.label}</span>
                        </div>
                        {!last && <div className="w-4 sm:w-8 h-px bg-[rgba(90,190,145,0.25)] mb-4" />}
                      </div>
                    )
                  })}
                </div>

                {/* Tabla de justificación: criterios del nivel asignado */}
                <div className="text-xs font-semibold text-[rgba(80,108,92,0.6)] mb-2">
                  Criterios evaluados · Nivel {c.nivel} ({c.etiqueta})
                </div>
                <div className="rounded-2xl border border-[rgba(90,190,145,0.1)] overflow-hidden mb-4">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[rgba(255,255,255,0.7)] text-[rgba(80,108,92,0.5)]">
                        <th className="text-left font-semibold px-3 py-2">Criterio</th>
                        <th className="text-left font-semibold px-3 py-2 hidden sm:table-cell">Requerido</th>
                        <th className="text-left font-semibold px-3 py-2">Obtenido</th>
                        <th className="text-center font-semibold px-3 py-2">Cumple</th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.criterios.map((cr, i) => (
                        <tr key={i} className="border-t border-[rgba(90,190,145,0.07)]">
                          <td className="px-3 py-2 text-[rgba(80,108,92,0.85)]">{cr.nombre}</td>
                          <td className="px-3 py-2 text-[rgba(80,108,92,0.5)] hidden sm:table-cell">{cr.requerido}</td>
                          <td className="px-3 py-2 font-semibold text-[#13301F]">{cr.obtenido}</td>
                          <td className="px-3 py-2 text-center">
                            {cr.cumple
                              ? <CheckCircle2 className="w-4 h-4 text-[#137C53] inline" />
                              : <X className="w-4 h-4 text-[#D9756A] inline" />}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Brecha al siguiente nivel */}
                {c.brechaSiguiente.length > 0 && (
                  <div className="rounded-2xl p-4 bg-[rgba(210,145,47,0.06)] border border-[rgba(210,145,47,0.18)]">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#D2A24A] mb-2">
                      <AlertCircle className="w-3.5 h-3.5" /> Para subir de nivel te falta:
                    </div>
                    <ul className="space-y-1.5">
                      {c.brechaSiguiente.map((cr, i) => (
                        <li key={i} className="text-xs text-[rgba(80,108,92,0.75)] flex items-center gap-2">
                          <span className="w-1 h-1 rounded-full bg-[#D2A24A]" />
                          <span className="text-[rgba(80,108,92,0.9)]">{cr.nombre}</span>: requiere {cr.requerido} (tienes {cr.obtenido})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="text-[10px] text-[rgba(80,108,92,0.3)] mt-4">
                  Metodología: motor de reglas sobre umbrales GHG Protocol · ISO 14064-3 · escala de verificación Bureau Veritas / Verra. Data simulada para demostración.
                </p>
              </motion.div>

              {/* ---- Reporte de Kapi según la clasificación ---- */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="glass-card rounded-3xl p-6 sm:p-8"
              >
                <div className="flex items-center gap-3 mb-5">
                  <CapybaraBot size="sm" mood="thinking" showGlow />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#13301F]">Reporte de Kapi</span>
                      <div className="badge badge-emerald text-[10px] py-0.5 px-2">
                        <Sparkles className="w-2.5 h-2.5" />
                        Según tu clasificación
                      </div>
                    </div>
                    <p className="text-xs text-[rgba(80,108,92,0.5)]">Análisis personalizado para Nivel {c.nivel}</p>
                  </div>
                </div>

                {/* Resumen */}
                <div className="ai-bubble p-4 mb-6">
                  <p className="text-xs leading-relaxed text-[rgba(80,108,92,0.85)]">
                    {c.resumenKapi.split(/\*\*(.*?)\*\*/g).map((part, j) =>
                      j % 2 === 1 ? <strong key={j} className="text-[#137C53]">{part}</strong> : part
                    )}
                  </p>
                </div>

                {/* Recomendaciones */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[rgba(80,108,92,0.5)] mb-3">
                    <ListChecks className="w-3.5 h-3.5" /> Recomendaciones prioritarias
                  </div>
                  <div className="space-y-2.5">
                    {c.recomendaciones.map((rec, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-2xl bg-[rgba(255,255,255,0.5)] border border-[rgba(90,190,145,0.08)]">
                        <div className="w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5" style={{ background: `${c.color}1f`, color: c.color }}>{i + 1}</div>
                        <p className="text-xs text-[rgba(80,108,92,0.8)] leading-relaxed">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Qué desbloquea esta clasificación */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[rgba(80,108,92,0.5)] mb-3">
                    <Globe2 className="w-3.5 h-3.5" /> Qué habilita tu nivel actual
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {c.desbloquea.map((d, i) => {
                      const Icon = d.activo ? Globe2 : Lock
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-2.5 p-3 rounded-2xl border"
                          style={{
                            background: d.activo ? 'rgba(90,190,145,0.06)' : 'rgba(255,255,255,0.4)',
                            borderColor: d.activo ? 'rgba(90,190,145,0.2)' : 'rgba(80,108,92,0.06)',
                          }}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" style={{ color: d.activo ? '#137C53' : 'rgba(80,108,92,0.35)' }} />
                          <span className="text-xs font-medium" style={{ color: d.activo ? 'rgba(80,108,92,0.85)' : 'rgba(80,108,92,0.4)' }}>{d.label}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Cronograma funcional de seguimiento (Kapi) */}
                <Cronograma
                  pasos={c.cronograma}
                  nivel={c.nivel}
                  color={c.color}
                  siguienteNivel={c.siguienteNivel}
                  instanceKey={analisisId}
                />

                <p className="text-[10px] text-[rgba(80,108,92,0.3)] mt-4 text-center">
                  AgroFinance no emite certificaciones. Te guiamos hacia los requisitos; la certificación la otorga un ente acreditado.
                </p>
              </motion.div>

              {/* ---- Acciones ---- */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a href="/copilot/" className="btn-primary text-sm flex items-center justify-center gap-2 py-3">
                  <Sparkles className="w-4 h-4" />
                  Conversar con Kapi
                </a>
                <a href="/dashboard/" className="btn-secondary text-sm flex items-center justify-center gap-2 py-3">
                  <FileSpreadsheet className="w-4 h-4" />
                  Ver Dashboard completo
                </a>
                <button onClick={reset} className="btn-secondary text-sm flex items-center justify-center gap-2 py-3">
                  <Upload className="w-4 h-4" />
                  Analizar otro archivo
                </button>
              </div>
            </motion.div>
            )
          })()}
        </AnimatePresence>
      </div>
    </div>
  )
}
