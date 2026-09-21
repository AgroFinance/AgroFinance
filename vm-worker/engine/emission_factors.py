"""AgroFinance — Puerto a Python de src/lib/engine/emissionFactors.ts

Solo se porta lo que usa ghg_classify.py para clasificar líneas de un
archivo subido (catálogo de factores + cálculo de N2O de suelos). El
motor de campaña completo (calcularHuellaCampana, usado solo por los
datos demo del piloto) NO se porta — no lo necesita esta Function.

Los valores numéricos deben coincidir EXACTAMENTE con emissionFactors.ts;
cualquier cambio ahí debe reflejarse aquí también.
"""

import re
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

# GWP-100 de refrigerantes fluorados (IPCC AR5). Fuga de Scope 1 directa:
# kgCO2e = kg de gas x GWP.
GWP_REFRIGERANTE = {
    "r134a": 1430,
    "r404a": 3922,
    "r22": 1810,  # HCFC-22
}


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
    "gasohol84": FactorEmision(2.27, "kgCO2e/L", "IPCC 2006 Tier 1 (gasolina motor)"),
    "electricidadSEIN": FactorEmision(0.205, "kgCO2e/kWh", "MINAM/COES SEIN (anual)"),
    "ureaProduccion": FactorEmision(1.9, "kgCO2e/kg urea", "Ecoinvent / Fertilizers Europe"),
    "nitratoAmonioProduccion": FactorEmision(2.6, "kgCO2e/kg", "Ecoinvent / Fertilizers Europe"),
    "cartonCorrugado": FactorEmision(0.85, "kgCO2e/kg", "Ecoinvent / DEFRA"),
    "filmPlastico": FactorEmision(2.6, "kgCO2e/kg", "Ecoinvent (LDPE)"),
    "paletMadera": FactorEmision(2.8, "kgCO2e/u", "Ecoinvent (pallet EUR)"),
    "camionReefer": FactorEmision(0.12, "kgCO2e/t·km", "DEFRA HGV refrigerated · GLEC"),
    "buqueReefer": FactorEmision(0.030, "kgCO2e/t·km", "GLEC v3 / ISO 14083 (deep-sea reefer)"),
    "refrigeranteR134a": FactorEmision(GWP_REFRIGERANTE["r134a"], "kgCO2e/kg", "IPCC AR5 GWP-100 (gas fluorado)"),
    "refrigeranteR404a": FactorEmision(GWP_REFRIGERANTE["r404a"], "kgCO2e/kg", "IPCC AR5 GWP-100 (gas fluorado)"),
    "refrigeranteR22": FactorEmision(GWP_REFRIGERANTE["r22"], "kgCO2e/kg", "IPCC AR5 GWP-100 (gas fluorado)"),
}

# ============================================================
# 2. Composición de fertilizantes (% Nitrógeno puro)
# ============================================================
N_CONTENIDO = {
    "urea": 0.46,
    "nitratoAmonio": 0.335,
    "sulfatoAmonio": 0.21,
    "dap": 0.18,  # Fosfato diamonico (DAP 18-46-0)
    "guanoIsla": 0.13,  # Guano de isla peruano
}

_NPK_PATRON = re.compile(r"npk[^\d]*(\d{1,2})-(\d{1,2})-(\d{1,2})", re.IGNORECASE)
_TIPOS_FERTILIZANTE = [
    ("urea", re.compile(r"\burea\b", re.IGNORECASE)),
    ("nitratoAmonio", re.compile(r"nitrato.*am[oó]nio|nitroamonio", re.IGNORECASE)),
    ("sulfatoAmonio", re.compile(r"sulfato.*am[oó]nio", re.IGNORECASE)),
    ("dap", re.compile(r"\bdap\b|fosfato.*diam[oó]nico", re.IGNORECASE)),
    ("guanoIsla", re.compile(r"guano", re.IGNORECASE)),
]


def detectar_pct_n_fertilizante(campo_leido: str):
    """Reconoce el tipo de fertilizante por su nombre. Devuelve el %N (0-1)
    o None si el nombre no identifica un tipo especifico — quien llama
    decide el respaldo (hoy: urea, el supuesto ya documentado)."""
    npk = _NPK_PATRON.search(campo_leido or "")
    if npk:
        return int(npk.group(1)) / 100
    for _tipo, patron in _TIPOS_FERTILIZANTE:
        if patron.search(campo_leido or ""):
            return N_CONTENIDO[_tipo]
    return None

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


def huella_fertilizante(kg_producto: float, tipo="urea") -> DesgloseFertilizante:
    """`tipo` acepta una clave conocida de N_CONTENIDO o, para NPK, el %N
    (0-1) ya extraido del nombre (ej. 0.20 para "NPK 20-20-20")."""
    pct_n = tipo if isinstance(tipo, (int, float)) else N_CONTENIDO[tipo]
    n_puro = kg_producto * pct_n

    # N2O directo del suelo (IPCC): N x EF1 x 44/28 x GWP
    n2o_directo = n_puro * IPCC["EF1"] * N2O_N_A_N2O * GWP["N2O"]

    # N2O indirecto (volatilizacion + lixiviacion)
    n_indirecto = n_puro * (IPCC["FracGASF"] * IPCC["EF4"] + IPCC["FracLEACH"] * IPCC["EF5"])
    n2o_indirecto = n_indirecto * N2O_N_A_N2O * GWP["N2O"]

    # CO2 por hidrolisis de la urea en el suelo (solo aplica a urea)
    co2_urea = kg_producto * IPCC["C_urea"] * C_A_CO2 if tipo == "urea" else 0.0

    # Produccion upstream del fertilizante (Alcance 3) — aproximacion: solo
    # hay factor propio para urea/nitrato de amonio; el resto usa el de urea.
    fe_prod = FE["nitratoAmonioProduccion"].valor if tipo == "nitratoAmonio" else FE["ureaProduccion"].valor
    produccion = kg_producto * fe_prod

    total = n2o_directo + n2o_indirecto + co2_urea + produccion
    return DesgloseFertilizante(n_puro, n2o_directo, n2o_indirecto, co2_urea, produccion, total)
