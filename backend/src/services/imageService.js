const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');
const { v4: uuidv4 } = require('uuid');
const { UPLOAD_DIR } = require('../middleware/upload');
const { pathToFileURL } = require('url');

const PDFJS_WORKER_PATH = path.resolve(
  __dirname,
  '../../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'
);

async function getPdfjsLib() {
  const { getDocument, GlobalWorkerOptions } = await import(
    'pdfjs-dist/legacy/build/pdf.mjs'
  );
  GlobalWorkerOptions.workerSrc = pathToFileURL(PDFJS_WORKER_PATH).href;
  return { getDocument };
}

async function imagesToPdf(imagePaths) {
  const pdfDoc = await PDFDocument.create();

  for (const imagePath of imagePaths) {
    const ext = path.extname(imagePath).toLowerCase();
    let imageBytes;

    if (ext === '.png') {
      const pngBuffer = await sharp(imagePath).png().toBuffer();
      imageBytes = await pdfDoc.embedPng(pngBuffer);
    } else {
      const jpgBuffer = await sharp(imagePath).jpeg().toBuffer();
      imageBytes = await pdfDoc.embedJpg(jpgBuffer);
    }

    const { width, height } = imageBytes.scale(1);
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(imageBytes, { x: 0, y: 0, width, height });
  }

  const pdfBytes = await pdfDoc.save();
  const outputPath = path.join(UPLOAD_DIR, `images_to_pdf_${uuidv4()}.pdf`);
  fs.writeFileSync(outputPath, pdfBytes);
  return outputPath;
}

async function renderPdfPageToImage(pdfData, pageIndex, scale, format) {
  const { getDocument } = await getPdfjsLib();

  const standardFontDataUrl = path.resolve(
    __dirname,
    '../../node_modules/pdfjs-dist/standard_fonts/'
  ) + '/';

  const loadingTask = getDocument({
    data: pdfData,
    standardFontDataUrl,
  });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(pageIndex + 1);
  const viewport = page.getViewport({ scale: scale || 2.0 });

  const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height));
  const context = canvas.getContext('2d');

  context.fillStyle = 'white';
  context.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: context, viewport }).promise;

  let buffer;
  if (format === 'jpeg') {
    buffer = canvas.toBuffer('image/jpeg', { quality: 0.9 });
  } else {
    buffer = canvas.toBuffer('image/png');
  }

  pdf.destroy();
  return buffer;
}

async function pdfToImages(pdfPath, format) {
  const fmt = format === 'jpeg' ? 'jpeg' : 'png';
  const pdfData = new Uint8Array(fs.readFileSync(pdfPath));

  const pdfDoc = await PDFDocument.load(pdfData);
  const totalPages = pdfDoc.getPageCount();
  const outputPaths = [];

  for (let i = 0; i < totalPages; i++) {
    const imageBuffer = await renderPdfPageToImage(pdfData, i, 2.0, fmt);
    const ext = fmt === 'jpeg' ? 'jpg' : 'png';
    const outputPath = path.join(UPLOAD_DIR, `pdf_page_${i + 1}_${uuidv4()}.${ext}`);
    fs.writeFileSync(outputPath, imageBuffer);
    outputPaths.push(outputPath);
  }

  return outputPaths;
}

module.exports = { imagesToPdf, pdfToImages };
