'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import {
  Upload, FileCode, CheckCircle2,
  Zap, Sparkles,
  Calculator,
  Award, Download,
  ShieldCheck, Building2, Fuel, Receipt, ArrowRight, RefreshCw, AlertTriangle, Boxes,
} from 'lucide-react';
import DashboardShell from '@/shared/components/layout/DashboardShell';
import TerminoTooltip from '@/shared/components/ui/TerminoTooltip';
import DepuracionLineas from '@/modules/data-loader/infrastructure/ui/DepuracionLineas';
import Link from 'next/link';
import { generateExecutivePdfReport } from '@/modules/compliance-reports/infrastructure/exporters/pdfGenerator';
import { parsearUBL, huellaArchivo, type CabeceraUBL } from '@/modules/data-loader/infrastructure/parsers/parseArchivo';
import { ghgClassify, resumirLineas, type LineaClasificada, type ResumenClasificacion } from '@/modules/carbon-accounting/domain/ghgClassify';
import { useFuentesDatos, type FuenteDatos } from '@/modules/data-loader/domain/datosPrueba';
import { useSesionUpload } from '@/modules/data-loader/infrastructure/services/useSesionUpload';
import { MECANISMO_META, type Mecanismo } from '@/modules/carbon-accounting/domain/emissionFactors';

type Stage = 'idle' | 'uploading' | 'scanning' | 'complete' | 'error';

interface ResultadoCarga {
  fileName: string;
  huella: string;
  cabecera: CabeceraUBL;
  lineas: LineaClasificada[];
  hojas: string[];
  columnas: string[];
  filasPreview: (string | number)[][];
  resumenServidor?: ResumenClasificacion;
}

const sampleXmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
    <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
    <cbc:ID>F001-00084920</cbc:ID>
    <cbc:IssueDate>2026-06-15</cbc:IssueDate>
    <cac:AccountingSupplierParty>
        <cac:Party>
            <cac:PartyIdentification>
                <cbc:ID schemeID="6">20543918231</cbc:ID>
            </cac:PartyIdentification>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>PETROPERU DISTRIBUCION S.A.</cbc:RegistrationName>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingSupplierParty>
    <cac:InvoiceLine>
        <cbc:InvoicedQuantity unitCode="LTR">3400.00</cbc:InvoicedQuantity>
        <cbc:LineExtensionAmount currencyID="PEN">28560.00</cbc:LineExtensionAmount>
        <cac:Item>
            <cbc:Description>DIESEL B5 S-50 USOS AGRICOLAS Y MAQUINARIA DE CAMPO</cbc:Description>
        </cac:Item>
    </cac:InvoiceLine>
    <cac:InvoiceLine>
        <cbc:InvoicedQuantity unitCode="KWH">12000.00</cbc:InvoicedQuantity>
        <cbc:LineExtensionAmount currencyID="PEN">19940.00</cbc:LineExtensionAmount>
        <cac:Item>
            <cbc:Description>SUMINISTRO ELECTRICIDAD RED SEIN PERU PLANTA PACKING</cbc:Description>
        </cac:Item>
    </cac:InvoiceLine>
    <cac:InvoiceLine>
        <cbc:InvoicedQuantity unitCode="ZZ">1.00</cbc:InvoicedQuantity>
        <cbc:LineExtensionAmount currencyID="PEN">4200.00</cbc:LineExtensionAmount>
        <cac:Item>
            <cbc:Description>SERVICIO DE MANTENIMIENTO PREVENTIVO DE LINEA DE PROCESO</cbc:Description>
        </cac:Item>
    </cac:InvoiceLine>
    <cac:InvoiceLine>
        <cbc:InvoicedQuantity unitCode="NIU">0.00</cbc:InvoicedQuantity>
        <cbc:LineExtensionAmount currencyID="PEN">0.00</cbc:LineExtensionAmount>
        <cac:Item>
            <cbc:Description>DESCUENTO POR VOLUMEN ACUMULADO CAMPANA</cbc:Description>
        </cac:Item>
    </cac:InvoiceLine>
    <cac:LegalMonetaryTotal>
        <cbc:PayableAmount currencyID="PEN">52700.00</cbc:PayableAmount>
    </cac:LegalMonetaryTotal>
</Invoice>`;

const AREA_POR_MECANISMO: Partial<Record<Mecanismo, string>> = {
  riego: 'Riego', maquinaria: 'Producción', n2oCampo: 'Producción', fertilizante: 'Producción',
  packing: 'Finanzas', empaque: 'Logística', flete: 'Logística',
};

const fmt = (n: number, d = 3) => n.toLocaleString('es-PE', { minimumFractionDigits: d, maximumFractionDigits: d });

export function UploadCenterView() {
  const [stage, setStage] = useState<Stage>('idle');
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [scanIndex, setScanIndex] = useState(0);
  const [resultado, setResultado] = useState<ResultadoCarga | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [, setFuentes] = useFuentesDatos();
  const idFuente = useRef<string | null>(null);
  const sesion = useSesionUpload();
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scanMessages = [
    'Parseando estructura XML SUNAT UBL 2.1...',
    'Extrayendo RUC de Proveedor y N° de Factura Electrónica...',
    'Identificando consumos físicos (Litros Diésel / kWh SEIN)...',
    'Aplicando factores de emisión oficial Minam (HC Perú)...',
    'Calculando huella de carbono Alcance 1 (Combustible de campo)...',
    'Calculando huella de carbono Alcance 2 (Electricidad de packing)...',
    'Validando trazabilidad auditable según ISO 14064-1...',
    'Registrando el comprobante como fuente vinculada...',
  ];

  const resumen = useMemo(
    () => (resultado ? resultado.resumenServidor ?? resumirLineas(resultado.lineas) : null),
    [resultado],
  );

  useEffect(() => {
    if (!resultado || !resumen || stage !== 'complete') return;
    const top = (Object.entries(resumen.porMecanismo) as [Mecanismo, number][]).sort((a, b) => b[1] - a[1])[0];
    const area = (top && AREA_POR_MECANISMO[top[0]]) || 'Producción';

    setFuentes((prev) => {
      const existente = prev.find(
        (f) => !f.isDemo && (f.huella === resultado.huella || f.archivo === resultado.fileName),
      );
      idFuente.current = existente?.id ?? idFuente.current ?? `upload-${Date.now()}`;
      const fuente: FuenteDatos = {
        id: idFuente.current,
        area,
        archivo: resultado.fileName,
        actualizado: new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }),
        estado: 'sincronizado',
        origen: 'upload',
        huella: resultado.huella,
        hojas: resultado.hojas,
        lineas: resultado.lineas.slice(0, 400),
        resumen,
        preview: { columnas: resultado.columnas, filas: resultado.filasPreview },
      };
      return existente ? prev.map((f) => (f.id === existente.id ? fuente : f)) : [...prev, fuente];
    });
  }, [resultado, resumen, stage, setFuentes]);

  const procesarDemo = () => {
    setStage('uploading');
    setProgress(0);
    setErrorMsg('');

    let p = 0;
    const uploadInterval = setInterval(() => {
      p += 25;
      if (p < 100) { setProgress(p); return; }
      clearInterval(uploadInterval);
      setProgress(100);

      parsearUBL(sampleXmlContent, 'Factura_SUNAT_UBL21_Demo.xml')
        .then((r) => iniciarEscaneo({
          fileName: 'Factura_SUNAT_UBL21_Demo.xml',
          huella: 'demo::ubl::F001-00084920',
          cabecera: r.cabecera,
          lineas: ghgClassify(r.lineas),
          hojas: r.hojas, columnas: r.columnas, filasPreview: r.filasPreview,
        }))
        .catch((e) => {
          setErrorMsg(e instanceof Error ? e.message : 'No se pudo leer el archivo');
          setStage('error');
        });
    }, 120);
  };

  const detenerCarrusel = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
  };

  const iniciarEscaneo = (r?: ResultadoCarga) => {
    detenerCarrusel();
    setStage('scanning');
    setProgress(0);
    let idx = 0;

    scanIntervalRef.current = setInterval(() => {
      idx++;
      setScanIndex(idx % scanMessages.length);
      setProgress((prev) => (r ? Math.min((idx / scanMessages.length) * 100, 98) : Math.min(prev + 4, 95)));

      if (r && idx >= scanMessages.length) {
        detenerCarrusel();
        setProgress(100);
        setResultado(r);
        localStorage.setItem('agrofinance_has_data', 'true');
        setTimeout(() => setStage('complete'), 400);
      }
    }, 320);
  };

  useEffect(() => {
    if (sesion.estado !== 'procesando') detenerCarrusel();
    return detenerCarrusel;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesion.estado]);

  useEffect(() => {
    if (sesion.estado === 'subiendo') {
      setStage('uploading');
      setProgress(sesion.progresoSubida);
      return;
    }
    if (sesion.estado === 'procesando') {
      if (stage !== 'scanning') return iniciarEscaneo();
      return;
    }
    if (sesion.estado === 'completado' && sesion.resultado) {
      const r = sesion.resultado;
      setResultado({
        fileName: files[0]?.name ?? 'archivo.xlsx',
        huella: files[0] ? huellaArchivo(files[0]) : '',
        cabecera: r.cabecera ?? { invoiceId: files[0]?.name ?? '—', ruc: '—', proveedor: '—', fecha: '—', moneda: 'PEN', montoTotal: null },
        lineas: r.lineasPreview,
        hojas: r.hojas, columnas: r.columnas, filasPreview: r.filasPreview,
        resumenServidor: r.resumen,
      });
      localStorage.setItem('agrofinance_has_data', 'true');
      setProgress(100);
      setStage('complete');
      return;
    }
    if (sesion.estado === 'error') {
      setErrorMsg(sesion.error || 'No se pudo procesar el archivo.');
      setStage('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesion.estado, sesion.progresoSubida, sesion.resultado, sesion.error]);

  const handleSimulateDemoXml = () => {
    const demoFile = new File([sampleXmlContent], 'Factura_SUNAT_UBL21_Demo.xml', { type: 'text/xml' });
    setFiles([demoFile]);
    procesarDemo();
  };

  const extractFilesFromItems = async (items: DataTransferItemList): Promise<File[]> => {
    const result: File[] = [];
    const traverse = async (entry: any) => {
      if (!entry) return;
      if (entry.isFile) {
        await new Promise<void>((resolve) => {
          entry.file((file: File) => {
            result.push(file);
            resolve();
          }, () => resolve());
        });
      } else if (entry.isDirectory) {
        const reader = entry.createReader();
        const entries = await new Promise<any[]>((resolve) => {
          reader.readEntries((entriesList: any[]) => resolve(entriesList), () => resolve([]));
        });
        for (const child of entries) {
          await traverse(child);
        }
      }
    };
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry ? items[i].webkitGetAsEntry() : null;
      if (entry) await traverse(entry);
      else {
        const file = items[i].getAsFile();
        if (file) result.push(file);
      }
    }
    return result;
  };

  const onDrop = useCallback(async (acceptedFiles: File[], fileRejections: any[], event: any) => {
    let allFiles = acceptedFiles;
    if (event && event.dataTransfer && event.dataTransfer.items) {
      const extracted = await extractFilesFromItems(event.dataTransfer.items);
      if (extracted.length > 0) allFiles = extracted;
    }

    const validExtensions = ['xml', 'xlsx', 'xls', 'csv', 'ods', 'pdf', 'docx', 'doc', 'txt'];
    const validFiles = allFiles.filter(f => {
      const ext = (f.name.split('.').pop() || '').toLowerCase();
      return validExtensions.includes(ext);
    });

    if (!validFiles.length) {
      setErrorMsg('No se encontraron archivos procesables (.xml, .xlsx, .csv, .pdf, .docx) en la carpeta o selección.');
      return;
    }

    setFiles(validFiles);
    setErrorMsg('');
    const targetFile = validFiles.find(f => f.name.toLowerCase().endsWith('.xml')) || validFiles[0];
    sesion.subir(targetFile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExportDossier = () => {
    setExportSuccess(true);
    if (resultado && resumen) {
      generateExecutivePdfReport({
        companyName: 'Chavín de Huántar S.A.C.',
        ruc: '20601234567',
        campaign: '2026-2027',
        invoiceId: resultado.cabecera.invoiceId,
        supplierName: resultado.cabecera.proveedor,
        supplierRuc: resultado.cabecera.ruc,
        scope1: resumen.scopes.s1,
        scope2: resumen.scopes.s2,
        totalEmissions: resumen.emisionTon,
      });
    } else {
      generateExecutivePdfReport();
    }
    setTimeout(() => setExportSuccess(false), 5000);
  };

  const reset = () => {
    detenerCarrusel();
    sesion.reset();
    setStage('idle');
    setFiles([]);
    setProgress(0);
    setScanIndex(0);
    setResultado(null);
    setExportSuccess(false);
    setErrorMsg('');
    idFuente.current = null;
  };

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    multiple: true,
    noClick: false,
  });

  const lineasLeidas = resultado?.lineas.filter((l) => l.estado === 'leido') ?? [];

  return (
    <DashboardShell>
      <div className="relative max-w-4xl mx-auto pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="badge badge-emerald mb-4 inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold">
            <Zap className="w-3.5 h-3.5 text-emerald-600" />
            Lector Automático de Facturas SUNAT UBL 2.1<TerminoTooltip termino="UBL 2.1" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
            Carga e Interpretación de <span className="text-emerald-600">Facturas XML</span>
          </h1>
          <p className="text-slate-600 text-base max-w-xl mx-auto">
            Convierte litros de diésel y kWh de tus comprobantes electrónicos en huella de carbono auditable (Alcance 1 y 2) para Créditos Verdes.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {stage === 'idle' && (
            <motion.div key="idle" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="space-y-6">
              <div
                {...getRootProps()}
                className={`relative rounded-3xl border-2 border-dashed p-12 text-center cursor-pointer transition-all duration-300 overflow-hidden ${
                  isDragActive
                    ? 'border-emerald-600 bg-emerald-50 scale-[1.01]'
                    : errorMsg
                    ? 'border-red-500 bg-red-50'
                    : 'border-slate-300 bg-white hover:border-emerald-500 hover:bg-slate-50/80 shadow-sm'
                }`}
              >
                <input {...getInputProps()} />

                <div className="relative z-10">
                  <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-600 shadow-inner">
                    <FileCode className="w-8 h-8" />
                  </div>

                  {isDragActive ? (
                    <p className="text-emerald-700 text-xl font-bold mb-4">¡Suelta tu carpeta o facturas de SUNAT / Excel / CSV aquí!</p>
                  ) : errorMsg ? (
                    <p className="text-red-500 text-xl font-bold mb-4">{errorMsg}</p>
                  ) : (
                    <>
                      <h3 className="text-xl font-bold text-slate-800 mb-1">
                        Arrastra y suelta tus facturas electrónicas, Excel o carpeta completa
                      </h3>
                      <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
                        Soporta carpetas completas, comprobantes SUNAT UBL 2.1, Excel de campo, mermas y aduanas.
                      </p>

                      <div className="mb-6 flex flex-col items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleSimulateDemoXml(); }}
                          className="px-6 py-3.5 rounded-full font-bold text-sm text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 shadow-lg shadow-emerald-600/30 flex items-center gap-2.5 transition-all transform hover:-translate-y-0.5"
                        >
                          <Sparkles className="w-4 h-4 text-emerald-200" />
                          <span>⚡ Procesar Factura XML de Prueba (1-Clic Demo)</span>
                        </button>
                        <span className="text-xs text-slate-400">
                          o selecciona tus propios archivos/carpetas desde tu computadora
                        </span>
                      </div>
                    </>
                  )}

                  <div className="flex flex-wrap justify-center gap-2 text-xs">
                    {['.XML (SUNAT UBL 2.1)', '.XLSX / .XLS', '.CSV', '.PDF / .DOCX', 'Carpetas'].map(ext => (
                      <span key={ext} className="px-3 py-1 rounded-md bg-slate-100 font-semibold text-slate-600">{ext}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-3">
                  <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600 shrink-0"><Receipt className="w-5 h-5" /></div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 mb-1 inline-flex items-center">SUNAT UBL 2.1<TerminoTooltip termino="UBL 2.1" /></h4>
                    <p className="text-xs text-slate-500">Lectura automática de volúmenes físicos sin digitación manual.</p>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-3">
                  <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600 shrink-0"><ShieldCheck className="w-5 h-5" /></div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 mb-1">Auditable HC Perú</h4>
                    <p className="text-xs text-slate-500">Factores de emisión oficial del Ministerio del Ambiente (Minam).</p>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-3">
                  <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600 shrink-0"><Award className="w-5 h-5" /></div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 mb-1 inline-flex items-center">Crédito Verde (SLL)<TerminoTooltip termino="SLL" /></h4>
                    <p className="text-xs text-slate-500">Dossier directo para descuento de tasas en BCP, BBVA y AgroBanco.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {stage === 'uploading' && (
            <motion.div key="uploading" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-lg">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <FileCode className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Cargando Factura XML...</h3>
              <p className="text-slate-500 text-sm mb-6">{files.map(f => f.name).join(', ')}</p>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden max-w-md mx-auto">
                <motion.div className="h-full rounded-full bg-emerald-500" animate={{ width: `${progress}%` }} transition={{ ease: 'easeOut' }} />
              </div>
              <p className="text-sm text-emerald-600 font-bold mt-3">{progress}%</p>
            </motion.div>
          )}

          {stage === 'error' && (
            <motion.div key="error" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="bg-white rounded-3xl p-10 text-center border border-red-100 shadow-lg">
              <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-5">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No se pudo procesar el archivo</h3>
              <p className="text-slate-600 text-sm mb-6 max-w-md mx-auto">{errorMsg}</p>
              <button onClick={reset} className="px-6 py-3 rounded-full bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-colors">
                Intentar con otro archivo
              </button>
            </motion.div>
          )}

          {stage === 'scanning' && (
            <motion.div key="scanning" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="bg-white rounded-3xl p-8 sm:p-12 shadow-2xl border border-slate-100 relative overflow-hidden text-left">
              <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center animate-pulse shrink-0 border border-emerald-100">
                    <Calculator className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider mb-2">
                      <Sparkles className="w-3.5 h-3.5" /> Procesando con Kapi AI
                    </div>
                    <AnimatePresence mode="wait">
                      <motion.h3 key={scanIndex} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="text-lg font-bold text-slate-800">
                        {scanMessages[scanIndex]}
                      </motion.h3>
                    </AnimatePresence>
                  </div>
                </div>
                <div className="text-right hidden sm:block">
                  <div className="text-3xl font-black text-emerald-600">{Math.round(progress)}%</div>
                  <div className="text-xs text-slate-400 font-medium uppercase tracking-widest mt-1">Extrayendo Datos</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="h-4 w-24 bg-slate-200 rounded-md animate-pulse" />
                      <div className="h-8 w-8 bg-slate-200 rounded-xl animate-pulse" />
                    </div>
                    <div className="h-10 w-32 bg-slate-200 rounded-lg animate-pulse" />
                    <div className="h-3 w-4/5 bg-slate-200 rounded-md animate-pulse" />
                  </div>
                ))}
              </div>

              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <motion.div className="h-full rounded-full bg-emerald-500" animate={{ width: `${progress}%` }} transition={{ ease: 'easeOut' }} />
              </div>
            </motion.div>
          )}

          {stage === 'complete' && resultado && resumen && (
            <motion.div key="complete" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-8">
              <div className="bg-emerald-600 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <span className="inline-block px-3 py-1 bg-white/20 text-emerald-100 rounded-full text-xs font-semibold mb-1">
                      Factura Procesada con Éxito
                    </span>
                    <h2 className="text-2xl font-black">Cálculo de Huella Completado</h2>
                    <p className="text-emerald-100 text-sm">
                      Factura N° {resultado.cabecera.invoiceId} · Proveedor: {resultado.cabecera.proveedor}
                    </p>
                  </div>
                </div>
                <div className="text-center sm:text-right shrink-0">
                  <span className="text-xs text-emerald-200 uppercase tracking-widest block font-medium">Emisión Total</span>
                  <span className="text-4xl font-extrabold">{fmt(resumen.emisionTon)} <span className="text-lg">tCO₂e</span></span>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-[rgba(90,190,145,0.3)] bg-[rgba(90,190,145,0.08)] p-4">
                <Boxes className="w-5 h-5 text-[#137C53] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[rgba(80,108,92,0.9)]">
                  Este comprobante quedó registrado como <strong className="text-[#13301F]">fuente vinculada</strong> en{' '}
                  <Link href="/configuracion/" className="underline font-semibold text-[#137C53]">Configuración</Link>{' '}
                  y su emisión ya está sumada en el{' '}
                  <Link href="/dashboard/" className="underline font-semibold text-[#137C53]">Dashboard</Link>{' '}
                  y en el{' '}
                  <Link href="/analisis/?tab=huella" className="underline font-semibold text-[#137C53]">inventario por alcance</Link>.
                  No hace falta volver a subirlo.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Emisiones</span>
                    <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><Calculator className="w-5 h-5" /></span>
                  </div>
                  <div className="text-4xl font-black text-emerald-600">
                    {fmt(resumen.emisionTon)} <span className="text-base font-bold text-slate-500">tCO₂e</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {resumen.leidas} línea(s) del comprobante entraron al cálculo; {resumen.ignoradas} quedaron fuera con motivo declarado.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Alcance 1 (Directas)</span>
                    <span className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Fuel className="w-5 h-5" /></span>
                  </div>
                  <div className="text-4xl font-black text-amber-600">
                    {fmt(resumen.scopes.s1)} <span className="text-base font-bold text-slate-500">tCO₂e</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {lineasLeidas.filter(l => l.scopeAsignado === 1).map(l => `${l.valor?.toLocaleString('es-PE')} ${l.unidad}`).join(' · ') || 'Sin líneas de Alcance 1'}
                  </p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Alcance 2 (Energía SEIN)</span>
                    <span className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Zap className="w-5 h-5" /></span>
                  </div>
                  <div className="text-4xl font-black text-blue-600">
                    {fmt(resumen.scopes.s2)} <span className="text-base font-bold text-slate-500">tCO₂e</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {lineasLeidas.filter(l => l.scopeAsignado === 2).map(l => `${l.valor?.toLocaleString('es-PE')} ${l.unidad}`).join(' · ') || 'Sin líneas de Alcance 2'}
                  </p>
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Detalles Extraídos de la Factura UBL 2.1</h3>
                    <p className="text-xs text-slate-500">Datos verificados mediante el parser de Comprobante Electrónico SUNAT</p>
                  </div>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700 text-xs font-bold">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Auditable para HC Perú (Minam)</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">N° Comprobante</span>
                    <strong className="text-slate-900 font-mono text-base">{resultado.cabecera.invoiceId}</strong>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">RUC Proveedor</span>
                    <strong className="text-slate-900 font-mono">{resultado.cabecera.ruc}</strong>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Razón Social</span>
                    <strong className="text-slate-900">{resultado.cabecera.proveedor}</strong>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Monto Total</span>
                    <strong className="text-emerald-700 text-base">
                      {resultado.cabecera.montoTotal === null
                        ? 'sin dato'
                        : `${resultado.cabecera.moneda} ${resultado.cabecera.montoTotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`}
                    </strong>
                  </div>
                </div>

                <DepuracionLineas
                  titulo={resultado.fileName}
                  lineas={resultado.lineas}
                  onCambio={(lineas) => setResultado((prev) => (prev ? { ...prev, lineas } : prev))}
                />

                {Object.keys(resumen.porMecanismo).length > 0 && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs text-slate-600 space-y-1">
                    <div className="font-semibold text-slate-800">Distribución por mecanismo:</div>
                    {(Object.entries(resumen.porMecanismo) as [Mecanismo, number][])
                      .sort((a, b) => b[1] - a[1])
                      .map(([m, kg]) => (
                        <p key={m}>• {MECANISMO_META[m].label} → {fmt(kg / 1000)} tCO₂e</p>
                      ))}
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white p-8 rounded-3xl shadow-2xl space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                  <div className="space-y-2 max-w-xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                      <Building2 className="w-3.5 h-3.5" /> Preparado para Banca Local (BCP, BBVA, AgroBanco)
                    </div>
                    <h3 className="text-2xl font-extrabold text-white">Dossier Certificado para Crédito Verde (SLL)</h3>
                    <p className="text-slate-300 text-sm leading-relaxed">
                      Genera el expediente ambiental verificado que exige la banca para solicitar la reducción de la tasa de interés anual (-75 a -120 bps) por metas de descarbonización.
                    </p>
                  </div>
                  <div className="w-full md:w-auto shrink-0 space-y-3">
                    <button
                      onClick={handleExportDossier}
                      className="w-full sm:w-auto px-8 py-4 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold rounded-full transition-all shadow-xl shadow-emerald-400/20 flex items-center justify-center gap-3 text-base"
                    >
                      <Download className="w-5 h-5" />
                      <span>Exportar a Dossier para Crédito Verde (SLL)</span>
                    </button>
                    {exportSuccess && (
                      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-300 text-xs text-center font-semibold">
                        ✓ Dossier descargado correctamente. Listo para enviar al comité de riesgos.
                      </motion.div>
                    )}
                    <Link
                      href="/reportes/"
                      className="w-full sm:w-auto px-8 py-3 border border-white/25 text-white/90 font-semibold rounded-full transition-all flex items-center justify-center gap-2 text-sm hover:bg-white/10"
                    >
                      <span>Descargar informe técnico completo</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                <button
                  onClick={reset}
                  className="px-6 py-3.5 rounded-full border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 bg-white"
                >
                  <RefreshCw className="w-4 h-4" />
                  Analizar Otra Factura XML
                </button>
                <Link
                  href="/dashboard/"
                  className="px-6 py-3.5 rounded-full bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 shadow-md"
                >
                  <span>Ver Panel de Control de Emisiones</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardShell>
  );
}

export default UploadCenterView;

