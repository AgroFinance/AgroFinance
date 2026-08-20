'use client'

// ============================================================
// AgroFinance — Huella hídrica y Certificado Azul (ANA)
// ------------------------------------------------------------
// Módulo paralelo al de carbono, no una copia: el agua no tiene "factor de
// emisión", tiene volumen (m³) y una pregunta distinta — ¿cuánta agua entra
// por kilo de fruta exportada, y a qué mecanismo se debe? Reutiliza los
// MISMOS archivos que ya sube el usuario para huella de carbono (las
// columnas de agua conviven en los mismos Excel de riego y packing) en vez
// de pedir una carga aparte: si un archivo trae "riego_agua_m3" o
// "agua_lavado_m3", ghgClassify la ignora por no tener factor de emisión,
// pero la columna sigue viva en `lineas` con su valor y su unidad — este
// módulo es el que la recoge.
//
// El Certificado Azul es un reconocimiento real de la Autoridad Nacional
// del Agua (ANA) del Perú a usuarios "hídricamente responsables" que
// participan del Programa Huella Hídrica. Sus requisitos publicados:
// licencia de uso de agua vigente, certificación ambiental (IGA) vigente,
// medición de la huella hídrica, un proyecto de reducción, y un programa de
// valor compartido en la cuenca — vigente por un año, sujeto a renovación.
// Fuente: certificadoazul.ana.gob.pe. La plataforma solo puede verificar
// por sí misma el ítem de medición; el resto son trámites que la empresa
// gestiona fuera de AgroFinance y se declaran "pendiente" hasta que el
// usuario los marque.
// ============================================================

import { useMemo } from 'react'
import { useFuentesDatos, type FuenteDatos } from './datosPrueba'
import { useHuellaConsolidada } from './huellaConsolidada'

export type MecanismoAgua = 'riego' | 'packing' | 'otro'

const REGLAS_AGUA: { mecanismo: MecanismoAgua; palabras: RegExp }[] = [
  { mecanismo: 'riego', palabras: /riego.*agua|agua.*riego|pozo|irrigac/i },
  { mecanismo: 'packing', palabras: /lavado|packing.*agua|agua.*packing|prefrio.*agua|desinfecc/i },
  { mecanismo: 'otro', palabras: /\bagua\b|hidric|h2o|consumo.*hidric/i },
]

const UNIDAD_M3 = /^(m3|m³|metros?[\s_]?cubicos?)$/i
const UNIDAD_LITROS = /^(l|lt|ltr|litros?)$/i

/** true si la columna es agua Y su unidad es volumétrica (m3 o litros). */
function reconocerAgua(campoLeido: string, unidad: string, archivo: string): MecanismoAgua | null {
  const uni = (unidad || '').trim().replace(/\./g, '')
  if (!UNIDAD_M3.test(uni) && !UNIDAD_LITROS.test(uni)) return null
  for (const r of REGLAS_AGUA) if (r.palabras.test(campoLeido || '')) return r.mecanismo
  // Columna volumétrica genérica ("volumen_m3", "consumo_m3") que no
  // deletrea "agua" en su propio nombre: si el archivo de origen sí es un
  // registro de riego/agua (p. ej. "bitacora_riego.csv"), el volumen real
  // sigue siendo agua — no se descarta el dato solo porque la columna no
  // lo dijo explícitamente.
  if (/riego|irrigac|agua|pozo|hidric/i.test(archivo || '')) return 'riego'
  return null
}

const aM3 = (valor: number, unidad: string) => (UNIDAD_LITROS.test((unidad || '').trim()) ? valor / 1000 : valor)

export type HuellaHidrica = {
  /** m³ totales leídos de los archivos vinculados. null = sin dato. */
  m3Total: number | null
  /** m³ por kilo de producto exportado. null = sin dato de volumen o de agua. */
  intensidad: number | null
  porMecanismo: Record<MecanismoAgua, number>
  /** Archivos de los que salió al menos una línea de agua reconocida. */
  archivosConDato: string[]
  tieneDatos: boolean
}

export const HIDRICA_VACIA: HuellaHidrica = {
  m3Total: null,
  intensidad: null,
  porMecanismo: { riego: 0, packing: 0, otro: 0 },
  archivosConDato: [],
  tieneDatos: false,
}

export function consolidarHidrica(fuentes: FuenteDatos[], kilosExportados: number): HuellaHidrica {
  const porMecanismo: Record<MecanismoAgua, number> = { riego: 0, packing: 0, otro: 0 }
  const archivos = new Set<string>()
  let m3Total = 0
  let huboDato = false

  for (const f of fuentes) {
    for (const l of f.lineas ?? []) {
      if (l.valor === null || l.oculto) continue
      const mecanismo = reconocerAgua(l.campoLeido, l.unidad, f.archivo)
      if (!mecanismo) continue
      const m3 = aM3(l.valor, l.unidad)
      porMecanismo[mecanismo] += m3
      m3Total += m3
      huboDato = true
      archivos.add(f.archivo)
    }
  }

  return {
    m3Total: huboDato ? +m3Total.toFixed(2) : null,
    intensidad: huboDato && kilosExportados > 0 ? +((m3Total * 1000) / kilosExportados).toFixed(4) : null,
    porMecanismo: {
      riego: +porMecanismo.riego.toFixed(2),
      packing: +porMecanismo.packing.toFixed(2),
      otro: +porMecanismo.otro.toFixed(2),
    },
    archivosConDato: [...archivos],
    tieneDatos: huboDato,
  }
}

export function useHuellaHidrica(): HuellaHidrica {
  const [fuentes] = useFuentesDatos()
  const { huella } = useHuellaConsolidada()
  return useMemo(() => consolidarHidrica(fuentes, huella.kilosExportados), [fuentes, huella.kilosExportados])
}

// ============================================================
// Checklist Certificado Azul — requisitos reales del programa de ANA
// ------------------------------------------------------------
// Solo el primero se evalúa contra dato real de la plataforma. Los demás
// son trámites y compromisos que la empresa gestiona con ANA directamente:
// se declaran "pendiente" por defecto y no se marcan cumplidos sin que el
// usuario lo confirme explícitamente (aún no hay UI de confirmación manual
// — queda declarado como próximo paso, no fingido como resuelto).
// ============================================================
export type ItemCertificadoAzul = {
  id: string
  titulo: string
  detalle: string
  cumplido: boolean
  gestionExterna: boolean
}

export function checklistCertificadoAzul(hidrica: HuellaHidrica): ItemCertificadoAzul[] {
  return [
    {
      id: 'medicion',
      titulo: 'Medición de la huella hídrica',
      detalle: 'Volumen de agua consumido por mecanismo (riego, packing) leído de archivos vinculados.',
      cumplido: hidrica.tieneDatos,
      gestionExterna: false,
    },
    {
      id: 'licencia-agua',
      titulo: 'Licencia de uso de agua vigente',
      detalle: 'Trámite ante la Autoridad Nacional del Agua (ANA) o la Autoridad Administrativa del Agua local. Se gestiona fuera de la plataforma.',
      cumplido: false,
      gestionExterna: true,
    },
    {
      id: 'certificacion-ambiental',
      titulo: 'Certificación ambiental (IGA) vigente',
      detalle: 'Instrumento de Gestión Ambiental aprobado para la unidad productiva. Ver checklist de cumplimiento normativo.',
      cumplido: false,
      gestionExterna: true,
    },
    {
      id: 'proyecto-reduccion',
      titulo: 'Proyecto de reducción de huella hídrica',
      detalle: 'Compromiso formal de reducción presentado al Programa Huella Hídrica de ANA.',
      cumplido: false,
      gestionExterna: true,
    },
    {
      id: 'valor-compartido',
      titulo: 'Programa de valor compartido en la cuenca',
      detalle: 'Acción de responsabilidad social en la gestión del recurso hídrico de la cuenca donde opera la empresa.',
      cumplido: false,
      gestionExterna: true,
    },
  ]
}

export const NOTA_CERTIFICADO_AZUL =
  'El Certificado Azul es un reconocimiento anual (renovable) que otorga la Autoridad Nacional del Agua (ANA) a ' +
  'empresas hídricamente responsables que participan del Programa Huella Hídrica. AgroFinance mide el consumo y ' +
  'la intensidad hídrica a partir de tus archivos vinculados; la licencia de uso de agua, la certificación ' +
  'ambiental, el proyecto de reducción y el programa de valor compartido son trámites que se gestionan ' +
  'directamente con ANA.'
