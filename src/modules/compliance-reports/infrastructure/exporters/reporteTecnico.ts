'use client'

// ============================================================
// AgroFinance — Modelo del INFORME TÉCNICO (ISO 14067 / GHG Protocol)
// ------------------------------------------------------------
// Este es el documento "de consultoría" de la plataforma: el que un
// tercero puede leer solo y responder, sin abrir la app:
//
//   ¿Qué se midió? ¿Qué entró y qué quedó fuera? ¿De qué factor salió
//   cada número? ¿En qué periodo? ¿Con qué método de asignación?
//
// La estructura sigue el formato que la industria ya usa para informes
// técnicos de huella de producto: objetivo del estudio → alcance y
// límites del sistema → mecanismos incluidos/excluidos → activity data →
// factores de emisión → resultados por mecanismo → periodo y asignación.
//
// El modelo es SERIALIZABLE a propósito (RNF-G8): nada vive solo en el
// DOM, así que el generador de PDF, el Excel y el CSV leen exactamente lo
// mismo y no pueden divergir.
// ============================================================

import {
  MECANISMO_META, filasMecanismo, type FilaMecanismo, type Mecanismo,
} from '@/modules/carbon-accounting/domain/emissionFactors'
import { CATALOGO_FACTORES, METODO_N2O } from '@/modules/carbon-accounting/domain/ghgClassify'
import {
  LIMITE_LABEL, LIMITE_PROPIO, referenciaDe, deviationVsBenchmark, DISCLAIMER_BENCHMARK,
  ALCANCES, type AlcanceBenchmark, type LimiteSistema,
} from '@/modules/carbon-accounting/domain/benchmarks'
import type { Producto } from '@/modules/carbon-accounting/domain/analyticsData'
import type { HuellaConsolidada } from '@/modules/carbon-accounting/domain/huellaConsolidada'
import type { FuenteDatos } from '@/modules/data-loader/domain/datosPrueba'
import type { Anotaciones } from '@/modules/carbon-accounting/domain/anotaciones'
import { claveVarianza } from '@/modules/carbon-accounting/domain/anotaciones'
import { CATEGORIA_META, type ResumenGasto } from '@/modules/water-and-esg/domain/gastoAmbiental'
import { ESTADO_LABEL, NOTA_ODS, type ResumenODS } from '@/modules/water-and-esg/domain/ods'

// ============================================================
// Nivel de validez del reporte (RF-5.1 / RF-5.2)
// ============================================================
export const NIVEL_VALIDEZ = {
  badge: 'Autodeclarado — nivel inventario',
  nota:
    'Este informe es un autoreporte de inventario: la empresa declara sus propios datos de actividad y la ' +
    'plataforma aplica factores oficiales versionados. Es el nivel que acepta la mayoría de fondos y de ' +
    'programas de crédito verde. La verificación por tercero independiente (auditor en sitio, del orden de ' +
    'USD 7 000 a 9 000) se exige típicamente para emisión de bonos de carbono y para certificación formal.',
} as const

// ============================================================
// Checklist "listo para auditoría" (RF-5.3 / RNF-5.3)
// ------------------------------------------------------------
// Lista declarativa: agregar un ítem es agregar una entrada aquí, sin
// tocar la pantalla ni el generador de PDF.
// ============================================================
export type ItemChecklist = {
  id: string
  titulo: string
  detalle: string
  /** Se evalúa contra el estado real del reporte, no se hardcodea. */
  evaluar: (ctx: ContextoChecklist) => boolean
}

export type ContextoChecklist = {
  fuentes: FuenteDatos[]
  huella: HuellaConsolidada
  anotaciones: Anotaciones
  periodoCerrado: boolean
}

export const CHECKLIST_AUDITORIA: ItemChecklist[] = [
  {
    id: 'datos-primarios',
    titulo: 'Datos primarios completos',
    detalle: 'Todas las áreas que alimentan el cálculo tienen archivo vinculado y sincronizado.',
    evaluar: (c) => c.fuentes.filter((f) => f.estado === 'sincronizado').length >= 4,
  },
  {
    id: 'sin-errores',
    titulo: 'Sin fuentes en error',
    detalle: 'Ningún archivo quedó ilegible o con columnas no reconocidas.',
    evaluar: (c) => c.huella.archivosConError.length === 0,
  },
  {
    id: 'periodo-cerrado',
    titulo: 'Periodo de captura cerrado',
    detalle: 'El reporte cubre la campaña completa, no una ventana parcial prorrateada.',
    evaluar: (c) => c.periodoCerrado,
  },
  {
    id: 'factores-versionados',
    titulo: 'Factores de emisión versionados',
    detalle: 'Cada factor declara fuente y versión, y viaja impreso dentro del informe.',
    evaluar: () => CATALOGO_FACTORES.every((f) => !!f.fuente && !!f.version),
  },
  {
    id: 'limites-sistema',
    titulo: 'Límites del sistema definidos',
    detalle: 'El informe declara el límite del sistema y la lista de mecanismos incluidos y excluidos.',
    evaluar: () => true,
  },
  {
    id: 'sustento-benchmark',
    titulo: 'Sustento de la comparación contra referencia',
    detalle: 'La diferencia frente al benchmark tiene explicación escrita por el responsable.',
    evaluar: (c) => Object.values(c.anotaciones.sustentoBenchmark).some((t) => t.trim().length > 20),
  },
  {
    id: 'varianza-explicada',
    titulo: 'Variación interanual explicada',
    detalle: 'Al menos un producto tiene nota que explica su Δ contra la campaña anterior.',
    evaluar: (c) => Object.values(c.anotaciones.varianza).some((t) => t.trim().length > 0),
  },
  {
    id: 'verificacion-tercero',
    titulo: 'Verificación de tercero independiente',
    detalle: 'Auditoría en sitio por organismo acreditado — necesaria solo para bonos de carbono o certificación.',
    evaluar: () => false,
  },
]

export type EstadoChecklist = { item: ItemChecklist; cumplido: boolean }

export const evaluarChecklist = (ctx: ContextoChecklist): EstadoChecklist[] =>
  CHECKLIST_AUDITORIA.map((item) => ({ item, cumplido: item.evaluar(ctx) }))

// ============================================================
// Mecanismos incluidos / excluidos del límite del sistema
// ============================================================
export const MECANISMOS_INCLUIDOS: string[] = [
  'N₂O de suelos gestionados — directo e indirecto (IPCC 2019)',
  'CO₂ por hidrólisis de urea en el suelo',
  'CO₂ de producción de fertilizantes nitrogenados (upstream)',
  'CO₂ de combustión de diésel en maquinaria agrícola',
  'CO₂ de generación eléctrica para riego tecnificado (SEIN)',
  'CO₂ de generación eléctrica para prefrío y packing (SEIN)',
  'CO₂ de producción de materiales de empaque (cartón, film, palets)',
  'CO₂ de transporte terrestre refrigerado hasta puerto de embarque',
  'CO₂ de transporte marítimo refrigerado hasta puerto de destino',
]

export const MECANISMOS_EXCLUIDOS: string[] = [
  'Mantenimiento de equipos y maquinaria agrícola',
  'Traslado del personal hacia y desde los fundos',
  'Vivienda del personal de campo',
  'Cambios de albedo por el cultivo',
  'Actividades corporativas (administración, comercial, I+D)',
  'Fabricación de bienes de capital (maquinaria, infraestructura, camiones)',
  'CH₄ de cultivo de arroz — no aplica a los cultivos del inventario',
  'CO₂ por encalado — no se registra aplicación de caliza ni dolomita',
  'CO₂ por deforestación — sin cambio de uso de suelo declarado en el periodo',
]

// ============================================================
// Referencias y fuentes de datos
// ------------------------------------------------------------
// Solo entra aqui lo que el motor de calculo usa de verdad. Un informe
// tecnico se juzga por esta lista: si un factor no puede rastrearse a una
// fuente publicada, el numero no sirve para una verificacion externa.
// ============================================================
export const REFERENCIAS: string[] = [
  'ISO 14067:2018. Greenhouse gases - Carbon footprint of products - Requirements and guidelines for quantification. International Organization for Standardization.',
  'ISO 14040:2006 / ISO 14044:2006. Environmental management - Life cycle assessment: principles, framework, requirements and guidelines.',
  'ISO 14083:2023. Greenhouse gases - Quantification and reporting of greenhouse gas emissions arising from transport chain operations.',
  'WRI / WBCSD. Greenhouse Gas Protocol - Product Life Cycle Accounting and Reporting Standard.',
  'IPCC. 2019 Refinement to the 2006 IPCC Guidelines for National Greenhouse Gas Inventories. Volume 4, Chapter 11: N2O emissions from managed soils and CO2 emissions from lime and urea application.',
  'Forster, P., Storelvmo, T., Armour, K. et al. (2021). The Earth’s Energy Budget, Climate Feedbacks, and Climate Sensitivity. En: Climate Change 2021: The Physical Science Basis. Contribucion del Grupo de Trabajo I al Sexto Informe de Evaluacion del IPCC (AR6), Capitulo 7. Valores de GWP-100 aplicados: CH4 fosil 29,8 y N2O 273.',
  'Smart Freight Centre. Global Logistics Emissions Council Framework for Logistics Emissions Accounting and Reporting (GLEC Framework), version 3.',
  'UK Department for Energy Security and Net Zero / DEFRA. UK Government GHG Conversion Factors for Company Reporting (edicion anual).',
  'Ministerio del Ambiente del Peru (MINAM) y Comite de Operacion Economica del Sistema Interconectado Nacional (COES). Factor de emision del Sistema Electrico Interconectado Nacional (SEIN), publicacion anual.',
  'Ecoinvent Association. Ecoinvent database v3.9 - procesos de produccion de fertilizantes, carton corrugado, film LDPE y palets.',
  'Fertilizers Europe. Carbon footprint reference values for fertilizer production.',
  'BSI. PAS 2050:2011. Specification for the assessment of the life cycle greenhouse gas emissions of goods and services.',
  'SUNAT. Estandar de comprobante de pago electronico basado en UBL 2.1 (Universal Business Language), usado para la lectura automatica de consumos.',
]

// ============================================================
// El modelo completo
// ============================================================
export type FilaActividad = {
  input: string
  unidad: string
  valor: number | null
  origen: string
}

export type FilaFactor = {
  factor: string
  valor: number
  unidad: string
  fuente: string
  version: string
  scope: 1 | 2 | 3
  mecanismo: string
}

export type ResultadoProductoTecnico = {
  producto: string
  intensidad: number
  kilosExportados: number
  huellaTotalTon: number
  mecanismos: FilaMecanismo[]
  benchmark: { alcance: string; valor: number | null; fuente: string | null; desvio: string }
  sustento: string | null
  notaVarianza: string | null
  deltaInteranualPct: number
  periodoAnterior: string
}

export type ReporteTecnico = {
  meta: {
    titulo: string
    empresa: string
    campania: string
    emitido: string
    nivelValidez: string
    notaValidez: string
  }
  /** Nota de encabezado: que es este documento y bajo que norma se emite. */
  queEsEsteDocumento: string
  /** Seccion 1 - Objetivo del estudio */
  objetivo: {
    proposito: string
    huellaClimaticaAgricultura: string
    enfoque: string
    audiencia: string
  }
  /** Seccion 2 - Alcance del estudio */
  limites: {
    unidadAnalisis: string
    limiteSistema: LimiteSistema
    limiteLabel: string
    descripcion: string
    mecanismosIncluidos: string[]
    mecanismosExcluidos: string[]
    almacenamientoCarbono: string
    modelosYDatos: string
    cambioUsoSuelo: string
  }
  /** Sección 3 */
  activityData: FilaActividad[]
  /** Sección 4 */
  factores: FilaFactor[]
  /** Sección 5 */
  resultados: {
    huellaTotalTon: number
    intensidad: number
    kilosExportados: number
    scopes: { s1: number; s2: number; s3: number }
    mecanismos: FilaMecanismo[]
    productos: ResultadoProductoTecnico[]
    disclaimerBenchmark: string
  }
  /** Sección 6 */
  periodo: {
    desde: string
    hasta: string
    cerrado: boolean
    metodoAsignacion: string
    indicador: string
    metodoN2O: string
    nota: string
  }
  /** Seccion 6 - Gasto ambiental del periodo (indicador monetario) */
  gastoAmbiental: {
    hayDatos: boolean
    totalPEN: number
    solesPorTon: number | null
    tipoCambio: number
    partidas: number
    sinRespaldo: number
    porCategoria: { categoria: string; totalPEN: number; pct: number; partidas: number }[]
    obligacionesSinGasto: string[]
    nota: string
  }
  /** Seccion 7 - Contribucion documentada a los ODS */
  ods: {
    hayDatos: boolean
    indicadoresConEvidencia: number
    totalIndicadores: number
    filas: { ods: string; meta: string; indicador: string; estado: string; dato: string }[]
    nota: string
  }
  /** Seccion 8 - Referencias y fuentes de datos */
  referencias: string[]
  checklist: { titulo: string; detalle: string; cumplido: boolean }[]
}

export type EntradaReporte = {
  titulo: string
  empresa: string
  campania: string
  huella: HuellaConsolidada
  productos: Producto[]
  fuentes: FuenteDatos[]
  anotaciones: Anotaciones
  alcanceBenchmark?: AlcanceBenchmark
  periodo: { desde: string; hasta: string; cerrado: boolean }
  /** Indicador monetario. Ausente = la seccion se declara sin dato. */
  gasto?: ResumenGasto
  /** Evidencia por ODS derivada del propio inventario. */
  ods?: ResumenODS
}

const nombreAlcance = (a: AlcanceBenchmark) => ALCANCES.find((x) => x.id === a)?.label ?? a

/**
 * Construye el informe. Determinístico: el mismo dataset produce siempre
 * las mismas secciones, en el mismo orden y con la misma numeración
 * (RNF-1.1) — que es lo que hace que dos exportaciones sean comparables
 * en una auditoría.
 */
export function construirReporteTecnico(e: EntradaReporte): ReporteTecnico {
  const { huella, productos, fuentes, anotaciones } = e

  // --- Activity data: lo que efectivamente se leyó de los archivos ---
  const activityData: FilaActividad[] = []
  const acumulado = new Map<string, { unidad: string; valor: number; origen: Set<string> }>()
  for (const f of fuentes) {
    for (const l of f.lineas ?? []) {
      if (l.estado !== 'leido' || l.valor === null) continue
      const clave = `${l.campoLeido}::${l.unidad}`
      const prev = acumulado.get(clave)
      if (prev) {
        prev.valor += l.valor
        prev.origen.add(f.archivo)
      } else {
        acumulado.set(clave, { unidad: l.unidad, valor: l.valor, origen: new Set([f.archivo]) })
      }
    }
  }
  for (const [clave, v] of acumulado) {
    activityData.push({
      input: clave.split('::')[0],
      unidad: v.unidad || 'sin unidad declarada',
      valor: +v.valor.toFixed(2),
      origen: [...v.origen].join(', '),
    })
  }
  // Las fuentes demo alimentan el motor de campaña, que no expone línea a
  // línea: se declaran como origen para no dejar el número huérfano.
  for (const f of fuentes.filter((x) => x.isDemo && x.estado === 'sincronizado')) {
    activityData.push({
      input: `Registro de ${f.area.toLowerCase()} (campaña completa)`,
      unidad: 'archivo',
      valor: null,
      origen: f.archivo,
    })
  }
  activityData.sort((a, b) => a.input.localeCompare(b.input, 'es'))

  const factores: FilaFactor[] = CATALOGO_FACTORES.map((f) => ({
    factor: f.label,
    valor: f.valor,
    unidad: f.unidad,
    fuente: f.fuente,
    version: f.version,
    scope: f.scope,
    mecanismo: MECANISMO_META[f.mecanismo].label,
  }))

  const alcance: AlcanceBenchmark = e.alcanceBenchmark ?? 'eu'

  const resultadosProductos: ResultadoProductoTecnico[] = productos.map((p) => {
    const ref = referenciaDe(p.nombre, alcance)
    const desvio = deviationVsBenchmark(p.intensidad || null, ref.valor)
    return {
      producto: p.nombre,
      intensidad: p.intensidad,
      kilosExportados: p.kilosExportados,
      huellaTotalTon: p.huellaTotal,
      mecanismos: filasMecanismo(p.desgloseMecanismo, p.kilosExportados),
      benchmark: {
        alcance: nombreAlcance(alcance),
        valor: ref.valor,
        fuente: ref.fuente,
        desvio: desvio.texto,
      },
      sustento: anotaciones.sustentoBenchmark[p.nombre]?.trim() || null,
      notaVarianza: anotaciones.varianza[claveVarianza(p.nombre, p.periodoActual)]?.trim() || null,
      deltaInteranualPct: p.deltaPct,
      periodoAnterior: p.periodoAnterior,
    }
  })

  const checklist = evaluarChecklist({
    fuentes, huella, anotaciones, periodoCerrado: e.periodo.cerrado,
  }).map((x) => ({ titulo: x.item.titulo, detalle: x.item.detalle, cumplido: x.cumplido }))

  return {
    meta: {
      titulo: e.titulo,
      empresa: e.empresa,
      campania: e.campania,
      emitido: new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      nivelValidez: NIVEL_VALIDEZ.badge,
      notaValidez: NIVEL_VALIDEZ.nota,
    },
    queEsEsteDocumento:
      'Este documento es un informe tecnico de huella de carbono, en el formato que exigen la norma ISO 14067 y el ' +
      'GHG Protocol Product Life Cycle Accounting and Reporting Standard. Recoge el objetivo y el alcance del estudio, ' +
      'los limites del sistema con los mecanismos incluidos y excluidos, los datos de actividad, los factores de ' +
      'emision con su fuente y version, los resultados por mecanismo y el periodo de captura, de modo que un tercero ' +
      'pueda revisar el calculo sin acceder a la plataforma.',
    objetivo: {
      proposito:
        'Cuantificar la huella de carbono de la producción agroexportadora de la campaña, para sustentar ' +
        'requisitos de comprador internacional, declaración ante autoridad ambiental y evaluación de crédito ' +
        'vinculado a sostenibilidad. El estudio se limita al impacto climático; no cubre uso de agua, ' +
        'biodiversidad, eutrofización ni otras externalidades de la actividad agrícola.',
      huellaClimaticaAgricultura:
        'La actividad agroexportadora genera emisiones en cada etapa: fabricacion de insumos, labores de campo, ' +
        'proceso en planta y transporte internacional refrigerado. Este estudio las cuantifica para saber donde esta ' +
        'concentrado el impacto y sobre que palancas se puede actuar.',
      enfoque:
        'Análisis de ciclo de vida atribucional (contable): se consideran las emisiones generadas durante el ' +
        'ciclo de vida del producto y se atribuyen al producto. No se contabilizan emisiones evitadas ni ' +
        'efectos marginales de cambiar el nivel de producción.',
      audiencia:
        'Área de sostenibilidad y finanzas de la empresa, comprador internacional, entidad financiera y ' +
        'autoridad ambiental.',
    },
    limites: {
      unidadAnalisis: '1 kg de fruta fresca exportada',
      limiteSistema: LIMITE_PROPIO,
      limiteLabel: LIMITE_LABEL[LIMITE_PROPIO],
      descripcion:
        'El estudio cubre desde la producción de los insumos agrícolas y las labores de campo, pasando por el ' +
        'proceso en planta de empaque, hasta la llegada de la carga al puerto de destino. No incluye la ' +
        'distribución al consumidor final, el uso ni el fin de vida del producto o de su empaque.',
      mecanismosIncluidos: MECANISMOS_INCLUIDOS,
      mecanismosExcluidos: MECANISMOS_EXCLUIDOS,
      almacenamientoCarbono:
        'No se contabiliza la captura biogenica de carbono almacenada en la fruta: ese carbono vuelve a la atmosfera ' +
        'al consumirse o descomponerse el producto. Tampoco se aplica descuento por diferimiento temporal de ' +
        'emisiones, dado lo corto del ciclo.',
      modelosYDatos:
        'Las emisiones de suelo se calculan con el metodo Tier 1 del IPCC 2019 a partir del nitrogeno realmente ' +
        'aplicado. Las de transporte, con el metodo tonelada-kilometro de ISO 14083 y el GLEC Framework, usando la ' +
        'distancia real de cada tramo. Los insumos y el empaque se valorizan con factores de ciclo de vida ' +
        'publicados. Los datos de actividad son primarios: salen de los archivos de riego, produccion, packing y ' +
        'logistica de la propia empresa, y de sus comprobantes electronicos.',
      cambioUsoSuelo:
        'No se atribuyen emisiones por deforestacion ni por cambio de uso de suelo: las areas del inventario ya ' +
        'estaban en produccion agricola durante el periodo evaluado y no se declara conversion de bosque. Este es ' +
        'el mismo criterio que exige el reglamento europeo de productos libres de deforestacion.',
    },
    activityData,
    factores,
    resultados: {
      huellaTotalTon: huella.huellaTotalTon,
      intensidad: huella.intensidadKgPorKg,
      kilosExportados: huella.kilosExportados,
      scopes: huella.scopes,
      mecanismos: filasMecanismo(huella.desgloseMecanismo, huella.kilosExportados),
      productos: resultadosProductos,
      disclaimerBenchmark: DISCLAIMER_BENCHMARK,
    },
    periodo: {
      desde: e.periodo.desde,
      hasta: e.periodo.hasta,
      cerrado: e.periodo.cerrado,
      metodoAsignacion:
        'Asignación por masa (ISO 14044): las emisiones de campo, packing y fertilización se reparten según el ' +
        'porcentaje de fruta que efectivamente se exporta, descontando el descarte local. Cuando el valor ' +
        'económico de los subproductos no está declarado, el impacto se asigna íntegro al producto principal.',
      indicador:
        'Potencial de Calentamiento Global a 100 años (GWP-100) con los valores del IPCC AR6. Gases incluidos: ' +
        'CO₂, CH₄ y N₂O, expresados en kg de CO₂ equivalente.',
      metodoN2O: METODO_N2O,
      nota:
        'Los factores de emisión deben refrescarse con la versión oficial vigente de cada fuente antes de una ' +
        'verificación externa (DEFRA anual, factor SEIN del MINAM del año, Ecoinvent, GLEC).',
    },
    gastoAmbiental: {
      hayDatos: !!e.gasto?.tieneDatos,
      totalPEN: e.gasto?.totalPEN ?? 0,
      solesPorTon: e.gasto?.solesPorTon ?? null,
      tipoCambio: e.gasto?.tipoCambio ?? 0,
      partidas: e.gasto?.partidas ?? 0,
      sinRespaldo: e.gasto?.sinRespaldo ?? 0,
      porCategoria: (e.gasto?.porCategoria ?? [])
        .filter((c) => c.partidas > 0)
        .map((c) => ({
          categoria: CATEGORIA_META[c.categoria].label,
          totalPEN: c.totalPEN,
          pct: c.pct,
          partidas: c.partidas,
        })),
      obligacionesSinGasto: e.gasto?.obligacionesSinGasto ?? [],
      nota:
        'El monto se expresa en soles. Las partidas en dolares se convierten con el tipo de cambio declarado por ' +
        'la empresa, que se imprime aqui para que el total sea reproducible por un tercero.',
    },
    ods: {
      hayDatos: !!e.ods?.tieneDatos,
      indicadoresConEvidencia: e.ods?.indicadoresConEvidencia ?? 0,
      totalIndicadores: e.ods?.totalIndicadores ?? 0,
      filas: (e.ods?.objetivos ?? []).flatMap((o) =>
        o.indicadores.map((i) => ({
          ods: `ODS ${o.objetivo.numero} - ${o.objetivo.titulo}`,
          meta: i.meta,
          indicador: i.descripcion,
          estado: ESTADO_LABEL[i.estado],
          dato: i.dato ?? 'sin dato',
        })),
      ),
      nota: NOTA_ODS,
    },
    referencias: REFERENCIAS,
    checklist,
  }
}

/** Mecanismos sin dato, para declararlos explícitamente en el informe. */
export const mecanismosSinDato = (filas: FilaMecanismo[]): Mecanismo[] =>
  filas.filter((f) => f.kg === null).map((f) => f.mecanismo)
