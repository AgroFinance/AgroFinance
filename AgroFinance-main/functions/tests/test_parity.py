"""Paridad TS <-> Python: el mismo archivo, por el motor cliente (TS,
fixture generada una vez con el propio ghgClassify.ts real) y por el
puerto Python, deben coincidir en lo que de verdad le llega al usuario:
cuántas líneas se reconocieron, la emisión total y por scope/mecanismo.

Las fixtures *.expected.json en tests/fixtures/ se generaron corriendo
el motor TypeScript REAL (src/lib/parsing/parseArchivo.ts +
src/lib/engine/ghgClassify.ts) sobre los mismos CSV que están al lado —
ver el historial de esta sesión / README de esta carpeta si hace falta
regenerarlas tras un cambio en el motor TS.

Divergencia conocida y deliberada, NO un bug: al leer un CSV, SheetJS
(el motor TS) auto-detecta strings con forma de fecha (p. ej.
"2026-02-18" en la columna fecha_despacho) y los convierte a un número
de serie de Excel, generando una línea "ignorada" extra que nunca
existió como consumo real. El puerto Python trata ese mismo valor como
texto no numérico y no genera ninguna línea. Por eso `ignoradas` y el
conteo total de líneas pueden diferir entre motores — pero `leidas`,
`emisionKg`, `scopes` y `porMecanismo` (lo único que ve el usuario en
el resultado) deben coincidir exacto, y son los que se comparan aquí.
"""

import json
from pathlib import Path

import pytest

from engine.parse_archivo import parsear_archivo
from engine.ghg_classify import ghg_classify, resumir_lineas

DATA = Path(__file__).parents[2] / "DATA_Agroexportadora_Prueba" / "01_Facturas_XML_SUNAT"

FIXTURES = Path(__file__).parent / "fixtures"

CASOS = [
    "mype_campos_fijos",
    "mype_envios_variables",
    "mype_packing_fijos",
]


@pytest.mark.parametrize("caso", CASOS)
def test_paridad_resumen(caso):
    esperado = json.loads((FIXTURES / f"{caso}.expected.json").read_text(encoding="utf-8"))
    ruta_csv = FIXTURES / f"{caso}.csv"

    parseado = parsear_archivo(str(ruta_csv), "csv")
    clasificadas = ghg_classify(parseado.lineas)
    resumen = resumir_lineas(clasificadas)

    esperado_resumen = esperado["resumen"]

    # 'ignoradas' NO se compara — ver nota de divergencia conocida arriba.
    assert resumen["leidas"] == esperado_resumen["leidas"]
    assert resumen["emisionKg"] == pytest.approx(esperado_resumen["emisionKg"], rel=1e-6)
    assert resumen["emisionTon"] == pytest.approx(esperado_resumen["emisionTon"], rel=1e-6)
    for scope in ("s1", "s2", "s3"):
        assert resumen["scopes"][scope] == pytest.approx(esperado_resumen["scopes"][scope], rel=1e-6)
    for mecanismo, kg in esperado_resumen["porMecanismo"].items():
        assert resumen["porMecanismo"].get(mecanismo) == pytest.approx(kg, rel=1e-6)


@pytest.mark.parametrize("caso", CASOS)
def test_paridad_lineas_individuales(caso):
    """Compara linea por linea (mismo orden de lectura) el factor y la
    emision asignados — no solo el agregado, para que un error que se
    cancele en la suma tambien quede atrapado."""
    esperado = json.loads((FIXTURES / f"{caso}.expected.json").read_text(encoding="utf-8"))
    ruta_csv = FIXTURES / f"{caso}.csv"

    parseado = parsear_archivo(str(ruta_csv), "csv")
    clasificadas = ghg_classify(parseado.lineas)

    # Solo se compara el subconjunto reconocido ('leido'): el conteo de
    # ignoradas difiere por la divergencia de fechas en CSV documentada
    # arriba, pero cada línea que SÍ se reconoció como consumo debe tener
    # el mismo factor y la misma emisión en ambos motores.
    py_leidas = [l for l in clasificadas if l.estado == "leido"]
    ts_leidas = [l for l in esperado["lineas"] if l["estado"] == "leido"]
    assert len(py_leidas) == len(ts_leidas), "distinto numero de lineas RECONOCIDAS del archivo"

    for py_linea, ts_linea in zip(py_leidas, ts_leidas):
        assert py_linea.campo_leido == ts_linea["campoLeido"]
        assert py_linea.factor_asignado == ts_linea["factorAsignado"]
        assert py_linea.emision_kg == pytest.approx(ts_linea["emisionKg"], rel=1e-6)


def test_paridad_xlsx_multihoja():
    """Mismo criterio que los casos CSV, pero sobre un .xlsx real de
    varias hojas (una de ellas sin datos de consumo), para ejercitar el
    lector openpyxl en vez del CSV estándar."""
    caso = "Bitacora_Riego_FundoLosOlivos"
    esperado = json.loads((FIXTURES / f"{caso}.expected.json").read_text(encoding="utf-8"))
    ruta_xlsx = FIXTURES / f"{caso}.xlsx"

    parseado = parsear_archivo(str(ruta_xlsx), "xlsx")
    clasificadas = ghg_classify(parseado.lineas)
    resumen = resumir_lineas(clasificadas)

    esperado_resumen = esperado["resumen"]
    assert resumen["leidas"] == esperado_resumen["leidas"]
    assert resumen["emisionKg"] == pytest.approx(esperado_resumen["emisionKg"], rel=1e-6)
    for scope in ("s1", "s2", "s3"):
        assert resumen["scopes"][scope] == pytest.approx(esperado_resumen["scopes"][scope], rel=1e-6)


def test_ubl_xml_factura_diesel():
    """Verificación golden (no fixture TS — DOMParser no existe fuera del
    navegador) sobre una factura SUNAT UBL 2.1 real del repo: 1200 L de
    diésel B5 a 2.68 kgCO2e/L = 3216 kgCO2e, todo en Alcance 1. Cabecera
    (RUC, proveedor, monto) verificada contra el XML de origen."""
    parseado = parsear_archivo(str(DATA / "F001-001234.xml"), "xml")
    clasificadas = ghg_classify(parseado.lineas)
    resumen = resumir_lineas(clasificadas)

    assert parseado.cabecera.invoice_id == "F001-001234"
    assert parseado.cabecera.ruc == "20100123456"
    assert parseado.cabecera.proveedor == "PETROPERU S.A."
    assert parseado.cabecera.monto_total == pytest.approx(17040.0)

    assert resumen["leidas"] == 1
    assert resumen["emisionKg"] == pytest.approx(1200 * 2.68)
    assert resumen["scopes"]["s1"] == pytest.approx(3.216)
    assert resumen["scopes"]["s2"] == 0
    assert resumen["scopes"]["s3"] == 0
