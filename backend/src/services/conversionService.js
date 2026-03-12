const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { UPLOAD_DIR } = require('../middleware/upload');

const execAsync = promisify(exec);

async function docxToPdf(docxPath) {
  try {
    await execAsync(`libreoffice --headless --convert-to pdf --outdir "${UPLOAD_DIR}" "${docxPath}"`);
    const baseName = path.basename(docxPath, path.extname(docxPath));
    const convertedPath = path.join(UPLOAD_DIR, `${baseName}.pdf`);
    if (fs.existsSync(convertedPath)) {
      const finalPath = path.join(UPLOAD_DIR, `word_to_pdf_${uuidv4()}.pdf`);
      fs.renameSync(convertedPath, finalPath);
      return finalPath;
    }
    throw new Error('Conversion failed: output file not found');
  } catch (err) {
    throw new Error(`Word to PDF conversion requires LibreOffice. Error: ${err.message}`);
  }
}

async function pdfToDocx(pdfPath) {
  try {
    await execAsync(`libreoffice --headless --infilter="writer_pdf_import" --convert-to docx --outdir "${UPLOAD_DIR}" "${pdfPath}"`);
    const baseName = path.basename(pdfPath, path.extname(pdfPath));
    const convertedPath = path.join(UPLOAD_DIR, `${baseName}.docx`);
    if (fs.existsSync(convertedPath)) {
      const finalPath = path.join(UPLOAD_DIR, `pdf_to_word_${uuidv4()}.docx`);
      fs.renameSync(convertedPath, finalPath);
      return finalPath;
    }
    throw new Error('Conversion failed: output file not found');
  } catch (err) {
    throw new Error(`PDF to Word conversion requires LibreOffice. Error: ${err.message}`);
  }
}

async function isLibreOfficeAvailable() {
  try {
    await execAsync('libreoffice --version');
    return true;
  } catch {
    return false;
  }
}

module.exports = { docxToPdf, pdfToDocx, isLibreOfficeAvailable };
