const express = require('express');
const router = express.Router();
const { docUpload, scheduleFileDeletion, deleteFile } = require('../middleware/upload');
const { docxToPdf, isLibreOfficeAvailable } = require('../services/conversionService');
const path = require('path');

router.post('/', docUpload.single('document'), async (req, res) => {
  const filePath = req.file && req.file.path;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a Word document (.docx or .doc).' });
    }

    const libreOfficeAvailable = await isLibreOfficeAvailable();
    if (!libreOfficeAvailable) {
      deleteFile(filePath);
      return res.status(503).json({
        error: 'Word to PDF conversion requires LibreOffice to be installed on the server.',
        installGuide: 'Install with: sudo apt-get install libreoffice',
      });
    }

    const outputPath = await docxToPdf(filePath);
    scheduleFileDeletion(filePath);
    scheduleFileDeletion(outputPath);

    res.json({
      success: true,
      filename: path.basename(outputPath),
      downloadUrl: `/uploads/${path.basename(outputPath)}`,
      message: 'Word document converted to PDF successfully',
    });
  } catch (err) {
    deleteFile(filePath);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
