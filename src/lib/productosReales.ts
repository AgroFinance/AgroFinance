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

export type ProductoReal = {
  id: string
  nombre: string
  emisionTon: number
  pct: number // % del total agregado de fuentes con producto asignado
  scope: { s1: number; s2: number; s3: number } // % de este producto, no del total
  archivos: string[]
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

export function construirProductosReales(fuentes: FuenteDatos[]): ProductoReal[] {
  const activas = fuentesRealesActivas(fuentes)
  const grupos = new Map<string, { emisionKg: number; s1: number; s2: number; s3: number; archivos: Set<string> }>()

  for (const f of activas) {
    const nombre = f.producto?.trim() || SIN_ASIGNAR
    const actual = grupos.get(nombre) ?? { emisionKg: 0, s1: 0, s2: 0, s3: 0, archivos: new Set<string>() }
    actual.emisionKg += f.resumen!.emisionKg
    actual.s1 += f.resumen!.scopes.s1
    actual.s2 += f.resumen!.scopes.s2
    actual.s3 += f.resumen!.scopes.s3
    actual.archivos.add(f.archivo)
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
      return {
        id: nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        nombre,
        emisionTon: +(g.emisionKg / 1000).toFixed(3),
        pct: totalKg > 0 ? Math.round((g.emisionKg / totalKg) * 100) : 0,
        scope: { s1: pp(g.s1), s2: pp(g.s2), s3: pp(g.s3) },
        archivos: [...g.archivos],
      }
    })
}
