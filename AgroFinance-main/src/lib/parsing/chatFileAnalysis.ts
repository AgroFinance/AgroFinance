'use client'

// ============================================================
// AgroFinance — Análisis real de archivos subidos desde el chat de Kapi
// ------------------------------------------------------------
// Antes, subir un archivo por el chat (a diferencia de Configuración o
// Analizar Datos) no leía nada: mostraba un "¡procesado con éxito!" con
// las cifras demo de siempre, sin importar el contenido real del archivo.
// Este módulo es el que reemplaza esa simulación por lectura de verdad,
// y es la única puerta de entrada que necesitan CopilotDrawer y
// /copilot/page.tsx — así ambos comparten el mismo comportamiento real.
//
// Tres caminos según el tipo de archivo:
//   1. Hoja de cálculo (.xlsx/.xls/.csv/.xml/.ods) con columnas de consumo
//      reconocibles → el MISMO motor que Configuración y Analizar Datos:
//      parsearArchivo → ghgClassify → resumirLineas, y se registra como
//      fuente compartida (aparece en Configuración, mueve el Dashboard).
//      No es una lectura "para conversar" — es data real entrando al cálculo.
//      Si NINGUNA columna coincide (p. ej. un archivo financiero/macro sin
//      relación con consumos físicos), no se registra como fuente falsa de
//      "0 tCO2e": se trata como el caso 3 (texto), para que Kapi SÍ pueda
//      leer y conversar sobre el contenido aunque no alimente el cálculo.
//   2. PDF → se manda tal cual a Gemini como inlineData: Gemini SÍ puede
//      leer PDFs de forma nativa. Es lectura y razonamiento real, pero
//      no entra al motor de cálculo estructurado (un PDF no tiene columnas
//      con las que ghgClassify pueda trabajar) — se declara así, sin
//      fingir que "actualizó el dashboard".
//   3. Texto plano (.docx vía mammoth, .txt directo) → se extrae el texto
//      y se manda a Gemini para que lo lea y responda con base en el
//      contenido real, no en un resumen inventado.
//
// Lo que NO se finge nunca: un error de lectura se declara como error,
// nunca se disfraza de éxito con cifras de relleno (mismo principio que
// rige parseArchivo.ts y ghgClassify.ts).
// ============================================================

import { parsearArchivo, validarArchivo, huellaArchivo, ErrorArchivo, type ResultadoParseo } from '@/lib/parsing/parseArchivo'
import { ghgClassify, resumirLineas } from '@/lib/engine/ghgClassify'
import type { Mecanismo } from '@/lib/engine/emissionFactors'
import type { FuenteDatos } from '@/lib/store/datosPrueba'

const AREA_POR_MECANISMO: Partial<Record<Mecanismo, string>> = {
  riego: 'Riego', maquinaria: 'Producción', n2oCampo: 'Producción', fertilizante: 'Producción',
  packing: 'Finanzas', empaque: 'Logística', flete: 'Logística',
}

const EXTENSIONES_HOJA_CALCULO = ['xlsx', 'xls', 'csv', 'xml', 'ods']

export type ResultadoAnalisisChat =
  | { tipo: 'estructurado'; fuente: FuenteDatos; resumenTexto: string }
  | { tipo: 'pdf'; base64: string; mimeType: string; nombre: string }
  | { tipo: 'texto'; texto: string; nombre: string }
  | { tipo: 'error'; motivo: string }

const ext = (nombre: string) => (nombre.split('.').pop() || '').toLowerCase()

const fileABase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1] || '')
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
    reader.readAsDataURL(file)
  })

/** Vuelca la vista previa ya leída (columnas + primeras filas) como texto
 *  legible, para hojas que no tienen nada que ver con consumos de carbono
 *  pero que igual el usuario quiere que Kapi lea y comente. */
function vistaComoTexto(nombre: string, parseado: ResultadoParseo): string {
  const encabezado = parseado.columnas.join(' | ')
  const separador = parseado.columnas.map(() => '---').join(' | ')
  const cuerpo = parseado.filasPreview
    .map((fila) => fila.map((c) => (c === '' || c === null ? '' : String(c))).join(' | '))
    .join('\n')
  return [
    `Archivo "${nombre}" — hoja de cálculo con ${parseado.hojas.length} hoja(s): ${parseado.hojas.join(', ')}.`,
    'Ninguna columna coincide con un consumo de carbono reconocible (diésel, electricidad, fertilizante, cartón, film, palet, flete), así que no se sumó a ningún cálculo de huella.',
    `Muestra de las primeras ${parseado.filasPreview.length} fila(s) de la primera hoja con datos (de ${parseado.columnas.length} columna(s) detectadas):`,
    '',
    encabezado,
    separador,
    cuerpo,
  ].join('\n')
}

async function analizarHojaCalculo(file: File): Promise<ResultadoAnalisisChat> {
  const invalido = validarArchivo(file)
  if (invalido) return { tipo: 'error', motivo: invalido }
  try {
    const parseado = await parsearArchivo(file)
    const lineas = ghgClassify(parseado.lineas)
    const resumen = resumirLineas(lineas)

    if (resumen.leidas === 0) {
      return { tipo: 'texto', texto: vistaComoTexto(file.name, parseado), nombre: file.name }
    }

    const top = (Object.entries(resumen.porMecanismo) as [Mecanismo, number][]).sort((a, b) => b[1] - a[1])[0]
    const area = (top && AREA_POR_MECANISMO[top[0]]) || 'Producción'

    const fuente: FuenteDatos = {
      id: `chat-${Date.now()}`,
      area,
      archivo: file.name,
      actualizado: new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }),
      estado: 'sincronizado',
      origen: 'upload',
      huella: huellaArchivo(file),
      hojas: parseado.hojas,
      lineas: lineas.slice(0, 400),
      resumen,
      preview: { columnas: parseado.columnas, filas: parseado.filasPreview },
    }

    const resumenTexto = `El archivo "${file.name}" se procesó con el motor real de AgroFinance: ${resumen.leidas} línea(s) reconocidas, ${resumen.ignoradas} ignoradas (sin factor asignable). Emisión calculada: ${resumen.emisionTon.toFixed(3)} tCO2e (Scope 1: ${resumen.scopes.s1.toFixed(3)}, Scope 2: ${resumen.scopes.s2.toFixed(3)}, Scope 3: ${resumen.scopes.s3.toFixed(3)}). Área: ${area}. Este archivo ya quedó vinculado en Configuración y su aporte se sumó al Dashboard.`

    return { tipo: 'estructurado', fuente, resumenTexto }
  } catch (e) {
    const motivo = e instanceof ErrorArchivo || e instanceof Error ? e.message : 'No se pudo leer el archivo'
    return { tipo: 'error', motivo }
  }
}

/** Punto de entrada único: decide la ruta según la extensión real del archivo. */
export async function analizarArchivoChat(file: File): Promise<ResultadoAnalisisChat> {
  if (file.size === 0) return { tipo: 'error', motivo: 'El archivo está vacío.' }
  if (file.size > 25 * 1024 * 1024) return { tipo: 'error', motivo: `El archivo pesa ${(file.size / 1024 / 1024).toFixed(1)} MB y el límite es 25 MB.` }

  const extension = ext(file.name)

  if (EXTENSIONES_HOJA_CALCULO.includes(extension)) {
    return analizarHojaCalculo(file)
  }

  if (extension === 'pdf') {
    try {
      const base64 = await fileABase64(file)
      return { tipo: 'pdf', base64, mimeType: 'application/pdf', nombre: file.name }
    } catch {
      return { tipo: 'error', motivo: 'No se pudo leer el PDF.' }
    }
  }

  if (extension === 'docx') {
    try {
      const mammoth = await import('mammoth')
      const arrayBuffer = await file.arrayBuffer()
      const { value } = await mammoth.extractRawText({ arrayBuffer })
      if (!value.trim()) return { tipo: 'error', motivo: 'El documento Word no tiene texto legible (¿está escaneado como imagen?).' }
      return { tipo: 'texto', texto: value, nombre: file.name }
    } catch {
      return { tipo: 'error', motivo: 'No se pudo leer el archivo Word. Verifica que sea un .docx válido.' }
    }
  }

  if (extension === 'doc') {
    return { tipo: 'error', motivo: 'El formato .doc (Word 97-2003) no se puede leer en el navegador. Guarda el archivo como .docx desde Word y vuelve a subirlo.' }
  }

  if (extension === 'txt') {
    const texto = await file.text()
    if (!texto.trim()) return { tipo: 'error', motivo: 'El archivo de texto está vacío.' }
    return { tipo: 'texto', texto, nombre: file.name }
  }

  return { tipo: 'error', motivo: `Formato .${extension || '?'} no soportado. Sube Excel/CSV/XML/ODS (se calcula al instante) o PDF/DOCX/TXT (Kapi lo lee y responde sobre su contenido).` }
}
