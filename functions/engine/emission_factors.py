"""AgroFinance — Puerto a Python de src/lib/engine/emissionFactors.ts

Solo se porta lo que usa ghg_classify.py para clasificar líneas de un
archivo subido (catálogo de factores + cálculo de N2O de suelos). El
motor de campaña completo (calcularHuellaCampana, usado solo por los
datos demo del piloto) NO se porta — no lo necesita esta Function.

Los valores numéricos deben coincidir EXACTAMENTE con emissionFactors.ts;
cualquier cambio ahí debe reflejarse aquí también.
"""

from dataclasses import dataclass

# ============================================================
# 0. Potencial de Calentamiento Global — IPCC AR6 (GWP-100)
# ============================================================
GWP = {
    "CO2": 1,
    "CH4_fosil": 29.8,
    "CH4_biogenico": 27.0,
    "N2O": 273,
}

N2O_N_A_N2O = 44 / 28  # de N2O-N a N2O
C_A_CO2 = 44 / 12  # de C a CO2


@dataclass(frozen=True)
class FactorEmision:
    valor: float
    unidad: str
    fuente: str


# ============================================================
# 1. Catálogo de Factores de Emisión (versionado por fuente)
# ============================================================
FE = {
    "dieselGalon": FactorEmision(10.15, "kgCO2e/gal", "IPCC 2006 (74,1 tCO2/TJ) · DEFRA"),
    "dieselLitro": FactorEmision(2.68, "kgCO2e/L", "IPCC 2006 · DEFRA"),
    "electricidadSEIN": FactorEmision(0.205, "kgCO2e/kWh", "MINAM/COES SEIN (anual)"),
    "ureaProduccion": FactorEmision(1.9, "kgCO2e/kg urea", "Ecoinvent / Fertilizers Europe"),
    "nitratoAmonioProduccion": FactorEmision(2.6, "kgCO2e/kg", "Ecoinvent / Fertilizers Europe"),
    "cartonCorrugado": FactorEmision(0.85, "kgCO2e/kg", "Ecoinvent / DEFRA"),
    "filmPlastico": FactorEmision(2.6, "kgCO2e/kg", "Ecoinvent (LDPE)"),
    "paletMadera": FactorEmision(2.8, "kgCO2e/u", "Ecoinvent (pallet EUR)"),
    "camionReefer": FactorEmision(0.12, "kgCO2e/t·km", "DEFRA HGV refrigerated · GLEC"),
    "buqueReefer": FactorEmision(0.030, "kgCO2e/t·km", "GLEC v3 / ISO 14083 (deep-sea reefer)"),
}

# ============================================================
# 2. Composición de fertilizantes (% Nitrógeno puro)
# ============================================================
N_CONTENIDO = {
    "urea": 0.46,
    "nitratoAmonio": 0.335,
    "sulfatoAmonio": 0.21,
}

# ============================================================
# 3. Parámetros IPCC 2019 — N2O de suelos gestionados (Tier 1)
# ============================================================
IPCC = {
    "EF1": 0.01,
    "FracGASF": 0.11,
    "EF4": 0.010,
    "FracLEACH": 0.24,
    "EF5": 0.011,
    "C_urea": 0.20,
}


@dataclass(frozen=True)
class DesgloseFertilizante:
    n_puro: float
    n2o_directo: float
    n2o_indirecto: float
    co2_urea: float
    produccion: float
    total: float


def huella_fertilizante(kg_producto: float, tipo: str = "urea") -> DesgloseFertilizante:
    n_puro = kg_producto * N_CONTENIDO[tipo]

    # N2O directo del suelo (IPCC): N x EF1 x 44/28 x GWP
    n2o_directo = n_puro * IPCC["EF1"] * N2O_N_A_N2O * GWP["N2O"]

    # N2O indirecto (volatilizacion + lixiviacion)
    n_indirecto = n_puro * (IPCC["FracGASF"] * IPCC["EF4"] + IPCC["FracLEACH"] * IPCC["EF5"])
    n2o_indirecto = n_indirecto * N2O_N_A_N2O * GWP["N2O"]

    # CO2 por hidrolisis de la urea en el suelo (solo aplica a urea)
    co2_urea = kg_producto * IPCC["C_urea"] * C_A_CO2 if tipo == "urea" else 0.0

    # Produccion upstream del fertilizante (Alcance 3)
    fe_prod = FE["nitratoAmonioProduccion"].valor if tipo == "nitratoAmonio" else FE["ureaProduccion"].valor
    produccion = kg_producto * fe_prod

    total = n2o_directo + n2o_indirecto + co2_urea + produccion
    return DesgloseFertilizante(n_puro, n2o_directo, n2o_indirecto, co2_urea, produccion, total)
