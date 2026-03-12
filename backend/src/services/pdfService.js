const { PDFDocument, degrees } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { UPLOAD_DIR } = require('../middleware/upload');

async function mergePdfs(filePaths) {
  const mergedPdf = await PDFDocument.create();

  for (const filePath of filePaths) {
    const pdfBytes = fs.readFileSync(filePath);
    const pdf = await PDFDocument.load(pdfBytes);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  const mergedBytes = await mergedPdf.save();
  const outputPath = path.join(UPLOAD_DIR, `merged_${uuidv4()}.pdf`);
  fs.writeFileSync(outputPath, mergedBytes);
  return outputPath;
}

async function splitPdf(filePath, ranges) {
  const pdfBytes = fs.readFileSync(filePath);
  const pdf = await PDFDocument.load(pdfBytes);
  const totalPages = pdf.getPageCount();
  const outputPaths = [];

  for (const range of ranges) {
    const { start, end } = range;
    const s = Math.max(0, (parseInt(start) || 1) - 1);
    const e = Math.min(totalPages - 1, (parseInt(end) || totalPages) - 1);

    if (s > e) continue;

    const splitDoc = await PDFDocument.create();
    const pageIndices = [];
    for (let i = s; i <= e; i++) pageIndices.push(i);

    const copiedPages = await splitDoc.copyPages(pdf, pageIndices);
    copiedPages.forEach((page) => splitDoc.addPage(page));

    const splitBytes = await splitDoc.save();
    const outputPath = path.join(UPLOAD_DIR, `split_${uuidv4()}.pdf`);
    fs.writeFileSync(outputPath, splitBytes);
    outputPaths.push(outputPath);
  }

  return outputPaths;
}

async function rotatePdf(filePath, rotations) {
  const pdfBytes = fs.readFileSync(filePath);
  const pdf = await PDFDocument.load(pdfBytes);
  const totalPages = pdf.getPageCount();

  if (Array.isArray(rotations)) {
    rotations.forEach(({ page, angle }) => {
      const pageIndex = parseInt(page) - 1;
      if (pageIndex >= 0 && pageIndex < totalPages) {
        const pdfPage = pdf.getPage(pageIndex);
        const current = pdfPage.getRotation().angle;
        pdfPage.setRotation(degrees((current + (parseInt(angle) || 90)) % 360));
      }
    });
  } else {
    const angle = parseInt(rotations) || 90;
    for (let i = 0; i < totalPages; i++) {
      const page = pdf.getPage(i);
      const current = page.getRotation().angle;
      page.setRotation(degrees((current + angle) % 360));
    }
  }

  const rotatedBytes = await pdf.save();
  const outputPath = path.join(UPLOAD_DIR, `rotated_${uuidv4()}.pdf`);
  fs.writeFileSync(outputPath, rotatedBytes);
  return outputPath;
}

async function reorderPdf(filePath, pageOrder, deletedPages = []) {
  const pdfBytes = fs.readFileSync(filePath);
  const pdf = await PDFDocument.load(pdfBytes);
  const totalPages = pdf.getPageCount();

  const newDoc = await PDFDocument.create();

  const order = pageOrder
    .map((p) => parseInt(p) - 1)
    .filter((i) => i >= 0 && i < totalPages && !deletedPages.map((d) => parseInt(d) - 1).includes(i));

  const copiedPages = await newDoc.copyPages(pdf, order);
  copiedPages.forEach((page) => newDoc.addPage(page));

  const reorderedBytes = await newDoc.save();
  const outputPath = path.join(UPLOAD_DIR, `reordered_${uuidv4()}.pdf`);
  fs.writeFileSync(outputPath, reorderedBytes);
  return outputPath;
}

async function compressPdf(filePath) {
  const pdfBytes = fs.readFileSync(filePath);
  const pdf = await PDFDocument.load(pdfBytes);

  const compressedBytes = await pdf.save({ useObjectStreams: true, addDefaultPage: false });
  const outputPath = path.join(UPLOAD_DIR, `compressed_${uuidv4()}.pdf`);
  fs.writeFileSync(outputPath, compressedBytes);

  const originalSize = fs.statSync(filePath).size;
  const compressedSize = compressedBytes.length;

  return { outputPath, originalSize, compressedSize };
}

async function getPdfInfo(filePath) {
  const pdfBytes = fs.readFileSync(filePath);
  const pdf = await PDFDocument.load(pdfBytes);
  return {
    pageCount: pdf.getPageCount(),
    title: pdf.getTitle() || '',
    author: pdf.getAuthor() || '',
  };
}

async function extractTextFromPdf(filePath) {
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const workerPath = require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs');
  GlobalWorkerOptions.workerSrc = `file://${workerPath}`;

  const pdfBytes = fs.readFileSync(filePath);
  const pdf = await getDocument({ data: new Uint8Array(pdfBytes) }).promise;

  const pages = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();

    const items = [];
    let itemId = 0;
    for (const item of textContent.items) {
      if (!item.str) continue;
      const transform = item.transform;
      const x = transform[4];
      const y = transform[5];
      const a = transform[0];
      const b = transform[1];
      const fontSize = Math.max(Math.round(Math.sqrt(a * a + b * b)), 6);

      items.push({
        id: `p${pageNum}_i${itemId++}`,
        text: item.str,
        x,
        y,
        // Fall back to an approximate char width when pdfjs omits the width value
        // 0.6 is a common approximation for Helvetica-like fonts (char width / em size)
        width: item.width || fontSize * item.str.length * 0.6,
        height: item.height || fontSize,
        fontSize,
        fontName: item.fontName || '',
      });
    }

    pages.push({
      pageNum,
      width: viewport.width,
      height: viewport.height,
      items,
    });
  }

  return pages;
}

async function applyTextEdits(filePath, edits) {
  const pdfBytes = fs.readFileSync(filePath);
  const pdf = await PDFDocument.load(pdfBytes);

  const { rgb, StandardFonts } = require('pdf-lib');
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  for (const edit of edits) {
    if (edit.newText === edit.originalText) continue;

    const { pageNum, x, y, width, height, fontSize, newText } = edit;
    const pageIndex = (parseInt(pageNum) || 1) - 1;
    if (pageIndex < 0 || pageIndex >= pdf.getPageCount()) continue;

    const page = pdf.getPage(pageIndex);
    const fsVal = parseFloat(fontSize) || 12;
    const textWidth = parseFloat(width) || 100;
    const textHeight = parseFloat(height) || fsVal;
    const posX = parseFloat(x);
    const posY = parseFloat(y);

    page.drawRectangle({
      x: posX - 1,
      y: posY - 1,
      width: textWidth + 2,
      height: textHeight + 2,
      color: rgb(1, 1, 1),
      opacity: 1,
    });

    page.drawText(String(newText), {
      x: posX,
      y: posY,
      size: fsVal,
      font,
      color: rgb(0, 0, 0),
    });
  }

  const editedBytes = await pdf.save();
  const outputPath = path.join(UPLOAD_DIR, `text_edited_${uuidv4()}.pdf`);
  fs.writeFileSync(outputPath, editedBytes);
  return outputPath;
}

async function addTextToPdf(filePath, annotations) {
  const pdfBytes = fs.readFileSync(filePath);
  const pdf = await PDFDocument.load(pdfBytes);

  const { rgb, StandardFonts } = require('pdf-lib');
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  for (const annotation of annotations) {
    const { page: pageNum, text, x, y, size, color } = annotation;
    const pageIndex = (parseInt(pageNum) || 1) - 1;
    if (pageIndex < 0 || pageIndex >= pdf.getPageCount()) continue;

    const page = pdf.getPage(pageIndex);
    const fontSize = parseInt(size) || 12;
    const [r, g, b] = parseColor(color || '#000000');

    page.drawText(String(text), {
      x: parseFloat(x) || 50,
      y: parseFloat(y) || 50,
      size: fontSize,
      font,
      color: rgb(r, g, b),
    });
  }

  const editedBytes = await pdf.save();
  const outputPath = path.join(UPLOAD_DIR, `edited_${uuidv4()}.pdf`);
  fs.writeFileSync(outputPath, editedBytes);
  return outputPath;
}

function parseColor(hex) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return [r, g, b];
}

module.exports = {
  mergePdfs,
  splitPdf,
  rotatePdf,
  reorderPdf,
  compressPdf,
  getPdfInfo,
  addTextToPdf,
  extractTextFromPdf,
  applyTextEdits,
};
