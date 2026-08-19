'use client'

// ============================================================
// AgroFinance — Paquete de verificación para tercero (RF-C5)
// ------------------------------------------------------------
// El informe técnico en PDF responde "de dónde sale cada número".
// Este paquete responde la pregunta siguiente, que es la que hace el
// verificador acreditado cuando viene a auditar:
//
//   "Muéstrame TODAS las líneas, incluidas las que descartaste, y dime
//    quién tocó qué."
//
// Sin esto, la verificación vuelve al punto de partida: el auditor pide
// los Excel originales por correo y el ahorro de horas desaparece — que
// es justo el dolor que la plataforma dice resolver.
//
// La hoja que decide una auditoría no es la del total: son estas dos
//   · Líneas excluidas, con el motivo escrito.
//   · Correcciones manuales, donde un humano sobreescribió a la máquina.
// Un verificador muestrea ahí primero. Por eso van completas y separadas,
// no escondidas dentro del detalle general.
// ============================================================

import type { FuenteDatos } from '@/lib/store/datosPrueba'
import type { HuellaConsolidada } from '@/lib/engine/huellaConsolidada'
import type { LineaClasificada } from '@/lib/engine/ghgClassify'
import { CATALOGO_FACTORES } from '@/lib/engine/ghgClassify'
import { MECANISMO_META } from '@/lib/engine/emissionFactors'
import { NIVEL_VALIDEZ } from '@/lib/reports/reporteTecnico'
import { CATEGORIA_META, MONEDA_SIMBOLO, aSoles, type EstadoGasto } from '@/lib/engine/gastoAmbiental'
import type { ResumenODS } from '@/lib/engine/ods'
import { ESTADO_LABEL, NOTA_ODS } from '@/lib/engine/ods'

export type EntradaPaquete = {
  empresa: string
  campania: string
  periodo: { desde: string; hasta: string; cerrado: boolean }
  huella: HuellaConsolidada
  fuentes: FuenteDatos[]
  gasto: EstadoGasto
  ods: ResumenODS | null
  /** Quién genera el paquete — queda impreso como responsable del envío. */
  responsable: string
}

type Fila = (string | number | null)[]

const SIN_DATO = 'sin dato'

const fecha = () =>
  new Date().toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

/** Estado legible de una línea, incluyendo si pasó por mano humana. */
function estadoLinea(l: LineaClasificada): string {
  if (l.estado === 'ignorado') return 'Excluida'
  if (l.confirmado && l.corregido) return 'Corregida y confirmada'
  if (l.corregido) return 'Corregida (sin confirmar)'
  if (l.confirmado) return 'Confirmada'
  return 'Automática'
}

const etiquetaFactor = (clave: string | null) =>
  CATALOGO_FACTORES.find((f) => f.clave === clave)?.label ?? SIN_DATO

// ============================================================
// Construcción de las hojas
// ============================================================

function hojaPortada(e: EntradaPaquete): Fila[] {
  const totalLineas = e.fuentes.reduce((n, f) => n + (f.lineas?.length ?? 0), 0)
  const excluidas = e.fuentes.reduce(
    (n, f) => n + (f.lineas ?? []).filter((l) => l.estado === 'ignorado').length, 0,
  )
  const corregidas = e.fuentes.reduce(
    (n, f) => n + (f.lineas ?? []).filter((l) => l.corregido).length, 0,
  )

  return [
    ['PAQUETE DE VERIFICACIÓN — HUELLA DE CARBONO'],
    [],
    ['Empresa', e.empresa],
    ['Campaña', e.campania],
    ['Periodo de captura', `${e.periodo.desde} a ${e.periodo.hasta}`],
    ['Periodo cerrado', e.periodo.cerrado ? 'Sí' : 'No — ventana parcial'],
    ['Nivel de validez', NIVEL_VALIDEZ.badge],
    ['Generado', fecha()],
    ['Responsable del envío', e.responsable || SIN_DATO],
    [],
    ['RESULTADO DEL INVENTARIO'],
    ['Huella total (tCO₂e)', e.huella.huellaTotalTon],
    ['Alcance 1 (tCO₂e)', e.huella.scopes.s1],
    ['Alcance 2 (tCO₂e)', e.huella.scopes.s2],
    ['Alcance 3 (tCO₂e)', e.huella.scopes.s3],
    ['Kilos exportados', e.huella.kilosExportados || SIN_DATO],
    ['Intensidad (kgCO₂e/kg)', e.huella.intensidadKgPorKg || SIN_DATO],
    [],
    ['ALCANCE DE LA MUESTRA'],
    ['Fuentes vinculadas', e.fuentes.length],
    ['Fuentes en error (no suman)', e.huella.archivosConError.length],
    ['Líneas procesadas', totalLineas],
    ['Líneas excluidas del cálculo', excluidas],
    ['Líneas con corrección manual', corregidas],
    [],
    ['CÓMO LEER ESTE ARCHIVO'],
    ['1. Fuentes', 'Inventario de archivos de origen, con su identidad y estado.'],
    ['2. Detalle línea a línea', 'Cadena completa: archivo → hoja → fila → factor → emisión.'],
    ['3. Líneas excluidas', 'Todo lo que NO entró al cálculo, con el motivo. Empezar la revisión aquí.'],
    ['4. Correcciones manuales', 'Dónde un usuario sobreescribió la asignación automática.'],
    ['5. Factores aplicados', 'Catálogo con fuente y versión de cada factor.'],
    ['6. Gasto ambiental', 'Inversión monetaria del periodo, con su documento de respaldo.'],
    ['7. ODS', 'Indicadores con dato cuantificado. No es declaración de cumplimiento.'],
    [],
    ['NOTA SOBRE EL NIVEL DE VALIDEZ'],
    [NIVEL_VALIDEZ.nota],
  ]
}

function hojaFuentes(e: EntradaPaquete): Fila[] {
  const filas: Fila[] = [[
    'ID', 'Área', 'Archivo', 'Origen', 'Estado', 'Actualizado',
    'Identidad del archivo', 'Hojas recorridas', 'Líneas leídas', 'Líneas excluidas',
    'Emisión (kgCO₂e)', 'Motivo de error',
  ]]
  for (const f of e.fuentes) {
    filas.push([
      f.id,
      f.area,
      f.archivo,
      f.origen ?? SIN_DATO,
      f.estado,
      f.actualizado,
      f.huella ?? 'set de demostración',
      (f.hojas ?? []).join(' · ') || SIN_DATO,
      f.resumen?.leidas ?? 0,
      f.resumen?.ignoradas ?? 0,
      f.resumen?.emisionKg ?? 0,
      f.motivoError ?? '',
    ])
  }
  return filas
}

function hojaDetalle(e: EntradaPaquete): Fila[] {
  const filas: Fila[] = [[
    'Archivo', 'Hoja', 'Fila', 'Campo leído', 'Valor', 'Unidad',
    'Estado', 'Alcance', 'Factor aplicado', 'Valor del factor', 'Unidad del factor',
    'Fuente del factor', 'Versión del factor', 'Mecanismo', 'Emisión (kgCO₂e)',
  ]]
  for (const f of e.fuentes) {
    for (const l of f.lineas ?? []) {
      if (l.estado === 'ignorado') continue
      filas.push([
        f.archivo, l.hoja, l.fila, l.campoLeido, l.valor, l.unidad,
        estadoLinea(l),
        l.scopeAsignado ?? SIN_DATO,
        etiquetaFactor(l.factorAsignado),
        l.factorValor, l.factorUnidad ?? SIN_DATO,
        l.factorFuente ?? SIN_DATO, l.factorVersion ?? SIN_DATO,
        l.mecanismo ? MECANISMO_META[l.mecanismo].label : SIN_DATO,
        l.emisionKg,
      ])
    }
  }
  if (filas.length === 1) filas.push(['Sin líneas leídas: ninguna fuente aporta detalle línea a línea.'])
  return filas
}

function hojaExcluidas(e: EntradaPaquete): Fila[] {
  const filas: Fila[] = [[
    'Archivo', 'Hoja', 'Fila', 'Campo leído', 'Valor', 'Unidad',
    'Motivo de exclusión', 'Celda oculta',
  ]]
  for (const f of e.fuentes) {
    for (const l of f.lineas ?? []) {
      if (l.estado !== 'ignorado') continue
      filas.push([
        f.archivo, l.hoja, l.fila, l.campoLeido,
        l.valor, l.unidad,
        l.motivoIgnorado ?? SIN_DATO,
        l.oculto ? 'Sí' : 'No',
      ])
    }
  }
  if (filas.length === 1) {
    filas.push(['Ninguna línea fue excluida: todo lo leído entró al cálculo.'])
  }
  return filas
}

function hojaCorrecciones(e: EntradaPaquete): Fila[] {
  const filas: Fila[] = [[
    'Archivo', 'Hoja', 'Fila', 'Campo leído',
    'Alcance automático', 'Alcance final',
    'Factor automático', 'Factor final',
    'Emisión automática (kgCO₂e)', 'Emisión final (kgCO₂e)',
    'Diferencia (kgCO₂e)', 'Confirmada por el usuario',
  ]]
  for (const f of e.fuentes) {
    for (const l of f.lineas ?? []) {
      if (!l.corregido) continue
      const antes = l.original.emisionKg ?? 0
      const ahora = l.emisionKg ?? 0
      filas.push([
        f.archivo, l.hoja, l.fila, l.campoLeido,
        l.original.scopeAsignado ?? SIN_DATO,
        l.scopeAsignado ?? SIN_DATO,
        etiquetaFactor(l.original.factorAsignado),
        etiquetaFactor(l.factorAsignado),
        l.original.emisionKg,
        l.emisionKg,
        +(ahora - antes).toFixed(3),
        l.confirmado ? 'Sí' : 'No',
      ])
    }
  }
  if (filas.length === 1) {
    filas.push(['Sin correcciones manuales: toda la asignación es automática y reproducible.'])
  }
  return filas
}

function hojaFactores(): Fila[] {
  const filas: Fila[] = [[
    'Factor', 'Valor', 'Unidad', 'Alcance', 'Mecanismo', 'Fuente', 'Versión',
  ]]
  for (const f of CATALOGO_FACTORES) {
    filas.push([
      f.label, f.valor, f.unidad, f.scope,
      MECANISMO_META[f.mecanismo].label, f.fuente, f.version,
    ])
  }
  return filas
}

function hojaGasto(e: EntradaPaquete): Fila[] {
  const filas: Fila[] = [[
    'Fecha', 'Categoría', 'Concepto', 'Proveedor',
    'Monto', 'Moneda', 'Monto en soles', 'Documento de respaldo',
  ]]
  for (const p of e.gasto.partidas) {
    filas.push([
      p.fecha,
      CATEGORIA_META[p.categoria].label,
      p.concepto,
      p.proveedor || SIN_DATO,
      p.monto,
      MONEDA_SIMBOLO[p.moneda],
      +aSoles(p, e.gasto.tipoCambio).toFixed(2),
      p.respaldo || 'SIN RESPALDO DECLARADO',
    ])
  }
  if (filas.length === 1) {
    filas.push(['Sin partidas de gasto ambiental registradas en el periodo.'])
  }
  filas.push([])
  filas.push(['Tipo de cambio declarado (S/ por US$)', e.gasto.tipoCambio])
  filas.push(['Nota', 'El tipo de cambio lo declara la empresa. Se imprime para que el total sea reproducible.'])
  return filas
}

function hojaODS(e: EntradaPaquete): Fila[] {
  const filas: Fila[] = [['ODS', 'Objetivo', 'Meta', 'Indicador', 'Estado', 'Dato que lo sustenta']]
  if (!e.ods) {
    filas.push(['Módulo de ODS sin datos.'])
    return filas
  }
  for (const o of e.ods.objetivos) {
    for (const i of o.indicadores) {
      filas.push([
        o.objetivo.numero, o.objetivo.titulo, i.meta, i.descripcion,
        ESTADO_LABEL[i.estado], i.dato ?? SIN_DATO,
      ])
    }
  }
  filas.push([])
  filas.push(['ADVERTENCIA', NOTA_ODS])
  return filas
}

// ============================================================
// Generación del archivo
// ============================================================

/** Ancho de columna aproximado, para que el auditor no tenga que ajustar. */
function anchos(filas: Fila[]): { wch: number }[] {
  const n = Math.max(...filas.map((f) => f.length), 1)
  const out: { wch: number }[] = []
  for (let c = 0; c < n; c++) {
    let max = 10
    for (const f of filas) {
      const v = f[c]
      if (v === null || v === undefined) continue
      max = Math.max(max, Math.min(String(v).length + 2, 60))
    }
    out.push({ wch: max })
  }
  return out
}

export async function generarPaqueteVerificacion(e: EntradaPaquete): Promise<void> {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()

  const hojas: { nombre: string; filas: Fila[] }[] = [
    { nombre: '1. Portada', filas: hojaPortada(e) },
    { nombre: '2. Fuentes', filas: hojaFuentes(e) },
    { nombre: '3. Detalle línea a línea', filas: hojaDetalle(e) },
    { nombre: '4. Líneas excluidas', filas: hojaExcluidas(e) },
    { nombre: '5. Correcciones manuales', filas: hojaCorrecciones(e) },
    { nombre: '6. Factores aplicados', filas: hojaFactores() },
    { nombre: '7. Gasto ambiental', filas: hojaGasto(e) },
    { nombre: '8. ODS', filas: hojaODS(e) },
  ]

  for (const h of hojas) {
    const ws = XLSX.utils.aoa_to_sheet(h.filas)
    ws['!cols'] = anchos(h.filas)
    // Excel corta los nombres de hoja en 31 caracteres.
    XLSX.utils.book_append_sheet(wb, ws, h.nombre.slice(0, 31))
  }

  const limpio = e.empresa.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_')
  XLSX.writeFile(wb, `Paquete_Verificacion_${limpio}_${e.campania}.xlsx`)
}
