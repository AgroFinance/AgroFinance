'use client'

// ============================================================
// AgroFinance — Lectura de archivos del cliente (cliente puro)
// ------------------------------------------------------------
// Convierte los tres formatos que la empresa ya tiene en su día a día
// (.xlsx, .csv, .xml de SUNAT UBL 2.1) en LineaLeida[], el formato que
// consume ghgClassify. Sin backend: todo ocurre en el navegador.
//
// Dos cosas que un lector "de demo" suele omitir y aquí no:
//  · Las hojas y filas ocultas se leen y se MARCAN como ocultas, para que
//    la depuración pueda mostrarle al auditor qué había escondido el libro.
//  · Un archivo ilegible no se traga en silencio: devuelve un error con
//    motivo, y la fuente queda en estado `error` sin sumar al total.
// ============================================================

import type { LineaLeida } from './ghgClassify'

export type ResultadoParseo = {
  lineas: LineaLeida[]
  /** Hojas efectivamente recorridas (incluye las ocultas, marcadas). */
  hojas: string[]
  /** Columnas detectadas, para la vista previa de Configuración. */
  columnas: string[]
  filasPreview: (string | number)[][]
}

export class ErrorArchivo extends Error {}

const EXT = (nombre: string) => (nombre.split('.').pop() || '').toLowerCase()

export const EXTENSIONES_SOPORTADAS = ['xlsx', 'xls', 'csv', 'xml', 'ods'] as const
export const ACCEPT_ARCHIVOS = '.xlsx,.xls,.csv,.xml,.ods'
export const TAMANO_MAX_MB = 25
export const MAX_ARCHIVOS_LOTE = 12

export function validarArchivo(f: File): string | null {
  const ext = EXT(f.name)
  if (!(EXTENSIONES_SOPORTADAS as readonly string[]).includes(ext)) {
    return `Formato .${ext || '?'} no soportado — se aceptan ${EXTENSIONES_SOPORTADAS.map((e) => '.' + e).join(', ')}`
  }
  if (f.size > TAMANO_MAX_MB * 1024 * 1024) {
    return `El archivo pesa ${(f.size / 1024 / 1024).toFixed(1)} MB y el límite es ${TAMANO_MAX_MB} MB`
  }
  if (f.size === 0) return 'El archivo está vacío'
  return null
}

/** Huella de identidad del archivo — base de la idempotencia (RNF-7.4). */
export const huellaArchivo = (f: File) => `${f.name.toLowerCase()}::${f.size}::${f.lastModified}`

// Detecta la unidad a partir del nombre de la columna: "diesel_campo_gal",
// "electricidad_riego_kwh", "peso_neto_fruta_kg"...
const SUFIJOS_UNIDAD: [RegExp, string][] = [
  [/_?(kwh)$/i, 'kWh'],
  [/_?(mwh)$/i, 'MWh'],
  [/_?(gal|galones)$/i, 'gal'],
  [/_?(m3|m³|metros?_?cubicos?)$/i, 'm3'],
  [/_?(lt|ltr|litros?|l)$/i, 'L'],
  [/_?(kg|kilos)$/i, 'kg'],
  [/_?(tn|ton|toneladas?|t)$/i, 't'],
  [/_?(km)$/i, 'km'],
  [/_?(u|und|unidades?)$/i, 'u'],
  [/_?(pct|porcentaje|%)$/i, '%'],
]

export function unidadDeColumna(col: string): string {
  for (const [re, uni] of SUFIJOS_UNIDAD) {
    if (re.test(col)) return uni
  }
  return ''
}

// Muchos archivos reales no nombran la columna con el consumo ("diesel_gal")
// sino que usan una columna numérica genérica ("Cantidad") + una columna de
// unidad separada ("Unidad") + una columna de texto que dice QUÉ es
// ("Insumo", "Tipo_Fertilizante", "Concepto"...). Sin esto, "Cantidad" no
// clasifica con nada (campoLeido no tiene ninguna palabra clave) y la unidad
// queda vacía — la línea se ignora en silencio y el total sale en 0 aunque
// el archivo sí tenga los datos.
const COL_UNIDAD = /^(unidad|unid|u\.?m\.?|medida)$/i
const COL_DESCRIPTOR = /tipo|insumo|concepto|material|descripci[oó]n|detalle|producto|\bitem\b|art[ií]culo/i
const COL_CANTIDAD_GENERICA = /^(cantidad|monto|valor|volumen|total|peso|numero|n[uú]mero|nro|qty|cant)\b/i

function enriquecerConFila(col: string, fila: Record<string, unknown>, cols: string[]): { campoLeido: string; unidad: string } {
  let unidad = unidadDeColumna(col)
  if (!unidad) {
    const colUnidad = cols.find((c) => COL_UNIDAD.test(c.trim()))
    const valorUnidad = colUnidad ? fila[colUnidad] : null
    if (typeof valorUnidad === 'string' && valorUnidad.trim()) unidad = valorUnidad.trim()
  }

  let campoLeido = col
  if (COL_CANTIDAD_GENERICA.test(col.trim())) {
    const colDescriptor = cols.find((c) => c !== col && COL_DESCRIPTOR.test(c.trim()))
    const valorDescriptor = colDescriptor ? fila[colDescriptor] : null
    if (typeof valorDescriptor === 'string' && valorDescriptor.trim()) {
      campoLeido = `${valorDescriptor.trim()} (${col})`
    }
  }

  return { campoLeido, unidad }
}

const aNumero = (v: unknown): number | null => {
  if (typeof v === 'number') return isFinite(v) ? v : null
  if (typeof v !== 'string') return null
  let limpio = v.replace(/\s/g, '')
  if (limpio === '') return null
  // Separador de miles: si aparecen punto Y coma, el decimal es el que está
  // más a la derecha ('1.234,56' ES/PE y '1,234.56' EN) y el otro se descarta.
  // Antes ambos formatos daban NaN y la fila se perdía como "sin columna
  // numérica". Debe seguir igual que _a_numero en functions/engine (test_parity).
  if (limpio.includes('.') && limpio.includes(',')) {
    limpio = limpio.lastIndexOf(',') > limpio.lastIndexOf('.')
      ? limpio.replace(/\./g, '').replace(/,/g, '.')
      : limpio.replace(/,/g, '')
  } else if (limpio.includes(',')) {
    limpio = limpio.replace(/,/g, '.')
  }
  const n = Number(limpio)
  return isFinite(n) ? n : null
}

// ------------------------------------------------------------
// XLSX / CSV vía SheetJS
// ------------------------------------------------------------
async function parsearHojaCalculo(file: File): Promise<ResultadoParseo> {
  const XLSX = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array', cellDates: false })

  if (!wb.SheetNames.length) throw new ErrorArchivo('El libro no contiene hojas legibles')

  const lineas: LineaLeida[] = []
  const hojas: string[] = []
  let columnas: string[] = []
  const filasPreview: (string | number)[][] = []

  for (const nombreHoja of wb.SheetNames) {
    const meta = (wb.Workbook?.Sheets || []).find((s: any) => s?.name === nombreHoja)
    // Hidden: 0 = visible, 1 = oculta, 2 = muy oculta
    const hojaOculta = !!meta && typeof meta.Hidden === 'number' && meta.Hidden > 0
    hojas.push(hojaOculta ? `${nombreHoja} (oculta)` : nombreHoja)

    const hoja = wb.Sheets[nombreHoja]
    if (!hoja) continue
    const filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, { defval: null, raw: true })
    if (!filas.length) continue

    const cols = Object.keys(filas[0])
    if (!columnas.length) {
      columnas = cols
      for (const f of filas.slice(0, 12)) {
        filasPreview.push(cols.map((c) => (f[c] === null || f[c] === undefined ? '' : (f[c] as string | number))))
      }
    }

    filas.forEach((f, i) => {
      for (const col of cols) {
        const valor = aNumero(f[col])
        // Las columnas de texto (empresa, cultivo, fecha) no son consumos:
        // no se listan como líneas ignoradas para no ahogar la depuración.
        if (valor === null) continue
        const { campoLeido, unidad } = enriquecerConFila(col, f, cols)
        lineas.push({
          id: `${nombreHoja}!${i + 2}:${col}`,
          campoLeido,
          valor,
          unidad,
          hoja: nombreHoja,
          fila: i + 2,
          oculto: hojaOculta || undefined,
        })
      }
    })
  }

  if (!lineas.length) throw new ErrorArchivo('No se encontró ninguna columna numérica que pueda leerse como consumo')

  return { lineas, hojas, columnas, filasPreview }
}

// ------------------------------------------------------------
// XML SUNAT UBL 2.1
// ------------------------------------------------------------
export type CabeceraUBL = {
  invoiceId: string
  ruc: string
  proveedor: string
  fecha: string
  moneda: string
  montoTotal: number | null
}

export type ResultadoUBL = ResultadoParseo & { cabecera: CabeceraUBL }

const texto = (doc: Document, tag: string, i = 0) =>
  doc.getElementsByTagName(tag)[i]?.textContent?.trim() || ''

const UNIDAD_UBL: Record<string, string> = {
  LTR: 'L', GLL: 'gal', KWH: 'kWh', MWH: 'MWh', KGM: 'kg', TNE: 't', NIU: 'u', ZZ: '',
}

export async function parsearUBL(contenido: string, nombre: string): Promise<ResultadoUBL> {
  const doc = new DOMParser().parseFromString(contenido, 'text/xml')
  if (doc.getElementsByTagName('parsererror').length) {
    throw new ErrorArchivo('El XML no está bien formado y no pudo interpretarse')
  }

  const lineasXml = Array.from(doc.getElementsByTagName('cac:InvoiceLine'))
  const raiz = Array.from(doc.getElementsByTagName('cbc:ID'))
  const cabecera: CabeceraUBL = {
    invoiceId: raiz[0]?.textContent?.trim() || nombre,
    ruc: raiz[1]?.textContent?.trim() || '—',
    proveedor: texto(doc, 'cbc:RegistrationName') || '—',
    fecha: texto(doc, 'cbc:IssueDate') || '—',
    moneda: doc.getElementsByTagName('cbc:PayableAmount')[0]?.getAttribute('currencyID') || 'PEN',
    montoTotal: aNumero(texto(doc, 'cbc:PayableAmount')),
  }

  const lineas: LineaLeida[] = []
  lineasXml.forEach((nodo, i) => {
    const qtyNode = nodo.getElementsByTagName('cbc:InvoicedQuantity')[0]
    const descripcion = nodo.getElementsByTagName('cbc:Description')[0]?.textContent?.trim() || `Ítem ${i + 1}`
    const unitCode = qtyNode?.getAttribute('unitCode') || ''
    lineas.push({
      id: `UBL!linea-${i + 1}`,
      campoLeido: descripcion,
      valor: aNumero(qtyNode?.textContent || ''),
      unidad: UNIDAD_UBL[unitCode] ?? unitCode,
      hoja: 'Comprobante UBL 2.1',
      fila: i + 1,
      crudo: qtyNode?.textContent?.trim() || undefined,
    })
  })

  if (!lineas.length) throw new ErrorArchivo('El comprobante no declara líneas de detalle (cac:InvoiceLine)')

  return {
    lineas,
    hojas: ['Comprobante UBL 2.1'],
    columnas: ['Descripción del ítem', 'Cantidad', 'Unidad'],
    filasPreview: lineas.map((l) => [l.campoLeido, l.valor ?? '', l.unidad]),
    cabecera,
  }
}

// ------------------------------------------------------------
// Punto de entrada
// ------------------------------------------------------------
/**
 * Cede el hilo antes de trabajar para que la UI pinte el estado
 * "procesando" antes de que empiece el parseo pesado (RNF-7.2).
 */
const cederHilo = () =>
  new Promise<void>((r) => {
    const ric = (globalThis as any).requestIdleCallback
    if (typeof ric === 'function') ric(() => r(), { timeout: 120 })
    else setTimeout(r, 0)
  })

export async function parsearArchivo(file: File): Promise<ResultadoParseo> {
  const invalido = validarArchivo(file)
  if (invalido) throw new ErrorArchivo(invalido)

  await cederHilo()

  if (EXT(file.name) === 'xml') {
    return parsearUBL(await file.text(), file.name)
  }
  return parsearHojaCalculo(file)
}
