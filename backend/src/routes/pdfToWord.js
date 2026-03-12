const express = require('express');
const router = express.Router();
const { pdfUpload, scheduleFileDeletion, deleteFile } = require('../middleware/upload');
const { pdfToDocx, isLibreOfficeAvailable } = require('../services/conversionService');
const path = require('path');

router.post('/', pdfUpload.single('pdf'), async (req, res) => {
  const filePath = req.file && req.file.path;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a PDF file.' });
    }

    const libreOfficeAvailable = await isLibreOfficeAvailable();
    if (!libreOfficeAvailable) {
      deleteFile(filePath);
      return res.status(503).json({
        error: 'PDF to Word conversion requires LibreOffice to be installed on the server.',
        installGuide: 'Install with: sudo apt-get install libreoffice',
      });
    }

    const outputPath = await pdfToDocx(filePath);
    scheduleFileDeletion(filePath);
    scheduleFileDeletion(outputPath);

    res.json({
      success: true,
      filename: path.basename(outputPath),
      downloadUrl: `/uploads/${path.basename(outputPath)}`,
      message: 'PDF converted to Word document successfully',
    });
  } catch (err) {
    deleteFile(filePath);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
