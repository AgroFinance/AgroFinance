"""AgroFinance — Puerto a Python de src/lib/engine/ghgClassify.ts

Una sola cadena de calculo, igual que en el cliente:

    parse_archivo.parsear_archivo() -> lineas leidas
                  -> ghg_classify()  -> lineas clasificadas (scope + factor + emision)
                  -> resumir_lineas() -> resumen agregado

Regla dura (igual que en el TS): lo que no se reconoce NO se inventa —
la linea queda "ignorado" con su motivo, y no contamina el total.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional

from .emission_factors import FE, GWP, N_CONTENIDO, huella_fertilizante

# ============================================================
# 1. Catalogo de factores disponibles
# ============================================================
MECANISMO_DE_FACTOR = {
    "dieselLitro": "maquinaria",
    "dieselGalon": "maquinaria",
    "electricidadSEIN": "riego",
    "n2oSuelos": "n2oCampo",
    "ureaProduccion": "fertilizante",
    "nitratoAmonioProduccion": "fertilizante",
    "cartonCorrugado": "empaque",
    "filmPlastico": "empaque",
    "paletMadera": "empaque",
    "camionReefer": "flete",
    "buqueReefer": "flete",
}


@dataclass(frozen=True)
class FactorCatalogo:
    clave: str
    label: str
    valor: float
    unidad: str
    fuente: str
    version: str
    scope: int
    mecanismo: str
    unidad_actividad: str


CATALOGO_FACTORES: list[FactorCatalogo] = [
    FactorCatalogo("dieselLitro", "Diésel B5 (litros)", FE["dieselLitro"].valor, FE["dieselLitro"].unidad,
                   FE["dieselLitro"].fuente, "IPCC 2006 GL · DEFRA 2024", 1, "maquinaria", "L"),
    FactorCatalogo("dieselGalon", "Diésel B5 (galones)", FE["dieselGalon"].valor, FE["dieselGalon"].unidad,
                   FE["dieselGalon"].fuente, "IPCC 2006 GL · DEFRA 2024", 1, "maquinaria", "gal"),
    FactorCatalogo("electricidadSEIN", "Electricidad red SEIN", FE["electricidadSEIN"].valor, FE["electricidadSEIN"].unidad,
                   FE["electricidadSEIN"].fuente, "MINAM/COES 2025", 2, "riego", "kWh"),
    FactorCatalogo("n2oSuelos", "N₂O de suelos gestionados (directo + indirecto)", 0.01, "kg N₂O-N/kg N",
                   "IPCC 2019 Refinement · GWP AR6 (N₂O = 273)", "IPCC 2019 · AR6", 1, "n2oCampo", "kg fertilizante"),
    FactorCatalogo("ureaProduccion", "Urea — producción upstream", FE["ureaProduccion"].valor, FE["ureaProduccion"].unidad,
                   FE["ureaProduccion"].fuente, "Ecoinvent 3.9", 3, "fertilizante", "kg"),
    FactorCatalogo("nitratoAmonioProduccion", "Nitrato de amonio — producción upstream", FE["nitratoAmonioProduccion"].valor,
                   FE["nitratoAmonioProduccion"].unidad, FE["nitratoAmonioProduccion"].fuente, "Ecoinvent 3.9",
                   3, "fertilizante", "kg"),
    FactorCatalogo("cartonCorrugado", "Cartón corrugado", FE["cartonCorrugado"].valor, FE["cartonCorrugado"].unidad,
                   FE["cartonCorrugado"].fuente, "Ecoinvent 3.9 · DEFRA 2024", 3, "empaque", "kg"),
    FactorCatalogo("filmPlastico", "Film plástico (LDPE)", FE["filmPlastico"].valor, FE["filmPlastico"].unidad,
                   FE["filmPlastico"].fuente, "Ecoinvent 3.9", 3, "empaque", "kg"),
    FactorCatalogo("paletMadera", "Palet de madera (EUR)", FE["paletMadera"].valor, FE["paletMadera"].unidad,
                   FE["paletMadera"].fuente, "Ecoinvent 3.9", 3, "empaque", "u"),
    FactorCatalogo("camionReefer", "Camión refrigerado", FE["camionReefer"].valor, FE["camionReefer"].unidad,
                   FE["camionReefer"].fuente, "GLEC v3 · ISO 14083:2023", 3, "flete", "t·km"),
    FactorCatalogo("buqueReefer", "Buque portacontenedor reefer", FE["buqueReefer"].valor, FE["buqueReefer"].unidad,
                   FE["buqueReefer"].fuente, "GLEC v3 · ISO 14083:2023", 3, "flete", "t·km"),
]

_POR_CLAVE = {f.clave: f for f in CATALOGO_FACTORES}


def factor_por_clave(clave: str) -> FactorCatalogo:
    return _POR_CLAVE[clave]


# ============================================================
# 2. Linea leida / clasificada
# ============================================================
@dataclass
class LineaLeida:
    id: str
    campo_leido: str
    valor: Optional[float]
    unidad: str
    hoja: str
    fila: int
    oculto: bool = False
    crudo: Optional[str] = None


@dataclass
class LineaClasificada:
    id: str
    campo_leido: str
    valor: Optional[float]
    unidad: str
    hoja: str
    fila: int
    oculto: bool
    estado: str  # 'leido' | 'ignorado'
    motivo_ignorado: Optional[str]
    scope_asignado: Optional[int]
    factor_asignado: Optional[str]
    factor_valor: Optional[float]
    factor_unidad: Optional[str]
    factor_fuente: Optional[str]
    factor_version: Optional[str]
    mecanismo: Optional[str]
    emision_kg: Optional[float]

    def to_dict(self) -> dict:
        return {
            "id": self.id, "campoLeido": self.campo_leido, "valor": self.valor, "unidad": self.unidad,
            "hoja": self.hoja, "fila": self.fila, "oculto": self.oculto, "estado": self.estado,
            "motivoIgnorado": self.motivo_ignorado, "scopeAsignado": self.scope_asignado,
            "factorAsignado": self.factor_asignado, "factorValor": self.factor_valor,
            "factorUnidad": self.factor_unidad, "factorFuente": self.factor_fuente,
            "factorVersion": self.factor_version, "mecanismo": self.mecanismo, "emisionKg": self.emision_kg,
        }


# ============================================================
# 3. Reglas de reconocimiento — nombre de campo/unidad -> factor
# ------------------------------------------------------------
# Mismos patrones que REGLAS en ghgClassify.ts, verbatim.
# ============================================================
@dataclass(frozen=True)
class Regla:
    factor: str
    palabras: re.Pattern
    unidades: Optional[re.Pattern] = None


REGLAS: list[Regla] = [
    Regla("dieselGalon", re.compile(r"(diesel|diésel|petroleo|combustible|d2|b5).*(gal)|(gal).*(diesel|diésel)", re.I),
          re.compile(r"^(gal|galon|galones|gl)$", re.I)),
    Regla("dieselLitro", re.compile(r"diesel|diésel|petroleo|combustible|\bd2\b|\bb5\b", re.I),
          re.compile(r"^(l|lt|ltr|litro|litros)$", re.I)),
    Regla("electricidadSEIN", re.compile(r"electric|energia|energía|kwh|sein|consumo.*luz|riego.*kwh|packing.*kwh", re.I),
          re.compile(r"^(kwh|kw-h|mwh)$", re.I)),
    Regla("ureaProduccion", re.compile(r"urea", re.I), re.compile(r"^(kg|kilos|kilogramos|t|tn|ton)$", re.I)),
    Regla("nitratoAmonioProduccion", re.compile(r"nitrato.*amonio|nitroamonio|\ban\b", re.I),
          re.compile(r"^(kg|kilos|t|tn|ton)$", re.I)),
    Regla("n2oSuelos", re.compile(r"fertiliz|nitrogenado|abono|\bn\b.*aplicado", re.I),
          re.compile(r"^(kg|kilos|t|tn|ton)$", re.I)),
    Regla("cartonCorrugado", re.compile(r"carton|cartón|caja|corrugad", re.I),
          re.compile(r"^(kg|kilos|u|und|unidad|cajas)$", re.I)),
    Regla("filmPlastico", re.compile(r"film|plastico|plástico|ldpe|stretch|esquinero", re.I),
          re.compile(r"^(kg|kilos)$", re.I)),
    Regla("paletMadera", re.compile(r"palet|pallet|parihuela", re.I),
          re.compile(r"^(u|und|unidad|unidades|palets)$", re.I)),
    Regla("camionReefer", re.compile(r"camion|camión|terrestre|flete.*tierra|distancia.*camion", re.I),
          re.compile(r"^(t.?km|tkm|km)$", re.I)),
    Regla("buqueReefer", re.compile(r"maritim|marítim|buque|naviera|reefer|flete.*mar|distancia.*mar", re.I),
          re.compile(r"^(t.?km|tkm|km)$", re.I)),
]

ES_PACKING = re.compile(r"packing|empaque|prefrio|prefrío|camara|cámara|frio|frío|planta", re.I)


def _normalizar_unidad(u: str) -> str:
    return (u or "").strip().replace(".", "")


def reconocer_factor(campo_leido: str, unidad: str) -> Optional[str]:
    campo = campo_leido or ""
    uni = _normalizar_unidad(unidad)
    # Primero las reglas cuya unidad coincide: la unidad es la senal mas fuerte.
    for r in REGLAS:
        if r.unidades and r.unidades.search(uni) and r.palabras.search(campo):
            return r.factor
    # Si la linea DECLARA una unidad y ninguna regla la acepto, no se fuerza
    # un factor por el solo parecido del nombre: una cantidad en litros no
    # puede cobrar el factor de electricidad (kWh), ni unas horas de bombeo
    # el de energia. Atribuir mal es peor que declarar la linea ignorada.
    if uni:
        return None
    # Sin unidad declarada el nombre del campo es la unica senal disponible
    # (columnas tipo "diesel_consumido" en planillas de campo).
    for r in REGLAS:
        if r.palabras.search(campo):
            return r.factor
    return None


# ============================================================
# 4. Calculo de emision de una linea
# ============================================================
def emision_de_linea(factor: str, valor: float) -> float:
    if factor == "n2oSuelos":
        f = huella_fertilizante(valor, "urea")
        return f.n2o_directo + f.n2o_indirecto + f.co2_urea
    return valor * factor_por_clave(factor).valor


# ============================================================
# 5. Clasificacion
# ============================================================
def clasificar_linea(l: LineaLeida) -> LineaClasificada:
    def ignorar(motivo: str) -> LineaClasificada:
        return LineaClasificada(
            id=l.id, campo_leido=l.campo_leido, valor=l.valor, unidad=l.unidad, hoja=l.hoja, fila=l.fila,
            oculto=l.oculto, estado="ignorado", motivo_ignorado=motivo, scope_asignado=None,
            factor_asignado=None, factor_valor=None, factor_unidad=None, factor_fuente=None,
            factor_version=None, mecanismo=None, emision_kg=None,
        )

    if l.valor is None:
        return ignorar("La celda no contiene un valor numérico legible")
    if l.valor == 0:
        return ignorar("Consumo declarado en cero — no aporta emisión")
    if l.valor < 0:
        return ignorar("Valor negativo: probable nota de crédito o ajuste contable")
    if l.oculto:
        return ignorar("Celda en hoja o fila oculta del libro — excluida del cálculo")

    factor = reconocer_factor(l.campo_leido, l.unidad)
    if not factor:
        return ignorar(f'Campo "{l.campo_leido}" no corresponde a un consumo con factor de emisión asignable')

    meta = factor_por_clave(factor)
    emision_kg = round(emision_de_linea(factor, l.valor), 3)
    # El factor electrico es el mismo, pero el mecanismo no: un consumo de
    # planta de empaque no es riego. Se distingue por la descripcion.
    mecanismo = "packing" if factor == "electricidadSEIN" and ES_PACKING.search(l.campo_leido) else meta.mecanismo

    return LineaClasificada(
        id=l.id, campo_leido=l.campo_leido, valor=l.valor, unidad=l.unidad, hoja=l.hoja, fila=l.fila,
        oculto=l.oculto, estado="leido", motivo_ignorado=None, scope_asignado=meta.scope,
        factor_asignado=factor, factor_valor=meta.valor, factor_unidad=meta.unidad,
        factor_fuente=meta.fuente, factor_version=meta.version, mecanismo=mecanismo, emision_kg=emision_kg,
    )


def ghg_classify(filas: list[LineaLeida]) -> list[LineaClasificada]:
    return [clasificar_linea(l) for l in filas]


# ============================================================
# 6. Resumen agregado de un archivo
# ============================================================
def resumir_lineas(lineas: list[LineaClasificada]) -> dict:
    emision_kg = 0.0
    leidas = 0
    ignoradas = 0
    scopes_kg = {"s1": 0.0, "s2": 0.0, "s3": 0.0}
    por_mecanismo: dict[str, float] = {}

    for l in lineas:
        if l.estado == "ignorado" or l.emision_kg is None:
            ignoradas += 1
            continue
        leidas += 1
        emision_kg += l.emision_kg
        if l.scope_asignado == 1:
            scopes_kg["s1"] += l.emision_kg
        elif l.scope_asignado == 2:
            scopes_kg["s2"] += l.emision_kg
        elif l.scope_asignado == 3:
            scopes_kg["s3"] += l.emision_kg
        if l.mecanismo:
            por_mecanismo[l.mecanismo] = por_mecanismo.get(l.mecanismo, 0.0) + l.emision_kg

    return {
        "leidas": leidas,
        "ignoradas": ignoradas,
        "emisionKg": round(emision_kg, 3),
        "emisionTon": round(emision_kg / 1000, 4),
        "scopes": {
            "s1": round(scopes_kg["s1"] / 1000, 4),
            "s2": round(scopes_kg["s2"] / 1000, 4),
            "s3": round(scopes_kg["s3"] / 1000, 4),
        },
        "porMecanismo": por_mecanismo,
    }
