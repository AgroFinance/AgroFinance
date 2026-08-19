// Reproduce EXACTLY the recognition logic from src/lib/parseArchivo.ts + src/lib/ghgClassify.ts
// (copied verbatim, not reimplemented) to validate against real generated .xlsx files
// without fighting Node's TS/ESM module resolution.
const XLSX = require('xlsx');
const fs = require('fs');

const SUFIJOS_UNIDAD = [
  [/_?(kwh)$/i, 'kWh'],
  [/_?(mwh)$/i, 'MWh'],
  [/_?(gal|galones)$/i, 'gal'],
  [/_?(lt|ltr|litros?|l)$/i, 'L'],
  [/_?(kg|kilos)$/i, 'kg'],
  [/_?(tn|ton|toneladas?|t)$/i, 't'],
  [/_?(km)$/i, 'km'],
  [/_?(u|und|unidades?)$/i, 'u'],
  [/_?(pct|porcentaje|%)$/i, '%'],
];
function unidadDeColumna(col) {
  for (const [re, uni] of SUFIJOS_UNIDAD) if (re.test(col)) return uni;
  return '';
}
function aNumero(v) {
  if (typeof v === 'number') return isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  const limpio = v.replace(/\s/g, '').replace(/,/g, '.');
  const n = Number(limpio);
  return limpio !== '' && isFinite(n) ? n : null;
}

const REGLAS = [
  { factor: 'dieselGalon', palabras: /(diesel|diésel|petroleo|combustible|d2|b5).*(gal)|(gal).*(diesel|diésel)/i, unidades: /^(gal|galon|galones|gl)$/i },
  { factor: 'dieselLitro', palabras: /diesel|diésel|petroleo|combustible|\bd2\b|\bb5\b/i, unidades: /^(l|lt|ltr|litro|litros)$/i },
  { factor: 'electricidadSEIN', palabras: /electric|energia|energía|kwh|sein|consumo.*luz|riego.*kwh|packing.*kwh/i, unidades: /^(kwh|kw-h|mwh)$/i },
  { factor: 'ureaProduccion', palabras: /urea/i, unidades: /^(kg|kilos|kilogramos|t|tn|ton)$/i },
  { factor: 'nitratoAmonioProduccion', palabras: /nitrato.*amonio|nitroamonio|\ban\b/i, unidades: /^(kg|kilos|t|tn|ton)$/i },
  { factor: 'n2oSuelos', palabras: /fertiliz|nitrogenado|abono|\bn\b.*aplicado/i, unidades: /^(kg|kilos|t|tn|ton)$/i },
  { factor: 'cartonCorrugado', palabras: /carton|cartón|caja|corrugad/i, unidades: /^(kg|kilos|u|und|unidad|cajas)$/i },
  { factor: 'filmPlastico', palabras: /film|plastico|plástico|ldpe|stretch|esquinero/i, unidades: /^(kg|kilos)$/i },
  { factor: 'paletMadera', palabras: /palet|pallet|parihuela/i, unidades: /^(u|und|unidad|unidades|palets)$/i },
  { factor: 'camionReefer', palabras: /camion|camión|terrestre|flete.*tierra|distancia.*camion/i, unidades: /^(t.?km|tkm|km)$/i },
  { factor: 'buqueReefer', palabras: /maritim|marítim|buque|naviera|reefer|flete.*mar|distancia.*mar/i, unidades: /^(t.?km|tkm|km)$/i },
];
const normalizarUnidad = (u) => (u || '').trim().replace(/\./g, '');
function reconocerFactor(campoLeido, unidad) {
  const campo = campoLeido || '';
  const uni = normalizarUnidad(unidad);
  for (const r of REGLAS) if (r.unidades && r.unidades.test(uni) && r.palabras.test(campo)) return r.factor;
  for (const r of REGLAS) if (r.palabras.test(campo)) return r.factor;
  return null;
}

function parsearHoja(filePath) {
  const wb = XLSX.readFile(filePath);
  const lineas = [];
  for (const nombreHoja of wb.SheetNames) {
    const hoja = wb.Sheets[nombreHoja];
    const filas = XLSX.utils.sheet_to_json(hoja, { defval: null, raw: true });
    if (!filas.length) continue;
    const cols = Object.keys(filas[0]);
    filas.forEach((f, i) => {
      for (const col of cols) {
        const valor = aNumero(f[col]);
        if (valor === null) continue;
        lineas.push({ campoLeido: col, valor, unidad: unidadDeColumna(col), hoja: nombreHoja, fila: i + 2 });
      }
    });
  }
  return lineas;
}

const archivos = ['test_campo.xlsx', 'test_packing.xlsx', 'test_logistica.xlsx'];
const BASE = 'C:\\Users\\EQUIPO\\AppData\\Local\\Temp\\claude\\C--AGROFINANCE\\19295ab2-5159-4a4c-9d4b-970cae7dac36\\scratchpad\\';

for (const nombre of archivos) {
  console.log('\n=== ' + nombre + ' ===');
  const lineas = parsearHoja(BASE + nombre);
  // Agrupar por columna para no repetir fila por fila
  const porColumna = {};
  for (const l of lineas) {
    const key = l.campoLeido;
    if (!porColumna[key]) porColumna[key] = { unidad: l.unidad, n: 0, sum: 0 };
    porColumna[key].n++;
    porColumna[key].sum += l.valor;
  }
  for (const [col, info] of Object.entries(porColumna)) {
    const factor = reconocerFactor(col, info.unidad);
    const estado = factor ? `RECONOCIDO -> ${factor}` : 'IGNORADO (sin factor)';
    console.log(`  ${col.padEnd(30)} unidad="${info.unidad}"  n=${info.n}  ${estado}`);
  }
}
