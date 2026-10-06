/**
 * VALETEC PHARMA SUITE v2.0 - GENERADOR AUTOMÁTICO DE DOCUMENTACIÓN EN PDF
 * Convierte los manuales en Markdown a documentos PDF profesionales y listos para imprenta/auditoría.
 * Renderiza diagramas vectoriales Mermaid y tablas normativas con estilo farmacéutico institucional.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DOCS_DIR = path.resolve(__dirname, '../docs');
const PDF_DIR = path.resolve(DOCS_DIR, 'pdf');
const TEMP_DIR = path.resolve(__dirname, '../backups/temp_docs_html');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

if (!fs.existsSync(PDF_DIR)) {
  fs.mkdirSync(PDF_DIR, { recursive: true });
}
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const documents = [
  {
    input: 'README.md',
    output: '0_INDICE_DOCUMENTAL.pdf',
    title: 'VALETEC PHARMA - Índice Maestro y Hub Documental'
  },
  {
    input: '1_DOCUMENTACION_TECNICA.md',
    output: '1_DOCUMENTACION_TECNICA.pdf',
    title: 'VALETEC PHARMA - Documentación Técnica y Modelo Relacional'
  },
  {
    input: '2_MANUAL_OPERATIVO_SOP.md',
    output: '2_MANUAL_OPERATIVO_SOP.pdf',
    title: 'VALETEC PHARMA - Manual de Operación y Procedimientos SOP'
  },
  {
    input: '3_DEVOPS_Y_CONTINGENCIAS.md',
    output: '3_DEVOPS_Y_CONTINGENCIAS.pdf',
    title: 'VALETEC PHARMA - Guía DevOps, Respaldo y Contingencias'
  }
];

function buildHtmlTemplate(title, rawMarkdown) {
  // Escapar backticks y barras para incrustar en template literal de JS
  const jsonSafeMd = JSON.stringify(rawMarkdown);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <!-- Marked.js para Markdown -->
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <!-- Mermaid.js para diagramas vectoriales -->
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    @page {
      size: A4;
      margin: 18mm 15mm 20mm 15mm;
      @bottom-right {
        content: counter(page);
      }
    }
    
    * {
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      line-height: 1.6;
      font-size: 10pt;
      margin: 0;
      padding: 0;
      background: #ffffff;
    }

    .doc-header {
      border-bottom: 3px solid #0f766e;
      padding-bottom: 12px;
      margin-bottom: 25px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }

    .doc-brand {
      font-size: 16pt;
      font-weight: 800;
      color: #0f766e;
      letter-spacing: -0.5px;
      text-transform: uppercase;
    }

    .doc-badge {
      font-size: 8pt;
      font-weight: 700;
      background: #e6fffa;
      color: #0d9488;
      border: 1px solid #99f6e4;
      padding: 4px 10px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    h1 {
      font-size: 19pt;
      font-weight: 800;
      color: #0f172a;
      margin-top: 0;
      margin-bottom: 12px;
      line-height: 1.25;
      page-break-after: avoid;
    }

    h2 {
      font-size: 13pt;
      font-weight: 700;
      color: #0f766e;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
      margin-top: 24px;
      margin-bottom: 10px;
      page-break-after: avoid;
    }

    h3 {
      font-size: 11pt;
      font-weight: 700;
      color: #1e293b;
      margin-top: 18px;
      margin-bottom: 8px;
      page-break-after: avoid;
    }

    h4 {
      font-size: 10pt;
      font-weight: 700;
      color: #475569;
      margin-top: 14px;
      margin-bottom: 6px;
      page-break-after: avoid;
    }

    p {
      margin-top: 0;
      margin-bottom: 10px;
      text-align: justify;
    }

    /* Tablas estilo farmacéutico enterprise */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0 20px 0;
      font-size: 8.5pt;
      page-break-inside: avoid;
    }

    th {
      background-color: #0f766e;
      color: #ffffff;
      font-weight: 700;
      text-align: left;
      padding: 7px 10px;
      border: 1px solid #0d9488;
    }

    td {
      padding: 6px 10px;
      border: 1px solid #cbd5e1;
      vertical-align: top;
    }

    tr:nth-child(even) {
      background-color: #f8fafc;
    }

    /* Bloques de código */
    pre {
      background: #0f172a;
      color: #f8fafc;
      padding: 12px 14px;
      border-radius: 6px;
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 8.5pt;
      overflow-x: auto;
      margin: 12px 0;
      page-break-inside: avoid;
      line-height: 1.45;
    }

    code {
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 8.5pt;
      background: #f1f5f9;
      color: #0f766e;
      padding: 2px 5px;
      border-radius: 4px;
    }

    pre code {
      background: transparent;
      color: inherit;
      padding: 0;
    }

    /* Citas y alertas normativas */
    blockquote {
      margin: 14px 0;
      padding: 10px 14px;
      background: #f0fdfa;
      border-left: 4px solid #0d9488;
      color: #134e4a;
      font-size: 9pt;
      page-break-inside: avoid;
    }

    blockquote strong {
      color: #0f766e;
    }

    /* Diagramas Mermaid */
    .mermaid {
      margin: 20px auto;
      text-align: center;
      background: #ffffff;
      padding: 10px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      page-break-inside: avoid;
    }

    .mermaid svg {
      max-width: 95% !important;
      height: auto !important;
    }

    hr {
      border: 0;
      border-top: 1px solid #cbd5e1;
      margin: 20px 0;
    }

    ul, ol {
      margin-top: 0;
      margin-bottom: 10px;
      padding-left: 22px;
    }

    li {
      margin-bottom: 4px;
    }

    .footer-note {
      margin-top: 35px;
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
      font-size: 7.5pt;
      color: #94a3b8;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  </style>
</head>
<body>
  <div class="doc-header">
    <div class="doc-brand">VALETEC PHARMA SUITE v2.0</div>
    <div class="doc-badge">DOCUMENTO OFICIAL DEL SISTEMA</div>
  </div>

  <div id="content"></div>

  <div class="footer-note">
    Documentación y Manuales Oficiales • Valetec Pharma Suite v2.0 • Conforme a Normativa Sanitaria DIGEMID y SUNAT
  </div>

  <script>
    mermaid.initialize({ 
      startOnLoad: false, 
      theme: 'neutral',
      fontFamily: 'Segoe UI, Arial, sans-serif'
    });

    const rawMarkdown = ${jsonSafeMd};
    document.getElementById('content').innerHTML = marked.parse(rawMarkdown);

    async function processAndRender() {
      const codeBlocks = document.querySelectorAll('pre code.language-mermaid');
      for (let i = 0; i < codeBlocks.length; i++) {
        const block = codeBlocks[i];
        const code = block.textContent;
        const pre = block.parentElement;
        const div = document.createElement('div');
        div.className = 'mermaid';
        div.textContent = code;
        pre.parentNode.replaceChild(div, pre);
      }
      try {
        await mermaid.run();
      } catch (err) {
        console.error('Mermaid render error:', err);
      }
      document.body.setAttribute('data-rendered', 'true');
    }

    processAndRender();
  </script>
</body>
</html>`;
}

async function convertAll() {
  console.log('📄 Iniciando compilación de suite documental a PDF...\n');

  for (const doc of documents) {
    const mdPath = path.join(DOCS_DIR, doc.input);
    const pdfPath = path.join(PDF_DIR, doc.output);
    const tempHtmlPath = path.join(TEMP_DIR, doc.output.replace('.pdf', '.html'));

    console.log(`➡️ Procesando: ${doc.input} -> ${doc.output}`);
    const rawMarkdown = fs.readFileSync(mdPath, 'utf8');
    const htmlContent = buildHtmlTemplate(doc.title, rawMarkdown);

    fs.writeFileSync(tempHtmlPath, htmlContent, 'utf8');

    const fileUri = 'file:///' + tempHtmlPath.replace(/\\/g, '/');
    const profileDir = path.join(TEMP_DIR, 'edge_prof_' + Date.now());

    const cmd = `"${EDGE_PATH}" --headless --disable-gpu --no-sandbox --user-data-dir="${profileDir}" --virtual-time-budget=6000 --print-to-pdf="${pdfPath}" "${fileUri}"`;

    try {
      execSync(cmd, { stdio: 'pipe', timeout: 30000 });
      if (fs.existsSync(pdfPath)) {
        const stats = fs.statSync(pdfPath);
        const kb = (stats.size / 1024).toFixed(1);
        console.log(`   ✅ Generado: ${doc.output} (${kb} KB)`);
      } else {
        console.error(`   ❌ No se encontró el PDF generado: ${pdfPath}`);
      }
    } catch (err) {
      console.error(`   ❌ Error al compilar ${doc.output}:`, err.message);
    }
  }

  // Limpieza de temporales
  try {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  } catch (e) {}

  console.log('\n🎉 ¡Conversión a PDF finalizada con éxito!');
  console.log(`📁 Carpeta de destino: ${PDF_DIR}`);
}

convertAll();
