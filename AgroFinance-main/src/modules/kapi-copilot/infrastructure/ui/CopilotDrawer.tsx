'use client'

// Widget flotante de Kapi — layout únicamente. Toda la lógica (mensajes,
// archivos, voz, registro) vive en useKapiChat, compartida con
// CopilotFullView (la página /copilot/ completa). Ver useKapiChat.ts.
import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, ClipboardList, Check, Loader2, Square, X,
  FolderOpen, FileSpreadsheet, Zap, Mic, ImagePlus,
} from 'lucide-react'
import KapiIcon from '@/modules/kapi-copilot/infrastructure/ui/KapiIcon'
import { useChat } from '@/core/providers/ChatContext'
import { useKapiChat, TIPO_LABEL } from './useKapiChat'
import { formatMessage } from './formatMessage'

export default function CopilotDrawer() {
  const { isChatOpen, closeChat, mensajeExterno, limpiarMensajeExterno } = useChat()
  const kapi = useKapiChat()
  const {
    hasData, messages, isTyping, input, setInput, mode, registros,
    isRecording, isTranscribing, toggleRecording,
    pendingImage, setPendingImage, pendingFile, setPendingFile, isProcessingFile,
    handleImageSelect, handleDataFileSelect, processDataFile,
    bottomRef, imageInputRef, dataFileInputRef,
    sendMessage, autocargarDatosDemo, suggestedQuestions,
  } = kapi

  // Otras superficies (el teléfono de la landing, botones "preguntar a Kapi"
  // en cualquier página) entregan aquí su pregunta en vez de tener su propia
  // conversación aislada — se envía por el mismo pipeline real del drawer.
  useEffect(() => {
    if (!isChatOpen || !mensajeExterno) return
    const texto = mensajeExterno
    limpiarMensajeExterno()
    sendMessage(texto)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isChatOpen, mensajeExterno])

  return (
    <AnimatePresence>
      {isChatOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeChat}
            className="fixed inset-0 bg-black/30 z-[100]"
          />

          {/* Drawer / Floating Window */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 260, damping: 25 }}
            className="fixed inset-y-0 sm:top-24 sm:bottom-6 right-0 sm:right-6 w-full sm:w-[440px] z-[101] bg-white/85 backdrop-blur-md shadow-2xl flex flex-col sm:rounded-3xl border border-gray-200/50 overflow-hidden"
          >
            <input type="file" ref={imageInputRef} accept="image/*" className="hidden" onChange={handleImageSelect} />
            <input
              type="file"
              ref={dataFileInputRef}
              accept=".xlsx,.xls,.csv,.pdf,.docx,.doc,.txt,.ods,image/*"
              multiple
              className="hidden"
              onChange={handleDataFileSelect}
            />
            <div className="flex-1 flex flex-col h-full overflow-hidden p-4">

              {/* Chat header (Drawer style) */}
              <div className="glass-card rounded-2xl px-5 py-3 mb-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: '#0F3D2C' }}>
                    <KapiIcon size={20} color="#FBF4D6" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#13301F]">Kapi Copilot</span>
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[rgba(90,190,145,0.12)] border border-[rgba(90,190,145,0.2)]">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#137C53] animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>
                <button onClick={closeChat} className="p-2 rounded-xl text-[rgba(80,108,92,0.5)] hover:bg-[rgba(90,190,145,0.1)] transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Banner explicativo del modo registro */}
              <AnimatePresence>
                {mode === 'registro' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mb-4"
                  >
                    <div className="rounded-2xl border border-[rgba(90,190,145,0.2)] bg-[rgba(90,190,145,0.06)] p-3 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[rgba(90,190,145,0.12)] flex items-center justify-center flex-shrink-0">
                        <ClipboardList className="w-4 h-4 text-[#137C53]" />
                      </div>
                      <p className="text-xs text-[rgba(80,108,92,0.8)] leading-relaxed">
                        <strong className="text-[#137C53]">Modo Registro.</strong> Habla con Kapi para guardar datos
                        de almacén, cosecha, envíos o insumos. Ej: <em>“Registrar 500 kg de palta en almacén Norte”</em>.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2" style={{ maxHeight: 'calc(100vh - 340px)' }}>
                {messages.map((msg, i) => (
                  <motion.div
                    layout
                    key={i}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-3`}
                  >
                    {msg.role === 'ai' && (
                      <div className="flex-shrink-0 mt-1 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#0F3D2C' }}>
                        <KapiIcon size={17} color="#FBF4D6" />
                      </div>
                    )}
                    <div className={`max-w-[75%] ${msg.role === 'ai' ? 'ai-bubble' : 'user-bubble'} px-4 py-3 text-xs leading-relaxed`}>
                      {msg.imageUrl && (
                        <img src={msg.imageUrl} alt="Imagen enviada" className="rounded-xl mb-2 max-h-48 object-cover border border-[rgba(90,190,145,0.2)]" />
                      )}
                      <ul className="space-y-1">
                        {formatMessage(msg.content)}
                      </ul>
                      {msg.showAutoload && (
                        <div className="mt-3 pt-2 border-t border-[rgba(90,190,145,0.15)]">
                          <p className="text-[10px] text-[rgba(80,108,92,0.5)] mb-1.5">¿Quieres activar tus indicadores ESG con datos demo?</p>
                          <button
                            onClick={autocargarDatosDemo}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-white transition-all active:scale-95"
                            style={{ background: 'linear-gradient(135deg, #2BA470, #137C53)' }}
                          >
                            <span>⚡</span> Autocargar datos demo
                          </button>
                        </div>
                      )}
                      <span className="text-[10px] text-[rgba(80,108,92,0.3)] mt-2 block">{msg.time}</span>
                    </div>
                  </motion.div>
                ))}

                {/* Typing indicator */}
                <AnimatePresence>
                  {isTyping && (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="flex justify-start gap-3"
                    >
                      <div className="flex-shrink-0 mt-1 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#0F3D2C' }}>
                        <KapiIcon size={17} color="#FBF4D6" />
                      </div>
                      <div className="ai-bubble px-4 py-3 flex items-center gap-1.5">
                        {[0, 0.2, 0.4].map((delay, i) => (
                          <motion.div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-[#137C53]"
                            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                            transition={{ duration: 1, repeat: Infinity, delay }}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div ref={bottomRef} />
              </div>

              {/* Sugerencias — preguntas (chat) o ejemplos de registro */}
              {mode === 'chat' && messages.length <= 2 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-wrap gap-2 mb-3"
                >
                  {suggestedQuestions.slice(0, 4).map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="text-xs px-3 py-2 rounded-xl glass border border-[rgba(90,190,145,0.15)] text-[rgba(80,108,92,0.7)] hover:text-[#137C53] hover:border-[rgba(90,190,145,0.3)] transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </motion.div>
              )}

              {mode === 'registro' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-3">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {[
                      'Registrar 500 kg de palta en almacén Norte',
                      'Anota 30 cajas de mango cosechadas hoy',
                      'Agrega 200 L de diésel como insumo',
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => sendMessage(q)}
                        className="text-xs px-3 py-2 rounded-xl glass border border-[rgba(90,190,145,0.15)] text-[rgba(80,108,92,0.7)] hover:text-[#137C53] hover:border-[rgba(90,190,145,0.3)] transition-all"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                  {registros.length > 0 && (
                    <div className="rounded-2xl glass-card p-3">
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-[rgba(80,108,92,0.45)] mb-2">
                        Últimos registros
                      </div>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto">
                        {registros.slice(0, 5).map((r, i) => (
                          <div key={r.id || i} className="flex items-center gap-2.5 text-xs">
                            <span className="w-6 h-6 rounded-lg bg-[rgba(90,190,145,0.12)] flex items-center justify-center flex-shrink-0">
                              <Check className="w-3 h-3 text-[#137C53]" />
                            </span>
                            <span className="font-semibold text-[#13301F]">{r.cantidad} {r.unidad}</span>
                            <span className="text-[rgba(80,108,92,0.7)] truncate">{r.producto}</span>
                            <span className="ml-auto badge badge-emerald text-[10px] py-0.5 px-2 flex-shrink-0">{TIPO_LABEL[r.tipo] || r.tipo}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Input */}
              <AnimatePresence>
                {pendingFile && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                    className="mb-2 flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[rgba(90,190,145,0.08)] border border-[rgba(90,190,145,0.2)]"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[rgba(90,190,145,0.15)] flex items-center justify-center flex-shrink-0">
                      <FileSpreadsheet className="w-4 h-4 text-[#137C53]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-[#13301F] truncate">{pendingFile.name}</div>
                      <div className="text-[10px] text-[rgba(80,108,92,0.5)]">{(pendingFile.size / 1024 / 1024).toFixed(2)} MB · Listo para procesar</div>
                    </div>
                    <button
                      onClick={processDataFile}
                      disabled={isProcessingFile}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-60"
                      style={{ background: 'linear-gradient(135deg, #2BA470, #137C53)' }}
                    >
                      <Zap className="w-3.5 h-3.5" /> Procesar
                    </button>
                    <button onClick={() => setPendingFile(null)} className="w-6 h-6 rounded-full bg-[rgba(80,108,92,0.1)] flex items-center justify-center text-[rgba(80,108,92,0.5)] hover:bg-red-100 hover:text-red-500 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              {pendingImage && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-2 relative inline-block">
                  <img src={pendingImage.preview} alt="Preview" className="h-20 rounded-xl border border-[rgba(90,190,145,0.3)] object-cover" />
                  <button onClick={() => setPendingImage(null)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-2xl p-3 flex items-center gap-2"
              >
                <button
                  onClick={() => dataFileInputRef.current?.click()}
                  disabled={isTyping || isRecording || isTranscribing || isProcessingFile}
                  title="Subir archivo (Excel, PDF, CSV, Word...)"
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 text-[rgba(80,108,92,0.4)] hover:text-[#137C53] hover:bg-[rgba(90,190,145,0.08)]"
                >
                  <FolderOpen className="w-4 h-4" />
                </button>
                <button
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isTyping || isRecording || isTranscribing || isProcessingFile}
                  title="Subir imagen"
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 text-[rgba(80,108,92,0.4)] hover:text-[#137C53] hover:bg-[rgba(90,190,145,0.08)]"
                >
                  <ImagePlus className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder={isProcessingFile
                    ? 'Procesando archivo con IA…'
                    : isRecording
                    ? 'Grabando… toca el micrófono para enviar'
                    : isTranscribing
                    ? 'Transcribiendo tu audio…'
                    : pendingFile
                    ? 'Archivo listo — pulsa ⚡ Procesar para analizarlo'
                    : pendingImage
                    ? 'Describe la imagen o envía directamente…'
                    : mode === 'registro'
                    ? 'Ej: Registrar 500 kg de palta en almacén Norte…'
                    : 'Pregunta a Kapi o sube un archivo con 📂…'}
                  className="flex-1 bg-transparent outline-none text-sm text-[#13301F] placeholder:text-[rgba(80,108,92,0.3)]"
                  disabled={isTyping || isRecording || isTranscribing || isProcessingFile}
                />
                <button
                  onClick={toggleRecording}
                  disabled={isTyping || isTranscribing}
                  title={isRecording ? 'Detener y enviar' : 'Hablar (audio a texto)'}
                  className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 ${
                    isRecording
                      ? 'bg-red-500/15 text-red-600'
                      : 'text-[rgba(80,108,92,0.4)] hover:text-[#137C53] hover:bg-[rgba(90,190,145,0.08)]'
                  }`}
                >
                  {isTranscribing ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#137C53]" />
                  ) : isRecording ? (
                    <>
                      <span className="absolute inset-0 rounded-xl bg-red-500/20 animate-ping" />
                      <Square className="w-3.5 h-3.5 relative" fill="currentColor" />
                    </>
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => sendMessage()}
                  disabled={(!input.trim() && !pendingImage) || isTyping || isProcessingFile}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    background: (input.trim() || pendingImage) ? 'linear-gradient(135deg, #2BA470, #0E7A4E)' : 'rgba(90,190,145,0.1)',
                  }}
                >
                  <Send className="w-4 h-4 text-[#0E2418]" />
                </button>
              </motion.div>

              <p className="text-center text-[10px] text-[rgba(80,108,92,0.25)] mt-2">
                Kapi puede cometer errores. Verifica información crítica.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
