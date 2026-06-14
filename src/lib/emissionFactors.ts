// ============================================================
// AgroFinance — Motor de Factores de Emisión (PCF, grado certificación)
// ------------------------------------------------------------
// Calcula la Huella de Carbono de PRODUCTO (PCF) de una campaña
// agroexportadora bajo las MISMAS normas que aplican los
// certificadores internacionales (SGS, Bureau Veritas, TÜV, SCS):
//
//   • ISO 14067:2018      — Huella de carbono de productos (norma maestra)
//   • GHG Protocol         — Product Life Cycle Accounting & Reporting
//   • ISO 14040 / 14044    — Marco LCA (límites + asignación por masa)
//   • IPCC 2006 GL + Refinamiento 2019 — emisiones de suelos y combustión
//   • ISO 14083:2023 / GLEC Framework v3 — transporte (incl. reefer)
//   • PAS 2050:2011        — base de los requisitos del retailer UK
//
// Límite del sistema: cradle-to-gate (campo → puerto de destino UE).
// Unidad funcional: 1 kg de fruta exportada.
// GWP: IPCC AR6, horizonte 100 años (lo exigido hoy por certificadoras).
//
// ⚠️ Los factores numéricos están VERSIONADOS por fuente y año. Para una
// huella auditable se deben refrescar de las tablas oficiales vigentes
// (DEFRA/DESNZ anual, factor SEIN del MINAM del año, Ecoinvent, GLEC).
// ============================================================

// ============================================================
// 0. Potencial de Calentamiento Global — IPCC AR6 (GWP-100)
// ============================================================
export const GWP = {
  CO2: 1,
  CH4_fosil: 29.8,
  CH4_biogenico: 27.0,
  N2O: 273,
} as const

// Relaciones de masa molecular usadas por el método IPCC
const N2O_N_A_N2O = 44 / 28 // de N₂O-N a N₂O
const C_A_CO2 = 44 / 12 // de C a CO₂

// ============================================================
// 1. Catálogo de Factores de Emisión (versionado por fuente)
// ------------------------------------------------------------
// Cada factor declara su fuente y unidad para trazabilidad de auditoría.
// ============================================================
export type FactorEmision = {
  valor: number
  unidad: string
  fuente: string
}

export const FE = {
  // --- Combustión (IPCC Tier 1 / DEFRA) ---
  // Diésel B5: combustión fósil directa. ~2,68 kgCO₂/L ≈ 10,15 kgCO₂/gal.
  dieselGalon: { valor: 10.15, unidad: 'kgCO₂e/gal', fuente: 'IPCC 2006 (74,1 tCO₂/TJ) · DEFRA' } as FactorEmision,
  dieselLitro: { valor: 2.68, unidad: 'kgCO₂e/L', fuente: 'IPCC 2006 · DEFRA' } as FactorEmision,

  // --- Electricidad (Alcance 2, location-based) ---
  // SEIN Perú — red hidro-dominante. Usar el factor oficial MINAM del año.
  // (NO usar 0,4847: ese es margen combinado MDL, no factor de consumo.)
  electricidadSEIN: { valor: 0.205, unidad: 'kgCO₂e/kWh', fuente: 'MINAM/COES SEIN (anual)' } as FactorEmision,

  // --- Fertilizante nitrogenado: producción upstream (Alcance 3) ---
  // Cradle-to-gate de fabricar el fertilizante (sin el N₂O de campo).
  ureaProduccion: { valor: 1.9, unidad: 'kgCO₂e/kg urea', fuente: 'Ecoinvent / Fertilizers Europe' } as FactorEmision,
  nitratoAmonioProduccion: { valor: 2.6, unidad: 'kgCO₂e/kg', fuente: 'Ecoinvent / Fertilizers Europe' } as FactorEmision,

  // --- Materiales de empaque (Alcance 3) ---
  cartonCorrugado: { valor: 0.85, unidad: 'kgCO₂e/kg', fuente: 'Ecoinvent / DEFRA' } as FactorEmision,
  filmPlastico: { valor: 2.6, unidad: 'kgCO₂e/kg', fuente: 'Ecoinvent (LDPE)' } as FactorEmision,
  paletMadera: { valor: 2.8, unidad: 'kgCO₂e/u', fuente: 'Ecoinvent (pallet EUR)' } as FactorEmision,

  // --- Transporte (ISO 14083 / GLEC, método tonelada-km) ---
  // Camión refrigerado (reefer terrestre, HGV).
  camionReefer: { valor: 0.12, unidad: 'kgCO₂e/t·km', fuente: 'DEFRA HGV refrigerated · GLEC' } as FactorEmision,
  // Buque portacontenedor refrigerado (deep-sea reefer): incluye recargo
  // de energía del contenedor enchufado. Es el hotspot típico en fruta fresca.
  buqueReefer: { valor: 0.030, unidad: 'kgCO₂e/t·km', fuente: 'GLEC v3 / ISO 14083 (deep-sea reefer)' } as FactorEmision,
} as const

// ============================================================
// 2. Composición de fertilizantes (% Nitrógeno puro)
// ============================================================
export const N_CONTENIDO = {
  urea: 0.46, // 46% N
  nitratoAmonio: 0.335, // 33,5% N
  sulfatoAmonio: 0.21, // 21% N
} as const

// ============================================================
// 3. Parámetros IPCC 2019 — N₂O de suelos gestionados (Tier 1)
// ============================================================
const IPCC = {
  EF1: 0.01, // N₂O-N directo por kg N aplicado (agregado)
  FracGASF: 0.11, // fracción de N sintético volatilizado
  EF4: 0.010, // N₂O-N por kg N volatilizado (indirecto)
  FracLEACH: 0.24, // fracción de N lixiviado/escorrentía
  EF5: 0.011, // N₂O-N por kg N lixiviado (indirecto)
  C_urea: 0.20, // kg C por kg de urea (CO₂ por hidrólisis en suelo)
} as const

// ------------------------------------------------------------
// 3a. Huella del fertilizante nitrogenado — DESAGREGADA (lo que
//     revisa el auditor): N₂O directo + N₂O indirecto + CO₂ de la
//     urea + producción upstream. Devuelve kgCO₂e por componente.
// ------------------------------------------------------------
export type DesgloseFertilizante = {
  nPuro: number
  n2oDirecto: number
  n2oIndirecto: number
  co2Urea: number
  produccion: number
  total: number
}

export function huellaFertilizante(
  kgProducto: number,
  tipo: keyof typeof N_CONTENIDO = 'urea',
): DesgloseFertilizante {
  const nPuro = kgProducto * N_CONTENIDO[tipo]

  // N₂O directo del suelo (IPCC): N × EF1 × 44/28 × GWP
  const n2oDirecto = nPuro * IPCC.EF1 * N2O_N_A_N2O * GWP.N2O

  // N₂O indirecto (volatilización + lixiviación)
  const nIndirecto = nPuro * (IPCC.FracGASF * IPCC.EF4 + IPCC.FracLEACH * IPCC.EF5)
  const n2oIndirecto = nIndirecto * N2O_N_A_N2O * GWP.N2O

  // CO₂ por hidrólisis de la urea en el suelo (solo aplica a urea)
  const co2Urea = tipo === 'urea' ? kgProducto * IPCC.C_urea * C_A_CO2 : 0

  // Producción upstream del fertilizante (Alcance 3)
  const feProd = tipo === 'nitratoAmonio' ? FE.nitratoAmonioProduccion.valor : FE.ureaProduccion.valor
  const produccion = kgProducto * feProd

  const total = n2oDirecto + n2oIndirecto + co2Urea + produccion
  return { nPuro, n2oDirecto, n2oIndirecto, co2Urea, produccion, total }
}

// ============================================================
// 4. Entradas del cálculo (alineadas al flujo del SaaS)
// ============================================================
export type DataCampo = {
  dieselGal: number // diésel de tractores/bombas/generadores (galones)
  electricidadKwh: number // riego tecnificado (kWh)
  fertilizanteKg: number // fertilizante aplicado (kg producto)
  tipoFertilizante?: keyof typeof N_CONTENIDO
}

export type DataPacking = {
  electricidadKwh: number // túneles de prefrío, fajas, cámaras (kWh)
  ratioDescartePct: number // % de fruta que no va a exportación (0-100)
}

export type Envio = {
  pesoNetoKg: number // fruta exportada en el contenedor
  cartonKg?: number // peso total de cartón corrugado
  filmKg?: number // film/esquineros plásticos
  paletsU?: number // palets de madera
  distanciaCamionKm: number // tramo terrestre (packing → puerto)
  distanciaMaritimaKm: number // tramo marítimo (puerto → destino UE)
}

export type FuenteEmision =
  | 'transporteMaritimo'
  | 'fertilizante'
  | 'dieselCampo'
  | 'materiales'
  | 'packingEnergia'
  | 'electricidadRiego'
  | 'transporteTerrestre'

// Etiqueta legible y scope GHG de cada fuente (para UI y reportes)
export const FUENTE_META: Record<FuenteEmision, { label: string; scope: 1 | 2 | 3 }> = {
  transporteMaritimo: { label: 'Flete marítimo refrigerado (reefer)', scope: 3 },
  fertilizante: { label: 'Fertilizantes nitrogenados (N₂O + producción)', scope: 1 },
  dieselCampo: { label: 'Diésel maquinaria agrícola', scope: 1 },
  materiales: { label: 'Empaque (cartón, film, palets)', scope: 3 },
  packingEnergia: { label: 'Electricidad packing (prefrío)', scope: 2 },
  electricidadRiego: { label: 'Electricidad riego tecnificado', scope: 2 },
  transporteTerrestre: { label: 'Transporte terrestre a puerto', scope: 3 },
}

export type ResultadoPCF = {
  huellaTotalTon: number // tCO₂e de la campaña (asignada a exportación)
  intensidadKgPorKg: number // kgCO₂e por kg de fruta exportada (lo que pide el retailer)
  kilosExportados: number
  desglose: Record<FuenteEmision, number> // tCO₂e por fuente
  desglosePct: Record<FuenteEmision, number> // % por fuente (gráficos/hotspots)
  scopes: { s1: number; s2: number; s3: number } // tCO₂e por alcance GHG
  hotspot: { fuente: FuenteEmision; label: string; pct: number } // mayor fuente
  norma: string
}

// ============================================================
// 5. Motor de cálculo de campaña — cradle-to-gate (ISO 14067)
// ============================================================
export function calcularHuellaCampana(
  campo: DataCampo,
  packing: DataPacking,
  envios: Envio[],
): ResultadoPCF {
  // Asignación por masa (ISO 14044): campo, packing y fertilizante solo
  // cargan el % que efectivamente se exporta (no el descarte local).
  const pctExportable = 1 - packing.ratioDescartePct / 100

  // --- Campo: combustión (S1) + riego (S2) ---
  const dieselCampo = campo.dieselGal * FE.dieselGalon.valor * pctExportable
  const electricidadRiego = campo.electricidadKwh * FE.electricidadSEIN.valor * pctExportable

  // --- Fertilizante: campo (N₂O+CO₂ urea, S1) + producción (S3) ---
  const fert = huellaFertilizante(campo.fertilizanteKg, campo.tipoFertilizante ?? 'urea')
  const fertCampoS1 = (fert.n2oDirecto + fert.n2oIndirecto + fert.co2Urea) * pctExportable
  const fertProdS3 = fert.produccion * pctExportable
  const fertilizante = fertCampoS1 + fertProdS3

  // --- Packing: energía (S2) ---
  const packingEnergia = packing.electricidadKwh * FE.electricidadSEIN.valor * pctExportable

  // --- Envíos: materiales + transporte (S3, solo carga exportada) ---
  let materiales = 0
  let transporteTerrestre = 0
  let transporteMaritimo = 0
  let kilosExportados = 0

  for (const e of envios) {
    kilosExportados += e.pesoNetoKg
    const pesoTon = e.pesoNetoKg / 1000

    materiales +=
      (e.cartonKg ?? 0) * FE.cartonCorrugado.valor +
      (e.filmKg ?? 0) * FE.filmPlastico.valor +
      (e.paletsU ?? 0) * FE.paletMadera.valor

    // Método tonelada-km (ISO 14083 / GLEC)
    transporteTerrestre += pesoTon * e.distanciaCamionKm * FE.camionReefer.valor
    transporteMaritimo += pesoTon * e.distanciaMaritimaKm * FE.buqueReefer.valor
  }

  // --- Consolidación por fuente (kgCO₂e) ---
  const fuentesKg: Record<FuenteEmision, number> = {
    transporteMaritimo,
    fertilizante,
    dieselCampo,
    materiales,
    packingEnergia,
    electricidadRiego,
    transporteTerrestre,
  }
  const totalKg = Object.values(fuentesKg).reduce((a, b) => a + b, 0)

  // % por fuente + hotspot
  const desglose = {} as Record<FuenteEmision, number>
  const desglosePct = {} as Record<FuenteEmision, number>
  let hotspot = { fuente: 'transporteMaritimo' as FuenteEmision, label: '', pct: 0 }
  for (const k of Object.keys(fuentesKg) as FuenteEmision[]) {
    const kg = fuentesKg[k]
    const pct = totalKg > 0 ? +((kg / totalKg) * 100).toFixed(2) : 0
    desglose[k] = +(kg / 1000).toFixed(3)
    desglosePct[k] = pct
    if (pct > hotspot.pct) hotspot = { fuente: k, label: FUENTE_META[k].label, pct }
  }

  // --- Scopes GHG (S1 directo, S2 energía, S3 cadena de valor), tCO₂e ---
  const s1 = (dieselCampo + fertCampoS1) / 1000
  const s2 = (electricidadRiego + packingEnergia) / 1000
  const s3 = (fertProdS3 + materiales + transporteTerrestre + transporteMaritimo) / 1000

  return {
    huellaTotalTon: +(totalKg / 1000).toFixed(3),
    intensidadKgPorKg: kilosExportados > 0 ? +(totalKg / kilosExportados).toFixed(4) : 0,
    kilosExportados,
    desglose,
    desglosePct,
    scopes: { s1: +s1.toFixed(3), s2: +s2.toFixed(3), s3: +s3.toFixed(3) },
    hotspot,
    norma: 'ISO 14067:2018 · GHG Protocol Product · IPCC 2019 · ISO 14083/GLEC · GWP IPCC AR6',
  }
}

// ============================================================
// 6. Ejemplo de campaña demo (palta Hass) — para pruebas/UI
// ------------------------------------------------------------
// Campaña completa realista: ~38 contenedores reefer (~836 t) a la UE.
// Los consumos de campo/packing son anuales; la intensidad y el hotspot
// (reefer marítimo) salen en rangos reales (intensidad ~0,6-0,8 kgCO₂e/kg).
// ============================================================
export const campaniaDemo = (): ResultadoPCF => {
  const destinos = [
    { km: 11300, camion: 350 }, // Rotterdam (Países Bajos)
    { km: 9800, camion: 300 }, // Algeciras (España)
    { km: 11100, camion: 350 }, // Liverpool (Reino Unido)
  ]
  const envios: Envio[] = Array.from({ length: 38 }, (_, i) => {
    const d = destinos[i % destinos.length]
    return {
      pesoNetoKg: 22000,
      cartonKg: 2200, // ~0,1 kg cartón por kg de fruta
      filmKg: 63,
      paletsU: 27,
      distanciaCamionKm: d.camion,
      distanciaMaritimaKm: d.km,
    }
  })
  return calcularHuellaCampana(
    { dieselGal: 6000, electricidadKwh: 250000, fertilizanteKg: 18000, tipoFertilizante: 'urea' },
    { electricidadKwh: 147000, ratioDescartePct: 15 },
    envios,
  )
}
