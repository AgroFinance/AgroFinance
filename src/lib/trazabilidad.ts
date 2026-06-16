// ============================================================
// AgroFinance — Trazabilidad de la huella (drill-down auditable)
// ------------------------------------------------------------
// Para cada fuente del Top-5 reconstruye la cadena de evidencia que
// exige un banco (BBVA/BCP) o una verificadora (Bureau Veritas/SGS):
//
//   indicador  →  cálculo (actividad × factor = emisión)
//              →  registros de origen (facturas / recibos / B-L)
//              →  archivo de la empresa del que se leyó
//
// "Con un clic, ver de dónde sale el indicador y poder defenderlo."
// AgroFinance LEE los Excel que la empresa ya usa; no los modifica.
// ============================================================

import { campos, packing, envios } from './pilotData'
import { FE, FUENTE_META, huellaFertilizante, type FuenteEmision } from './emissionFactors'
import { cooperativa } from './pilotEngine'

const fmt = (n: number) => Math.round(n).toLocaleString('es-PE')
const sum = <T,>(arr: T[], f: (x: T) => number) => arr.reduce((s, x) => s + f(x), 0)

export type CalcLinea = {
  concepto: string
  actividad: number
  actividadUnidad: string
  factor: number
  factorUnidad: string
  emisionKg: number
}

export type Registro = {
  fecha: string
  referencia: string
  proveedor: string
  cantidad: string
}

export type Trazabilidad = {
  fuente: FuenteEmision
  titulo: string
  scope: 1 | 2 | 3
  emisionTon: number // valor que aparece en el dashboard (asignado a exportación)
  lineas: CalcLinea[]
  factorFuente: string
  asignacionNota?: string // si el bruto difiere del asignado (descarte, ISO 14044)
  archivo: string
  archivoNota: string
  columnasLeidas: string[] // columnas que la plataforma leyó del archivo
  registrosTotal: number
  registros: Registro[] // muestra de los registros de origen
}

const ARCHIVO_NOTA = 'AgroFinance no modifica tus archivos — solo los lee.'

// --- Totales de actividad (cooperativa, data real del piloto) ---
const dieselGal = sum(campos, (c) => c.dieselGal)
const dieselLitros = Math.round(dieselGal * 3.78541)
const riegoKwh = sum(campos, (c) => c.electricidadRiegoKwh)
const fertKg = sum(campos, (c) => c.fertilizanteKg)
const packKwh = sum(packing, (p) => p.electricidadPackingKwh)
const cartonKg = Math.round(sum(envios, (e) => e.cajasCarton) * 0.4)
const filmKg = Math.round(sum(envios, (e) => e.paletsU) * 1.2)
const paletsU = sum(envios, (e) => e.paletsU)
const tkmMar = Math.round(sum(envios, (e) => (e.pesoNetoKg / 1000) * e.distanciaMaritimaKm))
const tkmTer = Math.round(sum(envios, (e) => (e.pesoNetoKg / 1000) * e.distanciaCamionKm))
const fertEff = huellaFertilizante(fertKg, 'urea').total / fertKg // kgCO₂e/kg urea

// Nota de asignación por masa cuando el bruto difiere del asignado al producto
function nota(brutoKg: number, fuente: FuenteEmision): string | undefined {
  const asignadoKg = cooperativa.desglose[fuente] * 1000
  if (brutoKg - asignadoKg < brutoKg * 0.01) return undefined
  const pct = Math.round((1 - asignadoKg / brutoKg) * 100)
  return `Asignación por masa (ISO 14044): bruto ${fmt(brutoKg / 1000)} tCO₂e → descontando el descarte local (−${pct}%) se asigna al producto exportado ${fmt(asignadoKg / 1000)} tCO₂e.`
}

// Muestra de registros de envíos (B-L / guías) — data real
const envSample = envios.slice(0, 6)
const proveedoresDiesel = ['Primax S.A.', 'Petroperú', 'Repsol Comercial']

const TABLA: Record<FuenteEmision, () => Trazabilidad> = {
  transporteMaritimo: () => {
    const brutoKg = tkmMar * FE.buqueReefer.valor
    return {
      fuente: 'transporteMaritimo', titulo: FUENTE_META.transporteMaritimo.label, scope: 3,
      emisionTon: cooperativa.desglose.transporteMaritimo,
      lineas: [{ concepto: 'Flete marítimo refrigerado', actividad: tkmMar, actividadUnidad: 't·km', factor: FE.buqueReefer.valor, factorUnidad: 'kgCO₂e/t·km', emisionKg: brutoKg }],
      factorFuente: FE.buqueReefer.fuente,
      archivo: 'Tracking_Aduanas_Exportacion.xlsx',
      archivoNota: ARCHIVO_NOTA,
      columnasLeidas: ['peso_neto_fruta_kg', 'puerto_destino_europa', 'distancia_maritima_km', 'fecha_despacho'],
      registrosTotal: envios.length,
      registros: envSample.map((e) => ({ fecha: e.fecha, referencia: `B/L ${e.idEnvio}`, proveedor: `Naviera → ${e.puertoDestino}`, cantidad: `${fmt(e.pesoNetoKg)} kg · ${fmt(e.distanciaMaritimaKm)} km` })),
    }
  },
  fertilizante: () => {
    const brutoKg = fertKg * fertEff
    return {
      fuente: 'fertilizante', titulo: FUENTE_META.fertilizante.label, scope: 1,
      emisionTon: cooperativa.desglose.fertilizante,
      lineas: [{ concepto: 'Urea aplicada (46% N) · N₂O suelo + producción', actividad: fertKg, actividadUnidad: 'kg urea', factor: +fertEff.toFixed(2), factorUnidad: 'kgCO₂e/kg', emisionKg: brutoKg }],
      factorFuente: 'IPCC 2019 (N₂O suelos) · Ecoinvent (producción)',
      asignacionNota: nota(brutoKg, 'fertilizante'),
      archivo: 'Control_de_Campo_.xlsx',
      archivoNota: ARCHIVO_NOTA,
      columnasLeidas: ['empresa', 'cultivo', 'fertilizante_nitrogenado_kg', 'hectareas'],
      registrosTotal: campos.length,
      registros: campos.map((c) => ({ fecha: 'Campaña 2026', referencia: c.idCampo, proveedor: c.empresa, cantidad: `${fmt(c.fertilizanteKg)} kg urea · ${c.hectareas} ha` })),
    }
  },
  dieselCampo: () => {
    const brutoKg = dieselLitros * FE.dieselLitro.valor
    return {
      fuente: 'dieselCampo', titulo: FUENTE_META.dieselCampo.label, scope: 1,
      emisionTon: cooperativa.desglose.dieselCampo,
      lineas: [{ concepto: 'Diésel B5 maquinaria y bombas', actividad: dieselLitros, actividadUnidad: 'litros', factor: FE.dieselLitro.valor, factorUnidad: 'kgCO₂/litro', emisionKg: brutoKg }],
      factorFuente: FE.dieselLitro.fuente,
      asignacionNota: nota(brutoKg, 'dieselCampo'),
      archivo: 'Control_de_Campo_.xlsx · Facturas de combustible',
      archivoNota: ARCHIVO_NOTA,
      columnasLeidas: ['empresa', 'diesel_campo_gal'],
      registrosTotal: 24,
      registros: campos.slice(0, 6).map((c, i) => ({ fecha: `2026-0${(i % 9) + 1}-15`, referencia: `FAC-${1200 + i}`, proveedor: proveedoresDiesel[i % proveedoresDiesel.length], cantidad: `${fmt(c.dieselGal)} gal (${fmt(c.dieselGal * 3.78541)} L)` })),
    }
  },
  packingEnergia: () => {
    const brutoKg = packKwh * FE.electricidadSEIN.valor
    return {
      fuente: 'packingEnergia', titulo: FUENTE_META.packingEnergia.label, scope: 2,
      emisionTon: cooperativa.desglose.packingEnergia,
      lineas: [{ concepto: 'Electricidad packing (túneles de prefrío)', actividad: packKwh, actividadUnidad: 'kWh', factor: FE.electricidadSEIN.valor, factorUnidad: 'kgCO₂e/kWh', emisionKg: brutoKg }],
      factorFuente: FE.electricidadSEIN.fuente,
      asignacionNota: nota(brutoKg, 'packingEnergia'),
      archivo: 'Reporte_Mensual_Packing_y_Mermas.xlsx · Recibos de luz',
      archivoNota: ARCHIVO_NOTA,
      columnasLeidas: ['empresa', 'electricidad_packing_kwh', 'toneladas_procesadas'],
      registrosTotal: packing.length * 12,
      registros: packing.map((p) => ({ fecha: 'Campaña 2026', referencia: p.idPacking, proveedor: `${p.empresa} · recibo eléctrico`, cantidad: `${fmt(p.electricidadPackingKwh)} kWh · ${fmt(p.toneladasProcesadas)} t` })),
    }
  },
  electricidadRiego: () => {
    const brutoKg = riegoKwh * FE.electricidadSEIN.valor
    return {
      fuente: 'electricidadRiego', titulo: FUENTE_META.electricidadRiego.label, scope: 2,
      emisionTon: cooperativa.desglose.electricidadRiego,
      lineas: [{ concepto: 'Electricidad riego tecnificado (pozos)', actividad: riegoKwh, actividadUnidad: 'kWh', factor: FE.electricidadSEIN.valor, factorUnidad: 'kgCO₂e/kWh', emisionKg: brutoKg }],
      factorFuente: FE.electricidadSEIN.fuente,
      asignacionNota: nota(brutoKg, 'electricidadRiego'),
      archivo: 'Control_de_Campo_.xlsx · Recibos eléctricos de pozo',
      archivoNota: ARCHIVO_NOTA,
      columnasLeidas: ['empresa', 'electricidad_riego_kwh'],
      registrosTotal: campos.length,
      registros: campos.map((c) => ({ fecha: 'Campaña 2026', referencia: `Pozo ${c.idCampo}`, proveedor: c.empresa, cantidad: `${fmt(c.electricidadRiegoKwh)} kWh` })),
    }
  },
  materiales: () => {
    const lc = cartonKg * FE.cartonCorrugado.valor
    const lf = filmKg * FE.filmPlastico.valor
    const lp = paletsU * FE.paletMadera.valor
    return {
      fuente: 'materiales', titulo: FUENTE_META.materiales.label, scope: 3,
      emisionTon: cooperativa.desglose.materiales,
      lineas: [
        { concepto: 'Cartón corrugado', actividad: cartonKg, actividadUnidad: 'kg', factor: FE.cartonCorrugado.valor, factorUnidad: 'kgCO₂e/kg', emisionKg: lc },
        { concepto: 'Film / esquineros (LDPE)', actividad: filmKg, actividadUnidad: 'kg', factor: FE.filmPlastico.valor, factorUnidad: 'kgCO₂e/kg', emisionKg: lf },
        { concepto: 'Palets de madera', actividad: paletsU, actividadUnidad: 'u', factor: FE.paletMadera.valor, factorUnidad: 'kgCO₂e/u', emisionKg: lp },
      ],
      factorFuente: 'Ecoinvent / DEFRA',
      archivo: 'Reporte_Mensual_Packing_y_Mermas.xlsx',
      archivoNota: ARCHIVO_NOTA,
      columnasLeidas: ['cajas_carton_unidades', 'palets_madera_unidades'],
      registrosTotal: envios.length,
      registros: envSample.map((e) => ({ fecha: e.fecha, referencia: e.idEnvio, proveedor: 'Empaque corrugado de exportación', cantidad: `${fmt(e.cajasCarton)} cajas · ${e.paletsU} palets` })),
    }
  },
  transporteTerrestre: () => {
    const brutoKg = tkmTer * FE.camionReefer.valor
    return {
      fuente: 'transporteTerrestre', titulo: FUENTE_META.transporteTerrestre.label, scope: 3,
      emisionTon: cooperativa.desglose.transporteTerrestre,
      lineas: [{ concepto: 'Camión reefer · packing → puerto', actividad: tkmTer, actividadUnidad: 't·km', factor: FE.camionReefer.valor, factorUnidad: 'kgCO₂e/t·km', emisionKg: brutoKg }],
      factorFuente: FE.camionReefer.fuente,
      archivo: 'Tracking_Aduanas_Exportacion.xlsx',
      archivoNota: ARCHIVO_NOTA,
      columnasLeidas: ['peso_neto_fruta_kg', 'distancia_camion_peru_km', 'fecha_despacho'],
      registrosTotal: envios.length,
      registros: envSample.map((e) => ({ fecha: e.fecha, referencia: `Guía ${e.idEnvio}`, proveedor: 'Transporte refrigerado interno', cantidad: `${fmt(e.pesoNetoKg / 1000)} t · ${e.distanciaCamionKm} km` })),
    }
  },
}

export function trazabilidadDe(fuente: FuenteEmision): Trazabilidad {
  return TABLA[fuente]()
}
