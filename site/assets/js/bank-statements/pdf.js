/* ---------------- PDF export ---------------- */
const PDF_LAYOUT = { width: 8.5, height: 11, margin: .4, scale: 2 };

// A boundary is safe only outside every row and each heading + first-row group.
function collectBreakBoundaries(element, canvasHeight) {
  const bounds = element.getBoundingClientRect();
  if (!bounds.height) throw new Error('The statement preview is unavailable. Generate again before exporting.');
  const ratio = canvasHeight / bounds.height;
  const rect = node => {
    const box = node.getBoundingClientRect();
    return { top: Math.round((box.top - bounds.top) * ratio), bottom: Math.round((box.bottom - bounds.top) * ratio) };
  };
  const protectedRanges = [...element.querySelectorAll('tr, .bank-header, .addr-row, .foot')].map(rect);
  element.querySelectorAll('[data-keep-start]').forEach(section => {
    const firstRow = section.querySelector('tbody tr');
    if (firstRow) protectedRanges.push({ top: rect(section).top, bottom: rect(firstRow).bottom });
  });
  const candidates = [0, canvasHeight, ...protectedRanges.map(range => range.bottom)];
  return [...new Set(candidates)].sort((a, b) => a - b).filter(position =>
    !protectedRanges.some(range => position > range.top && position < range.bottom));
}

function pageSlices(boundaries, canvasHeight, maxHeight) {
  const slices = [];
  let cursor = 0;
  let boundaryIndex = 0;
  while (cursor < canvasHeight) {
    const limit = Math.min(cursor + maxHeight, canvasHeight);
    let end = cursor;
    while (boundaryIndex < boundaries.length && boundaries[boundaryIndex] <= limit) {
      end = Math.max(end, boundaries[boundaryIndex++]);
    }
    if (end <= cursor) throw new Error('A statement row is too tall for a PDF page. Shorten the business or account holder name and try again.');
    slices.push({ top: cursor, height: end - cursor });
    cursor = end;
  }
  return slices;
}

async function renderPdf(element) {
  const { width, height, margin, scale } = PDF_LAYOUT;
  const contentWidth = width - margin * 2;
  let canvas;
  let sliceCanvas;
  try {
    canvas = await window.html2canvas(element, { scale, backgroundColor: '#ffffff', logging: false });
    if (!canvas.width || !canvas.height) throw new Error('The browser could not render this statement. Try Print / Save PDF.');
    const pixelsPerInch = canvas.width / contentWidth;
    const slices = pageSlices(collectBreakBoundaries(element, canvas.height), canvas.height,
      Math.floor((height - margin * 2) * pixelsPerInch));
    const pdf = new window.jspdf.jsPDF({ unit: 'in', format: 'letter' });
    sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = canvas.width;
    for (const [index, slice] of slices.entries()) {
      sliceCanvas.height = slice.height;
      const context = sliceCanvas.getContext('2d');
      if (!context) throw new Error('The browser could not allocate a PDF canvas. Try Print / Save PDF.');
      context.drawImage(canvas, 0, slice.top, canvas.width, slice.height, 0, 0, canvas.width, slice.height);
      if (index) pdf.addPage();
      pdf.addImage(sliceCanvas.toDataURL('image/jpeg', .92), 'JPEG', margin, margin, contentWidth, slice.height / pixelsPerInch);
      // Let progress/status updates paint while processing dense statements.
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    return pdf.output('blob');
  } finally {
    if (canvas) canvas.width = canvas.height = 0;
    if (sliceCanvas) sliceCanvas.width = sliceCanvas.height = 0;
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  try { link.click(); } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
}


export {
  renderPdf, pageSlices, collectBreakBoundaries, downloadBlob,
};
