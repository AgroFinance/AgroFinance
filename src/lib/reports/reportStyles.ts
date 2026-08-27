// Hoja de estilos compartida por los 3 reportes de diseño (corporativo,
// PCF, SLL) — es la unión de las clases usadas en los 3 diseños
// aprobados, para no repetirla en cada plantilla.
export const REPORT_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=DM+Serif+Display&display=swap');

  :root {
    --forest: #1B4332; --emerald: #2D6A4F; --sage: #52B788; --mint: #B7E4C7;
    --cream: #F8FBF9; --dark: #1A1A1A; --mid: #5C5C5C; --light: #A0A0A0;
    --gold: #C9A227; --gold-bg: #FDF8E8; --red-soft: #DC3545; --red-bg: #FFF5F5;
    --scope1: #1B4332; --scope2: #2D6A4F; --scope3: #52B788;
  }

  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'DM Sans',sans-serif; color:var(--dark); background:white; }
  .page { width:210mm; min-height:297mm; margin:0; padding:0; position:relative; overflow:hidden; background:white; }

  /* PORTADA */
  .cover { background:var(--forest); display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:60px 40px; height:297mm; }
  .cover .brand { color:var(--sage); font-size:14px; letter-spacing:4px; text-transform:uppercase; font-weight:500; margin-bottom:8px; }
  .cover .report-type { color:rgba(255,255,255,0.4); font-size:11px; letter-spacing:6px; text-transform:uppercase; margin-bottom:60px; }
  .cover .client { color:var(--sage); font-family:'DM Serif Display',serif; font-size:22px; margin-bottom:16px; }
  .cover .product { color:white; font-family:'DM Serif Display',serif; font-size:42px; line-height:1.2; margin-bottom:10px; }
  .cover .origin { color:rgba(255,255,255,0.5); font-size:16px; margin-bottom:60px; }
  .cover .savings-label { color:rgba(255,255,255,0.5); font-size:14px; letter-spacing:2px; text-transform:uppercase; margin-bottom:8px; }
  .cover .big-number { color:var(--sage); font-family:'DM Serif Display',serif; font-size:100px; line-height:1; letter-spacing:-3px; }
  .cover .unit { color:rgba(255,255,255,0.5); font-size:18px; margin-top:8px; margin-bottom:50px; }
  .cover .summary-row { display:flex; gap:40px; margin-bottom:70px; }
  .cover .summary-item { text-align:center; }
  .cover .summary-item .val { color:white; font-family:'DM Serif Display',serif; font-size:24px; }
  .cover .summary-item .lbl { color:rgba(255,255,255,0.4); font-size:10px; letter-spacing:1.5px; text-transform:uppercase; margin-top:4px; }
  .cover .scopes-preview { display:flex; gap:30px; margin-bottom:60px; }
  .cover .scope-pill { text-align:center; }
  .cover .scope-pill .val { color:white; font-family:'DM Serif Display',serif; font-size:28px; }
  .cover .scope-pill .lbl { color:rgba(255,255,255,0.4); font-size:11px; letter-spacing:1px; text-transform:uppercase; margin-top:4px; }
  .cover .meta { color:rgba(255,255,255,0.3); font-size:11px; line-height:1.8; }

  /* CONTENIDO */
  .content { padding:50px 55px; background:white; min-height:297mm; }
  .content h2 { font-family:'DM Serif Display',serif; font-size:28px; color:var(--forest); margin-bottom:8px; }
  .subtitle { color:var(--light); font-size:13px; margin-bottom:40px; padding-bottom:20px; border-bottom:1px solid #E8E8E8; }

  /* COMPARACIÓN ANTES/DESPUÉS */
  .compare { display:flex; gap:20px; margin-bottom:30px; }
  .compare-box { flex:1; border-radius:12px; padding:28px 24px; }
  .compare-box.before { background:var(--red-bg); border:1px solid #FFCDD2; }
  .compare-box.after { background:var(--cream); border:1px solid var(--mint); }
  .compare-box .tag { display:inline-block; padding:3px 12px; border-radius:20px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:16px; }
  .compare-box.before .tag { background:#FFCDD2; color:#B71C1C; }
  .compare-box.after .tag { background:var(--mint); color:var(--forest); }
  .compare-box .row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(0,0,0,0.06); font-size:13px; }
  .compare-box .row:last-child { border-bottom:none; }
  .compare-box .row .lbl { color:var(--mid); }
  .compare-box .row .val { font-weight:700; color:var(--dark); }
  .compare-box .total { margin-top:12px; padding-top:12px; border-top:2px solid rgba(0,0,0,0.1); display:flex; justify-content:space-between; }
  .compare-box .total .lbl { font-size:12px; color:var(--mid); text-transform:uppercase; letter-spacing:1px; }
  .compare-box .total .val { font-family:'DM Serif Display',serif; font-size:28px; }
  .compare-box.before .total .val { color:var(--red-soft); }
  .compare-box.after .total .val { color:var(--forest); }

  .savings-highlight { background:linear-gradient(135deg, var(--forest), var(--emerald)); border-radius:12px; padding:30px; color:white; text-align:center; margin-bottom:30px; }
  .savings-highlight .label { font-size:12px; text-transform:uppercase; letter-spacing:2px; opacity:0.6; margin-bottom:8px; }
  .savings-highlight .amount { font-family:'DM Serif Display',serif; font-size:52px; }
  .savings-highlight .per { font-size:14px; opacity:0.6; margin-top:4px; }

  .kpi-row { display:flex; gap:14px; margin-bottom:30px; }
  .kpi { flex:1; background:var(--cream); border-radius:10px; padding:22px; text-align:center; border:1px solid #E8EDE9; }
  .kpi .num { font-family:'DM Serif Display',serif; font-size:32px; color:var(--forest); margin-bottom:4px; }
  .kpi .lbl { font-size:10px; color:var(--light); text-transform:uppercase; letter-spacing:1px; line-height:1.4; }

  .timeline { margin-bottom:30px; }
  .timeline-step { display:flex; margin-bottom:0; }
  .timeline-marker { width:50px; display:flex; flex-direction:column; align-items:center; flex-shrink:0; }
  .timeline-dot { width:14px; height:14px; border-radius:50%; background:var(--sage); border:3px solid var(--mint); }
  .timeline-line { width:2px; flex:1; background:var(--mint); min-height:40px; }
  .timeline-content { padding:0 0 24px 16px; flex:1; }
  .timeline-content h4 { font-size:14px; color:var(--forest); font-weight:700; margin-bottom:4px; }
  .timeline-content p { font-size:12px; color:var(--mid); line-height:1.5; }
  .timeline-step:last-child .timeline-line { display:none; }

  .clean-table { width:100%; border-collapse:collapse; margin-bottom:30px; font-size:13px; }
  .clean-table thead th { background:var(--forest); color:white; padding:10px 14px; text-align:left; font-weight:500; font-size:11px; text-transform:uppercase; letter-spacing:1px; }
  .clean-table tbody td { padding:10px 14px; border-bottom:1px solid #F0F0F0; color:var(--mid); }
  .clean-table tbody tr:nth-child(even) { background:var(--cream); }
  .clean-table tbody td:first-child { color:var(--dark); font-weight:500; }
  .clean-table .scope-tag { display:inline-block; padding:2px 8px; border-radius:10px; font-size:10px; font-weight:600; color:white; }

  .insight-box { background:var(--cream); border-left:3px solid var(--sage); padding:16px 20px; margin-bottom:30px; border-radius:0 6px 6px 0; }
  .insight-box .label { font-size:11px; text-transform:uppercase; letter-spacing:2px; color:var(--sage); font-weight:700; margin-bottom:6px; }
  .insight-box p { font-size:14px; color:var(--mid); line-height:1.6; }
  .gold-box { background:var(--gold-bg); border-left:3px solid var(--gold); padding:14px 18px; margin:20px 0; border-radius:0 6px 6px 0; }
  .gold-box p { font-size:12px; color:#7A6A2A; line-height:1.6; }
  .gold-box .star { color:var(--gold); font-weight:700; }

  .scope-grid { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-bottom:30px; }
  .scope-item { background:var(--cream); border-radius:8px; padding:18px; border:1px solid #E8EDE9; }
  .scope-item h4 { font-size:13px; color:var(--forest); font-weight:700; margin-bottom:6px; }
  .scope-item p { font-size:12px; color:var(--mid); line-height:1.5; }

  .cards { display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; margin-bottom:30px; }
  .card { background:var(--cream); border-radius:10px; padding:22px 18px; text-align:center; border:1px solid #E8EDE9; }
  .card h4 { font-size:13px; color:var(--forest); margin-bottom:8px; font-weight:700; }
  .card p { font-size:11px; color:var(--mid); line-height:1.5; }

  .roi-visual { background:var(--cream); border-radius:10px; padding:24px; margin-bottom:30px; }
  .roi-visual h4 { font-size:13px; color:var(--forest); font-weight:700; margin-bottom:16px; }
  .roi-bar-track { height:30px; background:#E0E8E2; border-radius:15px; position:relative; overflow:hidden; margin-bottom:8px; }
  .roi-bar-invest { position:absolute; top:0; left:0; height:100%; background:var(--gold); border-radius:15px 0 0 15px; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; color:white; }
  .roi-bar-save { position:absolute; top:0; height:100%; background:var(--sage); border-radius:0 15px 15px 0; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; color:white; }
  .roi-labels { display:flex; justify-content:space-between; font-size:11px; color:var(--mid); }

  .bar-chart { margin-bottom:30px; }
  .bar-row { display:flex; align-items:center; margin-bottom:12px; }
  .bar-label { width:220px; font-size:12px; color:var(--mid); text-align:right; padding-right:14px; flex-shrink:0; }
  .bar-track { flex:1; height:26px; background:var(--cream); border-radius:4px; overflow:hidden; }
  .bar-fill { height:100%; background:linear-gradient(90deg, var(--emerald), var(--sage)); border-radius:4px; display:flex; align-items:center; justify-content:flex-end; padding-right:8px; min-width:40px; }
  .bar-fill.major { background:linear-gradient(90deg, var(--forest), var(--emerald)); }
  .bar-value { font-size:10px; font-weight:700; color:white; }
  .bar-pct { width:55px; text-align:right; font-size:12px; font-weight:700; color:var(--forest); padding-left:8px; flex-shrink:0; }

  .total-box { background:var(--forest); color:white; padding:20px 30px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; margin-bottom:30px; }
  .total-box .label { font-size:14px; opacity:0.7; }
  .total-box .value { font-family:'DM Serif Display',serif; font-size:36px; }

  .scope-blocks { display:flex; gap:14px; margin-bottom:30px; }
  .scope-block { flex:1; border-radius:10px; padding:24px 20px; text-align:center; }
  .scope-block.s1 { background:var(--scope1); color:white; }
  .scope-block.s2 { background:var(--scope2); color:white; }
  .scope-block.s3 { background:var(--scope3); color:white; }
  .scope-block .num { font-family:'DM Serif Display',serif; font-size:36px; margin-bottom:4px; }
  .scope-block .lbl { font-size:11px; text-transform:uppercase; letter-spacing:1.5px; opacity:0.7; margin-bottom:8px; }
  .scope-block .desc { font-size:11px; opacity:0.6; line-height:1.4; }

  .donut-section { display:flex; align-items:center; gap:40px; margin-bottom:30px; }
  .donut-visual { width:180px; height:180px; border-radius:50%; position:relative; flex-shrink:0; }
  .donut-hole { position:absolute; top:30px; left:30px; width:120px; height:120px; border-radius:50%; background:white; display:flex; flex-direction:column; align-items:center; justify-content:center; }
  .donut-hole .num { font-family:'DM Serif Display',serif; font-size:28px; color:var(--forest); }
  .donut-hole .lbl { font-size:10px; color:var(--light); }
  .donut-legend { flex:1; }
  .legend-row { display:flex; align-items:center; margin-bottom:12px; }
  .legend-dot { width:12px; height:12px; border-radius:3px; margin-right:10px; flex-shrink:0; }
  .legend-text { flex:1; font-size:13px; color:var(--mid); }
  .legend-val { font-size:14px; font-weight:700; color:var(--dark); }
  .legend-pct { font-size:12px; color:var(--light); margin-left:8px; width:50px; }

  .sll-box { background:linear-gradient(135deg, var(--forest), var(--emerald)); border-radius:12px; padding:30px; color:white; margin-bottom:30px; }
  .sll-box h3 { font-family:'DM Serif Display',serif; font-size:22px; margin-bottom:20px; }
  .sll-row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.15); font-size:14px; }
  .sll-row:last-child { border-bottom:none; }
  .sll-row .lbl { opacity:0.7; }
  .sll-row .val { font-weight:700; }
  .sll-row.highlight { background:rgba(255,255,255,0.1); border-radius:6px; padding:12px; margin-top:8px; border-bottom:none; }
  .sll-row.highlight .val { font-family:'DM Serif Display',serif; font-size:28px; }

  .benchmark { background:var(--cream); border-radius:10px; padding:24px 30px; margin-bottom:30px; }
  .benchmark h4 { font-size:13px; color:var(--forest); margin-bottom:16px; font-weight:700; }
  .bm-row { display:flex; align-items:center; margin-bottom:10px; }
  .bm-label { width:140px; font-size:12px; color:var(--mid); }
  .bm-bar-track { flex:1; height:20px; background:#E0E8E2; border-radius:10px; position:relative; }
  .bm-bar-fill { height:100%; border-radius:10px; position:absolute; top:0; left:0; }
  .bm-val { width:80px; text-align:right; font-size:12px; font-weight:700; color:var(--dark); padding-left:10px; }

  .tag { display:inline-block; background:var(--sage); color:white; font-size:10px; padding:3px 10px; border-radius:20px; font-weight:700; text-transform:uppercase; letter-spacing:1px; }

  .page-footer { position:absolute; bottom:20px; left:55px; right:55px; display:flex; justify-content:space-between; font-size:10px; color:var(--light); }
`

export function reportShell(bodyHtml: string): string {
  return `<html><head><meta charset="UTF-8"><style>${REPORT_STYLES}</style></head><body>${bodyHtml}</body></html>`
}
