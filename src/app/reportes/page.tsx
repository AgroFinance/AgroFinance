'use client'

import { motion } from 'framer-motion'
import { FileText, Download, FileSpreadsheet, FileJson } from 'lucide-react'
import DashboardShell from '@/components/layout/DashboardShell'
import * as XLSX from 'xlsx'

const templates = [
  {
    id: 'sll',
    title: 'Dossier para Crédito Verde (SLL)',
    description: 'Reporte ejecutivo estructurado con indicadores clave para instituciones financieras, enfocado en Sustainability Linked Loans.',
    pdf: true,
    excel: true,
    csv: true,
  },
  {
    id: 'hc-peru',
    title: 'Reporte de Declaración Minam (HC Perú)',
    description: 'Formato estandarizado compatible con la plataforma Huella de Carbono Perú del Ministerio del Ambiente.',
    pdf: true,
    excel: true,
    csv: true,
  },
  {
    id: 'eudr',
    title: 'Informe de Cumplimiento Normativo EUDR',
    description: 'Documentación requerida para exportaciones a la Unión Europea, certificando la cadena de suministro libre de deforestación.',
    pdf: true,
    excel: false,
    csv: true,
  },
]

export default function ReportesPage() {
  const downloadExcel = (title: string) => {
    const ws = XLSX.utils.json_to_sheet([{ Reporte: title, Fecha: new Date().toLocaleDateString(), Estado: 'Generado' }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte");
    XLSX.writeFile(wb, `${title.replace(/ /g, '_')}.xlsx`);
  };

  const downloadCSV = (title: string) => {
    const ws = XLSX.utils.json_to_sheet([{ Reporte: title, Fecha: new Date().toLocaleDateString(), Estado: 'Generado' }]);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/ /g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = (title: string) => {
    // Simulated PDF download
    alert(`Simulando descarga de PDF: \${title}.pdf`);
  };

  return (
    <DashboardShell>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-[#13301F] tracking-tight">Biblioteca de Reportes</h1>
        <p className="text-[rgba(80,108,92,0.6)] mt-2 text-sm max-w-2xl">
          Descarga formatos oficiales y plantillas pre-configuradas para cumplimiento normativo, certificaciones y financiamiento verde.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template, idx) => (
          <motion.div
            key={template.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white rounded-3xl border border-[rgba(90,190,145,0.15)] shadow-sm p-6 flex flex-col h-full hover:shadow-md hover:border-[#137C53]/30 transition-all"
          >
            <div className="w-12 h-12 rounded-2xl bg-[rgba(90,190,145,0.08)] flex items-center justify-center mb-4 text-[#137C53]">
              <FileText className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-[#13301F] mb-2 leading-tight">{template.title}</h2>
            <p className="text-sm text-[rgba(80,108,92,0.7)] mb-6 flex-grow">{template.description}</p>

            <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t border-[rgba(90,190,145,0.1)]">
              {template.pdf && (
                <button
                  onClick={() => downloadPDF(template.title)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold transition-colors flex-1 justify-center border border-red-100"
                >
                  <Download className="w-3.5 h-3.5" /> PDF
                </button>
              )}
              {template.excel && (
                <button
                  onClick={() => downloadExcel(template.title)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 text-xs font-semibold transition-colors flex-1 justify-center border border-green-200"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                </button>
              )}
              {template.csv && (
                <button
                  onClick={() => downloadCSV(template.title)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition-colors flex-1 justify-center border border-blue-100"
                >
                  <FileJson className="w-3.5 h-3.5" /> CSV
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </DashboardShell>
  )
}
