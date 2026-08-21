'use client'

// ============================================================
// AgroFinance — Contexto vivo de la plataforma para Kapi
// ------------------------------------------------------------
// Antes el asistente recibía un bloque fijo de ocho líneas armado a mano,
// con tres problemas graves:
//
//   1. Leía `cooperativa` (la constante con TODAS las fuentes demo activas)
//      en vez del store consolidado. Si el usuario desvinculaba un archivo,
//      el panel bajaba el número y Kapi seguía citando el original.
//   2. Traía valores escritos a mano —benchmark 0,65; huella hídrica
//      1,42 m³/kg; ahorro US$ 99.625— que ya no coincidían con los módulos
//      que los calculan de verdad.
//   3. No veía nada fuera de la huella: ni gasto ambiental, ni ODS, ni
//      auditorías, ni el estado de las fuentes. Preguntarle "¿cuánto
//      invertí en monitoreos?" era imposible aunque el dato existiera.
//
// Por qué un snapshot y no function calling: el estado completo de la
// plataforma son unos pocos KB (dos productos, ocho acciones, seis ODS,
// cinco esquemas, un puñado de fuentes). Cabe entero en el prompt. Las
// herramientas se justifican cuando el dato no cabe o cuando el modelo debe
// EJECUTAR algo; acá solo tiene que leer, y añadir round-trips agregaría
// latencia y modos de fallo sin ganar nada.
//
// Regla de oro del bloque: lo que no está medido se declara "sin dato",
// nunca se omite en silencio. Un hueco invisible invita al modelo a
// rellenarlo.
// ============================================================

import type { HuellaConsolidada } from '@/modules/carbon-accounting/domain/huellaConsolidada'
import type { FuenteDatos } from '@/modules/data-loader/domain/datosPrueba'
import type { Producto } from '@/modules/carbon-accounting/domain/analyticsData'
import type { ResumenGasto } from '@/modules/water-and-esg/domain/gastoAmbiental'
import type { ResumenODS } from '@/modules/water-and-esg/domain/ods'
import type { ResumenEsquema } from '@/modules/water-and-esg/domain/inocuidad'
import type { HuellaHidrica } from '@/modules/water-and-esg/domain/huellaHidrica'
import type { AccionReduccion } from '@/modules/green-financing/domain/reduccionActions'
import type { Certificacion } from '@/modules/carbon-accounting/domain/certification'
import { MECANISMO_META, type Mecanismo } from '@/modules/carbon-accounting/domain/emissionFactors'
import { referenciaDe, deviationVsBenchmark, ALCANCES, type AlcanceBenchmark } from '@/modules/carbon-accounting/domain/benchmarks'
import { reduccionTon } from '@/modules/green-financing/domain/reduccionActions'
import { CATEGORIA_META } from '@/modules/water-and-esg/domain/gastoAmbiental'
import { ESTADO_LABEL } from '@/modules/water-and-esg/domain/ods'

export type EstadoPlataforma = {
  huella: HuellaConsolidada
  fuentes: FuenteDatos[]
  productos: Producto[]
  gasto: ResumenGasto | null
  ods: ResumenODS | null
  inocuidad: ResumenEsquema[] | null
  hidrica: HuellaHidrica | null
  acciones: AccionReduccion[] | null
  certificacion: Certificacion | null
  /** Alcance de benchmark elegido por el usuario, si lo hay. */
  alcanceBenchmark?: AlcanceBenchmark
}

const n = (v: number, d = 2) => v.toLocaleString('es-PE', { minimumFractionDigits: d, maximumFractionDigits: d })
const SIN = 'sin dato'

// ============================================================
// Bloques
// ============================================================

function bloqueHuella(h: HuellaConsolidada): string {
  if (!h.tieneDatos) {
    return [
      'INVENTARIO DE CARBONO: sin datos.',
      'No hay ninguna fuente vinculada que aporte emisiones. Toda cifra de huella es "sin dato".',
    ].join('\n')
  }
  const mecanismos = (Object.keys(h.desgloseMecanismo) as Mecanismo[])
    .map((m) => ({ m, kg: h.desgloseMecanismo[m] }))
    .filter((x) => x.kg !== null && x.kg > 0)
    .sort((a, b) => (b.kg ?? 0) - (a.kg ?? 0))
    .map((x) => {
      const pct = h.huellaTotalTon > 0 ? ((x.kg ?? 0) / (h.huellaTotalTon * 1000)) * 100 : 0
      return `  - ${MECANISMO_META[x.m].label}: ${n((x.kg ?? 0) / 1000, 2)} tCO2e (${pct.toFixed(1)}%)`
    })

  return [
    'INVENTARIO DE CARBONO (fuente unica de verdad, igual que el panel):',
    `- Huella total: ${n(h.huellaTotalTon, 2)} tCO2e`,
    `- Alcance 1 (directas): ${n(h.scopes.s1, 2)} tCO2e`,
    `- Alcance 2 (electricidad): ${n(h.scopes.s2, 2)} tCO2e`,
    `- Alcance 3 (cadena de valor): ${n(h.scopes.s3, 2)} tCO2e`,
    `- Kilos exportados: ${h.kilosExportados > 0 ? h.kilosExportados.toLocaleString('es-PE') + ' kg' : SIN}`,
    `- Intensidad: ${h.intensidadKgPorKg > 0 ? n(h.intensidadKgPorKg, 4) + ' kgCO2e/kg' : SIN}`,
    `- Mayor foco de emision: ${h.hotspot.label || SIN} (${h.hotspot.pct}%)`,
    `- Aporte de archivos del usuario: ${n(h.aporteUsuarioTon, 2)} tCO2e`,
    'Desglose por mecanismo:',
    ...(mecanismos.length ? mecanismos : ['  - sin desglose disponible']),
  ].join('\n')
}

function bloqueProductos(productos: Producto[], alcance: AlcanceBenchmark): string {
  if (!productos.length) return 'PRODUCTOS: sin dato.'
  const nombreAlcance = ALCANCES.find((a) => a.id === alcance)?.label ?? alcance
  const filas = productos.map((p) => {
    const ref = referenciaDe(p.nombre, alcance)
    const d = deviationVsBenchmark(p.intensidad || null, ref.valor)
    return [
      `- ${p.nombre}:`,
      `  intensidad ${n(p.intensidad, 3)} kgCO2e/kg`,
      `| exportado ${p.kilosExportados.toLocaleString('es-PE')} kg`,
      `| huella ${n(p.huellaTotal, 2)} tCO2e`,
      `| referencia ${nombreAlcance}: ${ref.valor === null ? SIN : n(ref.valor, 3)}`,
      `| desvio: ${d.texto}`,
      `| variacion vs campana anterior: ${p.deltaPct > 0 ? '+' : ''}${p.deltaPct}%`,
    ].join(' ')
  })
  return ['PRODUCTOS (intensidad por kg, cradle-to-gate):', ...filas].join('\n')
}

function bloqueFuentes(fuentes: FuenteDatos[], h: HuellaConsolidada): string {
  if (!fuentes.length) return 'FUENTES DE DATOS: ninguna vinculada.'
  const filas = fuentes.map((f) => {
    const r = f.resumen
    const detalle = r ? `${r.leidas} lineas leidas, ${r.ignoradas} excluidas` : 'sin detalle linea a linea'
    const err = f.estado === 'error' && f.motivoError ? ` | motivo: ${f.motivoError}` : ''
    return `- [${f.area}] ${f.archivo} | estado: ${f.estado} | ${detalle}${err}`
  })
  const corregidas = fuentes.reduce(
    (acc, f) => acc + (f.lineas ?? []).filter((l) => l.corregido).length, 0,
  )
  return [
    'FUENTES DE DATOS VINCULADAS:',
    ...filas,
    `Archivos en error (no suman al total): ${h.archivosConError.length}`,
    `Lineas con correccion manual del mapeo: ${corregidas}`,
  ].join('\n')
}

function bloqueAgua(hidrica: HuellaHidrica | null): string {
  if (!hidrica || !hidrica.tieneDatos) {
    return 'HUELLA HIDRICA: sin dato. Ningun archivo vinculado declara consumo de agua.'
  }
  return [
    'HUELLA HIDRICA (calculada de los archivos, no estimada):',
    `- Consumo total: ${hidrica.m3Total?.toLocaleString('es-PE') ?? SIN} m3`,
    `- Intensidad: ${hidrica.intensidad === null ? SIN : n(hidrica.intensidad, 4) + ' m3/kg'}`,
    `- Riego: ${n(hidrica.porMecanismo.riego, 0)} m3 | Packing: ${n(hidrica.porMecanismo.packing, 0)} m3`,
  ].join('\n')
}

function bloqueGasto(g: ResumenGasto | null): string {
  if (!g || !g.tieneDatos) {
    return 'GASTO AMBIENTAL: sin partidas registradas. NO significa que no hubo inversion: significa que no se ha cargado.'
  }
  const cats = g.porCategoria
    .filter((c) => c.partidas > 0)
    .map((c) => `  - ${CATEGORIA_META[c.categoria].label}: S/ ${n(c.totalPEN)} (${c.pct}%, ${c.partidas} partidas)`)
  return [
    'GASTO AMBIENTAL DEL PERIODO (indicador monetario):',
    `- Inversion total: S/ ${n(g.totalPEN)}`,
    `- Intensidad de inversion: ${g.solesPorTon === null ? SIN : 'S/ ' + n(g.solesPorTon) + ' por tCO2e'}`,
    `- Partidas: ${g.partidas} | sin documento de respaldo: ${g.sinRespaldo}`,
    `- Tipo de cambio declarado: S/ ${g.tipoCambio} por US$ 1`,
    ...(cats.length ? ['Por categoria:', ...cats] : []),
    ...(g.obligacionesSinGasto.length
      ? [`- Obligaciones legales recurrentes SIN partida este periodo: ${g.obligacionesSinGasto.join(', ')}`]
      : []),
  ].join('\n')
}

function bloqueODS(ods: ResumenODS | null): string {
  if (!ods || !ods.tieneDatos) return 'ODS: sin indicadores con dato cuantificado.'
  const filas = ods.objetivos.flatMap((o) =>
    o.indicadores.map(
      (i) => `  - ODS ${o.objetivo.numero} meta ${i.meta} (${i.descripcion}): ${ESTADO_LABEL[i.estado]}${i.dato ? ' — ' + i.dato : ''}`,
    ),
  )
  return [
    `ODS (evidencia cuantificada, NO declaracion de cumplimiento): ${ods.indicadoresConEvidencia} de ${ods.totalIndicadores} indicadores con dato.`,
    ...filas,
  ].join('\n')
}

function bloqueInocuidad(res: ResumenEsquema[] | null): string {
  if (!res || !res.length) return 'AUDITORIAS DE INOCUIDAD: sin datos.'
  const filas = res.map(
    (r) =>
      `  - ${r.esquema.nombre}: ${r.pctListo}% de evidencia lista (${r.listos} listas, ${r.enProceso} en curso, ${r.pendientes} sin evidencia, ${r.vencidos} vencidas)`,
  )
  return [
    'PREPARACION PARA AUDITORIAS (ISO 22000, FSSC 22000, BRC, BASC, SMETA).',
    'Es estado de preparacion declarado por la empresa, NO certificacion ni cumplimiento evaluado:',
    ...filas,
  ].join('\n')
}

function bloquePlan(acciones: AccionReduccion[] | null, huella: HuellaConsolidada): string {
  if (!acciones || !acciones.length) return 'PLAN DE REDUCCION: sin acciones.'
  const filas = acciones.slice(0, 8).map((a) => {
    const ton = reduccionTon(a, huella)
    const inv = a.inversionAnualUSD === null ? 'sin inversion' : `US$ ${a.inversionAnualUSD.toLocaleString('es-PE')}`
    return `  - [${a.categoria}] ${a.titulo}: -${n(ton, 1)} tCO2e/ano | ${inv} | ${a.periodo}`
  })
  return ['PLAN DE REDUCCION (acciones disponibles con su impacto real sobre el desglose):', ...filas].join('\n')
}

function bloqueCertificacion(c: Certificacion | null): string {
  if (!c) return 'CLASIFICACION: sin evaluar.'
  const faltan = c.brechaSiguiente.filter((x) => !x.cumple).map((x) => `${x.nombre} (requiere ${x.requerido}, tiene ${x.obtenido})`)
  return [
    `CLASIFICACION ACTUAL: nivel ${c.nivel} — ${c.etiqueta}. Indice de conformidad ${c.indiceConformidad}%.`,
    'IMPORTANTE: el inventario es AUTODECLARADO. No existe verificacion de tercero acreditado.',
    ...(faltan.length ? ['Para subir de nivel falta:', ...faltan.map((f) => `  - ${f}`)] : []),
  ].join('\n')
}

// ============================================================
// Ensamblado
// ============================================================

/**
 * Snapshot completo del estado de la plataforma, en texto compacto.
 * Es lo único que el modelo sabe: si un dato no está aquí, no existe
 * para Kapi, y el prompt se lo dice explícitamente.
 */
export function construirContextoPlataforma(e: EstadoPlataforma): string {
  const alcance: AlcanceBenchmark = e.alcanceBenchmark ?? 'eu'
  return [
    '===== ESTADO ACTUAL DE LA PLATAFORMA =====',
    bloqueHuella(e.huella),
    '',
    bloqueProductos(e.productos, alcance),
    '',
    bloqueFuentes(e.fuentes, e.huella),
    '',
    bloqueAgua(e.hidrica),
    '',
    bloqueGasto(e.gasto),
    '',
    bloqueODS(e.ods),
    '',
    bloqueInocuidad(e.inocuidad),
    '',
    bloquePlan(e.acciones, e.huella),
    '',
    bloqueCertificacion(e.certificacion),
    '===== FIN DEL ESTADO =====',
  ].join('\n')
}

/**
 * Reglas de uso del contexto. Van junto al snapshot porque sin ellas el
 * modelo rellena los huecos con cifras plausibles, que es el modo de fallo
 * más caro: una cifra inventada dicha con seguridad delante de un auditor.
 */
export const REGLAS_DATOS = [
  'REGLAS SOBRE LOS DATOS (obligatorias):',
  '1. Las unicas cifras que puedes dar son las del bloque ESTADO ACTUAL DE LA PLATAFORMA. No inventes ninguna otra, ni la estimes, ni la recuerdes de conversaciones anteriores.',
  '2. Si algo dice "sin dato", di que no esta cargado y explica en que pantalla se carga. No lo sustituyas por un valor tipico del sector.',
  '3. Nunca afirmes que el inventario esta verificado o certificado: es autodeclarado.',
  '4. Nunca digas que la empresa "cumple" un ODS o una norma de inocuidad. Habla de evidencia disponible y de lo que falta.',
  '5. Si te preguntan algo que el bloque no cubre, dilo con claridad en vez de aproximar.',
].join('\n')
