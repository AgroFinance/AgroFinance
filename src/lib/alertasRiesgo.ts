'use client'

// ============================================================
// AgroFinance — Alertas de riesgo pre-crédito ("canales rojos")
// ------------------------------------------------------------
// Pedido de Miguel (reunión Chavín): antes de que la empresa presente el
// dossier a un banco, la plataforma debe avisar de lo que puede tumbar el
// proceso — no descubrirlo el analista del banco primero. No es un chequeo
// nuevo: es el mismo checklist "listo para auditoría" y la misma huella
// consolidada que ya existen, releídos con criterio de riesgo financiero
// (rojo = probablemente descalifica, amarillo = pide explicación, no dato
// inventado).
// ============================================================

import type { HuellaConsolidada } from './huellaConsolidada'
import type { EstadoChecklist } from './reporteTecnico'
import type { Anotaciones } from './anotaciones'
import type { FuenteDatos } from './datosPrueba'

export type NivelAlerta = 'rojo' | 'amarillo'

export type AlertaRiesgo = {
  id: string
  nivel: NivelAlerta
  titulo: string
  detalle: string
}

export type ContextoAlertas = {
  huella: HuellaConsolidada
  fuentes: FuenteDatos[]
  checklist: EstadoChecklist[]
  anotaciones: Anotaciones
}

export function evaluarAlertasRiesgo(ctx: ContextoAlertas): AlertaRiesgo[] {
  const alertas: AlertaRiesgo[] = []
  const { huella, fuentes, checklist } = ctx

  if (!huella.tieneDatos) {
    alertas.push({
      id: 'sin-datos',
      nivel: 'rojo',
      titulo: 'No hay huella medida todavía',
      detalle: 'Ningún banco evalúa una Sustainability Linked Loan sin un inventario de huella. Vincula al menos un archivo en Configuración antes de presentar el dossier.',
    })
  }

  const conError = fuentes.filter((f) => !f.isDemo && f.estado === 'error')
  if (conError.length > 0) {
    alertas.push({
      id: 'fuentes-error',
      nivel: 'rojo',
      titulo: `${conError.length} archivo(s) en estado de error`,
      detalle: `${conError.map((f) => f.archivo).join(', ')} no se pudieron leer. Un auditor los va a pedir; llegan mejor corregidos antes que descubiertos en la entrevista.`,
    })
  }

  const cumplidos = checklist.filter((c) => c.cumplido).length
  const totalChecklist = checklist.length
  if (totalChecklist > 0 && cumplidos / totalChecklist < 0.5) {
    alertas.push({
      id: 'checklist-bajo',
      nivel: 'rojo',
      titulo: `Checklist de auditoría en ${cumplidos}/${totalChecklist}`,
      detalle: 'Menos de la mitad de los requisitos de "listo para auditoría" están cumplidos. Revísalo en Reportes antes de agendar con el banco.',
    })
  } else if (totalChecklist > 0 && cumplidos < totalChecklist) {
    alertas.push({
      id: 'checklist-parcial',
      nivel: 'amarillo',
      titulo: `Checklist de auditoría en ${cumplidos}/${totalChecklist}`,
      detalle: 'Faltan requisitos por cumplir. No bloquea el envío, pero conviene explicarlos de antemano en el dossier.',
    })
  }

  const sinSustento = Object.values(ctx.anotaciones.sustentoBenchmark).every((t) => !t.trim())
  if (sinSustento) {
    alertas.push({
      id: 'sin-sustento-benchmark',
      nivel: 'amarillo',
      titulo: 'Sin nota de sustento del benchmark',
      detalle: 'Si tu intensidad está por encima de la referencia (salinidad de agua/suelo, mano de obra manual), un banco va a preguntar por qué. Escribe la nota en Análisis antes de que te la pidan.',
    })
  }

  const sinVarianza = Object.values(ctx.anotaciones.varianza).every((t) => !t.trim())
  if (huella.tieneDatos && sinVarianza) {
    alertas.push({
      id: 'sin-varianza',
      nivel: 'amarillo',
      titulo: 'Sin explicación de variación interanual',
      detalle: 'Fletes, origen de fertilizante o cambios de ruta logística explican casi cualquier salto de un año a otro. Sin nota, el banco lo interpreta como falta de control interno.',
    })
  }

  if (huella.archivosUsuario.length > 0 && huella.archivosUsuario.length < 3) {
    alertas.push({
      id: 'pocas-fuentes',
      nivel: 'amarillo',
      titulo: 'Pocas fuentes vinculadas',
      detalle: 'Con menos de tres archivos vinculados el inventario suele estar incompleto (falta riego, packing o logística). Revisa qué áreas todavía no han subido su archivo.',
    })
  }

  return alertas
}

export const rojas = (alertas: AlertaRiesgo[]) => alertas.filter((a) => a.nivel === 'rojo')
export const amarillas = (alertas: AlertaRiesgo[]) => alertas.filter((a) => a.nivel === 'amarillo')
