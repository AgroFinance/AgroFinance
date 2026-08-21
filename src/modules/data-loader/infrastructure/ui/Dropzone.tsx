'use client'

// ============================================================
// Dropzone reutilizable — arrastrar y soltar con subida múltiple
// ------------------------------------------------------------
// Antes, vincular archivos era de uno en uno: abrir el selector, elegir,
// esperar, repetir. Con cuatro áreas de la empresa mandando Excel cada mes,
// eso es fricción pura.
//
// Accesible por defecto: el área es un <label> enlazado al input, así que
// funciona con Tab + Enter/Espacio sin manejo manual de foco, y el estado
// de arrastre se comunica con borde + texto (no solo color).
// ============================================================

import { useCallback, useRef, useState } from 'react'
import { UploadCloud } from 'lucide-react'

type Props = {
  onArchivos: (archivos: File[]) => void
  accept?: string
  /** Texto principal dentro de la zona. */
  titulo?: string
  ayuda?: string
  disabled?: boolean
  id?: string
}

export default function Dropzone({
  onArchivos,
  accept = '.xlsx,.xls,.csv,.xml',
  titulo = 'Arrastra tus archivos aquí o haz clic para elegirlos',
  ayuda = 'Acepta varios a la vez · .xlsx, .csv y .xml (SUNAT UBL 2.1)',
  disabled = false,
  id = 'dropzone-archivos',
}: Props) {
  const [arrastrando, setArrastrando] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  // Contador de entradas/salidas: sin esto, pasar sobre un hijo dispara
  // dragleave y el resaltado parpadea.
  const profundidad = useRef(0)

  const emitir = useCallback(
    (lista: FileList | null) => {
      if (!lista || !lista.length) return
      onArchivos(Array.from(lista))
    },
    [onArchivos],
  )

  return (
    <div>
      <label
        htmlFor={id}
        onDragEnter={(e) => {
          e.preventDefault()
          profundidad.current++
          if (!disabled) setArrastrando(true)
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          e.preventDefault()
          profundidad.current = Math.max(0, profundidad.current - 1)
          if (profundidad.current === 0) setArrastrando(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          profundidad.current = 0
          setArrastrando(false)
          if (!disabled) emitir(e.dataTransfer.files)
        }}
        className={`group flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-[#137C53] focus-within:ring-offset-2 ${
          disabled
            ? 'border-[rgba(80,108,92,0.2)] bg-[rgba(244,246,242,0.6)] cursor-not-allowed opacity-60'
            : arrastrando
              ? 'border-[#137C53] bg-[rgba(90,190,145,0.12)]'
              : 'border-[rgba(90,190,145,0.35)] bg-[rgba(90,190,145,0.04)] hover:border-[#137C53] hover:bg-[rgba(90,190,145,0.08)]'
        }`}
      >
        <span
          className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-colors ${
            arrastrando ? 'bg-[#137C53] text-white' : 'bg-[rgba(90,190,145,0.15)] text-[#137C53]'
          }`}
        >
          <UploadCloud className="w-5 h-5" />
        </span>
        <span className="text-sm font-bold text-[#13301F]">
          {arrastrando ? 'Suelta los archivos para agregarlos a la cola' : titulo}
        </span>
        <span className="text-xs text-[rgba(80,108,92,0.65)]">{ayuda}</span>
        <input
          ref={inputRef}
          id={id}
          type="file"
          multiple
          accept={accept}
          disabled={disabled}
          onChange={(e) => {
            emitir(e.target.files)
            e.target.value = ''
          }}
          className="sr-only"
        />
      </label>
    </div>
  )
}
