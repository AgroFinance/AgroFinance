'use client'

// ============================================================
// AgroFinance — Descarga del informe técnico desde cualquier pantalla
// ------------------------------------------------------------
// El botón "Informe técnico PDF" de la barra superior está en todas las
// páginas, pero antes no generaba nada: caía en `window.print()`, que abre
// el diálogo de impresión del navegador y produce una captura de la
// pantalla — no un informe. En Análisis, además, descargaba un Excel pese
// a decir PDF.
//
// Este hook centraliza la generación para que el botón haga siempre lo
// mismo, con el mismo modelo de datos que usa la Biblioteca de Reportes.
// ============================================================

import { useCallback } from 'react'
import { useHuellaConsolidada } from '@/modules/carbon-accounting/domain/huellaConsolidada'
import { useAnotaciones } from '@/modules/carbon-accounting/domain/anotaciones'
import { construirProductos, empresa } from '@/modules/carbon-accounting/domain/analyticsData'
import { fuentesActivasDesde } from '@/modules/data-loader/domain/datosPrueba'
import { construirReporteTecnico } from '@/modules/compliance-reports/infrastructure/exporters/reporteTecnico'
import { generarInformeTecnico } from '@/modules/compliance-reports/infrastructure/exporters/pdfTecnico'
import { campanias } from '@/modules/carbon-accounting/domain/pilotEngine'
import type { AlcanceBenchmark } from '@/modules/carbon-accounting/domain/benchmarks'

// El periodo cubierto sale de las fechas reales de embarque, no del reloj
// del navegador: el inventario es de campaña, no de "hoy".
const fechasEnvios = campanias.flatMap((c) => c.envios.map((e) => e.fecha)).sort()

const fechaLegible = (iso: string) =>
  new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })

const nombreArchivo = (titulo: string) =>
  titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_')

export function useInformeTecnico() {
  const { huella, fuentes } = useHuellaConsolidada()
  const { anotaciones } = useAnotaciones()

  return useCallback(
    (titulo = 'Informe tecnico de huella de carbono') => {
      const productos = construirProductos(fuentesActivasDesde(fuentes))
      const reporte = construirReporteTecnico({
        titulo,
        empresa: empresa.nombre,
        campania: empresa.campania,
        huella,
        productos,
        fuentes,
        anotaciones,
        alcanceBenchmark: (anotaciones.alcanceBenchmark[productos[0]?.nombre] as AlcanceBenchmark) || 'eu',
        periodo: {
          desde: fechaLegible(fechasEnvios[0]),
          hasta: fechaLegible(fechasEnvios[fechasEnvios.length - 1]),
          cerrado: true,
        },
      })
      generarInformeTecnico(reporte).save(`${nombreArchivo(titulo)}.pdf`)
    },
    [huella, fuentes, anotaciones],
  )
}
