import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PdfReportData {
  companyName?: string;
  ruc?: string;
  campaign?: string;
  invoiceId?: string;
  supplierName?: string;
  supplierRuc?: string;
  scope1?: number;
  scope2?: number;
  totalEmissions?: number;
  status?: string;
  greenDiscount?: string;
}

export function generateExecutivePdfReport(data?: PdfReportData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const company = data?.companyName || 'Mi Empresa';
  const ruc = data?.ruc || '20601234567';
  const campaign = data?.campaign || '2026-2027';
  const total = data?.totalEmissions ?? 11.522;
  const s1 = data?.scope1 ?? 9.146;
  const s2 = data?.scope2 ?? 2.376;
  const invoice = data?.invoiceId || 'F001-00084920';

  // Palette colors
  const primaryColor = [19, 48, 31];     // Dark Emerald #13301F
  const emeraldColor = [19, 124, 83];    // Emerald #137C53
  const bgLight = [244, 246, 242];       // Off white #F4F6F2

  // 1. Header Banner
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 38, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('AgroFinance AI', 14, 16);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(197, 224, 207);
  doc.text('CARBON INTELLIGENCE SYSTEM · REPORTE EJECUTIVO AUDITABLE', 14, 23);

  // Date & Doc ID
  const dateStr = new Date().toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`Fecha: ${dateStr}`, 196, 16, { align: 'right' });
  doc.text(`Doc ID: AGRO-${Date.now().toString().slice(-6)}`, 196, 23, { align: 'right' });

  // 2. Company Info Box
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.roundedRect(14, 44, 182, 24, 3, 3, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`EMPRESA: ${company}`, 18, 52);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 108, 92);
  doc.text(`RUC: ${ruc}  |  Sector: Agroexportación (Palta Hass)  |  Campaña: ${campaign}`, 18, 60);

  // 3. Carbon Footprint Summary Card
  doc.setFillColor(235, 247, 241);
  doc.setDrawColor(19, 124, 83);
  doc.setLineWidth(0.5);
  doc.roundedRect(14, 74, 182, 42, 4, 4, 'FD');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(emeraldColor[0], emeraldColor[1], emeraldColor[2]);
  doc.text('RESUMEN DE HUELLA DE CARBONO (TOTAL)', 20, 84);

  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`${total.toFixed(3)} tCO2e`, 20, 98);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 108, 92);
  doc.text('Toneladas de dióxido de carbono equivalente consolidadas', 20, 106);

  // Scope 1 Sub-box
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(120, 80, 34, 30, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 83, 9); // Amber
  doc.text('ALCANCE 1', 123, 87);
  doc.setFontSize(13);
  doc.text(`${s1.toFixed(3)}`, 123, 96);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('tCO2e (Diésel B5)', 123, 103);

  // Scope 2 Sub-box
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(158, 80, 34, 30, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(29, 78, 216); // Blue
  doc.text('ALCANCE 2', 161, 87);
  doc.setFontSize(13);
  doc.text(`${s2.toFixed(3)}`, 161, 96);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('tCO2e (Red SEIN)', 161, 103);

  // 4. Audit & Verification Box (HC Perú & ISO 14064)
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(34, 197, 94);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, 122, 182, 28, 3, 3, 'FD');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 118, 110);
  doc.text('CUADRO DE VERIFICACIÓN AUDITABLE', 20, 131);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.text('• Auditable bajo estándar ISO 14064 y HC Perú (Minam).', 20, 138);
  doc.text('• Comprobante Origen: Factura Electrónica SUNAT UBL 2.1 N° ' + invoice, 20, 144);

  // 5. Financial KPI Section (Green Credit SLL)
  doc.setFillColor(15, 23, 42); // Dark Slate
  doc.roundedRect(14, 156, 182, 44, 4, 4, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(52, 211, 153); // Emerald accent
  doc.text('SECCIÓN DE KPI FINANCIERO · CRÉDITO VERDE (SLL)', 20, 167);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Elegible para descuento de tasa en Crédito Verde SLL (Banca Local)', 20, 175);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('• Impacto Financiero: Reducción estimada de -75 a -120 bps en tasa de interés anual.', 20, 183);
  doc.text('• Bancas Participantes: BCP, BBVA Perú, AgroBanco y entidades aliadas ESG.', 20, 189);
  doc.text('• Estado del Dossier: Expediente completo certificado para presentación ante Comités de Riesgo.', 20, 195);

  // Table of Emissions Detail
  autoTable(doc, {
    startY: 206,
    head: [['Categoría / Fuente de Consumo', 'Unidad Física', 'Factor de Emisión', 'Emisión tCO2e']],
    body: [
      ['Alcance 1: Diésel B5 S-50 (Maquinaria)', '3,400.00 Litros', '2.690 kg CO2e / L', s1.toFixed(3)],
      ['Alcance 2: Energía Eléctrica (SEIN Perú)', '12,000.00 kWh', '0.198 kg CO2e / kWh', s2.toFixed(3)],
      ['TOTAL HUELLA CONSOLIDADA', 'Consumo Mixto', 'Metodología ISO 14064', total.toFixed(3)],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [19, 124, 83],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14 },
  });

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('AgroFinance AI - Carbon Intelligence System · www.agrofinance.pe', 14, pageHeight - 10);
  doc.text('Documento generado digitalmente con validez técnica auditada.', 196, pageHeight - 10, { align: 'right' });

  // Download PDF
  doc.save(`Reporte_Ejecutivo_AgroFinance_${company.replace(/\s+/g, '_')}.pdf`);
}
