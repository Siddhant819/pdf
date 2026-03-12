const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { UPLOAD_DIR } = require('../middleware/upload');

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

async function pdfPageToImage(pdfPath, pageNum, format = 'png') {
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const totalPages = pdfDoc.getPageCount();
  const pageIndex = Math.max(0, Math.min(parseInt(pageNum) - 1 || 0, totalPages - 1));

  const singleDoc = await PDFDocument.create();
  const [copiedPage] = await singleDoc.copyPages(pdfDoc, [pageIndex]);
  singleDoc.addPage(copiedPage);

  const pdfPageBytes = await singleDoc.save();
  const tempPdfPath = path.join(UPLOAD_DIR, `temp_page_${uuidv4()}.pdf`);
  fs.writeFileSync(tempPdfPath, pdfPageBytes);

  const outputExt = format === 'jpeg' ? 'jpg' : 'png';
  const outputPath = path.join(UPLOAD_DIR, `pdf_page_${uuidv4()}.${outputExt}`);

  const page = singleDoc.getPage(0);
  const { width, height } = page.getSize();

  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(width)}" height="${Math.round(height)}">
    <rect width="100%" height="100%" fill="white"/>
    <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-size="16" fill="#666">Page ${pageNum} preview</text>
  </svg>`;

  const sharpInstance = sharp(Buffer.from(svgContent))
    .resize(Math.round(width * 2), Math.round(height * 2));

  if (format === 'jpeg') {
    await sharpInstance.jpeg({ quality: 90 }).toFile(outputPath);
  } else {
    await sharpInstance.png().toFile(outputPath);
  }

  if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);

  return outputPath;
}

async function pdfToImages(pdfPath, format = 'png') {
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const totalPages = pdfDoc.getPageCount();
  const outputPaths = [];

  for (let i = 0; i < totalPages; i++) {
    const outputPath = await pdfPageToImage(pdfPath, i + 1, format);
    outputPaths.push(outputPath);
  }

  return outputPaths;
}

module.exports = { imagesToPdf, pdfToImages, pdfPageToImage };
