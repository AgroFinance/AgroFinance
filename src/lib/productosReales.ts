// ============================================================
// AgroFinance — Desglose por producto sobre datos REALES del usuario
// ------------------------------------------------------------
// A propósito NO reutiliza el tipo `Producto` de analyticsData.ts: ese tipo
// trae benchmark, límite Tesco y tendencia interanual — datos que solo
// existen para los 2 cultivos fijos de la demo (Palta Hass / Mango Kent),
// tomados de tablas fijas (BENCHMARK, LIMITE_TESCO) indexadas por ese
// nombre exacto. Un cultivo real que el usuario escriba ("Uva Red Globe",
// "Arándano"...) no tiene esa fila — inventar un benchmark o mostrar cero
// como si aplicara sería mentirle al usuario, justo lo que el resto del
// motor evita en todos lados ("nunca se disfraza de éxito").
//
// Este módulo solo agrega lo que SÍ se puede derivar honestamente de las
// líneas ya clasificadas por ghgClassify: cuánto tCO2e le corresponde a
// cada producto, y de qué scope. Sin comparación de mercado.
// ============================================================

import type { FuenteDatos } from './datosPrueba'
import { MECANISMO_META, MECANISMOS, type Mecanismo } from './emissionFactors'

export type ProductoReal = {
  id: string
  nombre: string
  emisionTon: number
  pct: number // % del total agregado de fuentes con producto asignado
  scope: { s1: number; s2: number; s3: number } // % de este producto, no del total
  archivos: string[]
  /** Mecanismo con más peso DENTRO de este producto (no del total general)
   *  — la pregunta que de verdad le importa a un agroexportador por
   *  cultivo: "en Cacao, ¿reduzco diésel o fertilizante primero?". null si
   *  el grupo no tiene ningún mecanismo reconocido (archivos 100% "sin
   *  dato"). */
  mecanismoTop: { label: string; pct: number } | null
}

const SIN_ASIGNAR = 'Sin producto asignado'

/** Fuentes reales (no demo) que aportan al cálculo: sincronizadas y con
 *  resumen calculado — mismo criterio que consolidar() en huellaConsolidada.ts. */
function fuentesRealesActivas(fuentes: FuenteDatos[]): FuenteDatos[] {
  return fuentes.filter((f) => !f.isDemo && f.estado !== 'error' && f.resumen)
}

/** true si al menos una fuente real tiene un producto asignado — así
 *  /analisis sabe si mostrar esta vista o el mensaje de "etiqueta tus
 *  fuentes en Configuración". */
export function hayProductoAsignado(fuentes: FuenteDatos[]): boolean {
  return fuentesRealesActivas(fuentes).some((f) => f.producto?.trim())
}

function agrupar(activas: FuenteDatos[], clave: (f: FuenteDatos) => string): ProductoReal[] {
  const grupos = new Map<string, {
    emisionKg: number; s1: number; s2: number; s3: number; archivos: Set<string>
    porMecanismo: Partial<Record<Mecanismo, number>>
  }>()

  for (const f of activas) {
    const nombre = clave(f)
    const actual = grupos.get(nombre) ?? { emisionKg: 0, s1: 0, s2: 0, s3: 0, archivos: new Set<string>(), porMecanismo: {} }
    actual.emisionKg += f.resumen!.emisionKg
    actual.s1 += f.resumen!.scopes.s1
    actual.s2 += f.resumen!.scopes.s2
    actual.s3 += f.resumen!.scopes.s3
    actual.archivos.add(f.archivo)
    for (const m of MECANISMOS) {
      const kg = f.resumen!.porMecanismo[m]
      if (kg === undefined) continue
      actual.porMecanismo[m] = (actual.porMecanismo[m] ?? 0) + kg
    }
    grupos.set(nombre, actual)
  }

  const totalKg = [...grupos.values()].reduce((s, g) => s + g.emisionKg, 0)

  return [...grupos.entries()]
    // "Sin producto asignado" siempre al final (es el cajón de lo no
    // etiquetado, no un producto real que compita en el ranking); el resto
    // ordenado por emisión descendente.
    .sort(([a, ga], [b, gb]) => {
      if (a === SIN_ASIGNAR) return 1
      if (b === SIN_ASIGNAR) return -1
      return gb.emisionKg - ga.emisionKg
    })
    .map(([nombre, g]) => {
      const totalScope = g.s1 + g.s2 + g.s3
      const pp = (v: number) => (totalScope > 0 ? Math.round((v / totalScope) * 100) : 0)
      const mecanismos = Object.entries(g.porMecanismo) as [Mecanismo, number][]
      const top = mecanismos.sort((a, b) => b[1] - a[1])[0]
      const mecanismoTop = top && g.emisionKg > 0
        ? { label: MECANISMO_META[top[0]].label, pct: Math.round((top[1] / g.emisionKg) * 100) }
        : null
      return {
        id: nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        nombre,
        emisionTon: +(g.emisionKg / 1000).toFixed(3),
        pct: totalKg > 0 ? Math.round((g.emisionKg / totalKg) * 100) : 0,
        scope: { s1: pp(g.s1), s2: pp(g.s2), s3: pp(g.s3) },
        archivos: [...g.archivos],
        mecanismoTop,
      }
    })
}

export function construirProductosReales(fuentes: FuenteDatos[]): ProductoReal[] {
  return agrupar(fuentesRealesActivas(fuentes), (f) => f.producto?.trim() || SIN_ASIGNAR)
}

// Fallback para cuando todavía nadie asignó producto a ningún archivo: en
// vez de una pantalla vacía con solo un mensaje, se agrupa por área
// operativa (Producción/Riego/Finanzas/Logística) — un dato que SIEMPRE
// existe (se asigna solo al procesar el archivo, no requiere que la
// persona haga nada) — así "Por producto" siempre muestra algo útil desde
// el primer archivo cargado, y el CTA para afinar por cultivo queda como
// mejora incremental, no como bloqueo.
export function construirPorArea(fuentes: FuenteDatos[]): ProductoReal[] {
  return agrupar(fuentesRealesActivas(fuentes), (f) => f.area || SIN_ASIGNAR)
}
