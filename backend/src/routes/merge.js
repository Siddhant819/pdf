const express = require('express');
const router = express.Router();
const { pdfUpload, scheduleFileDeletion, deleteFile } = require('../middleware/upload');
const { mergePdfs } = require('../services/pdfService');
const path = require('path');

router.post('/', pdfUpload.array('pdfs', 20), async (req, res) => {
  const uploadedPaths = (req.files || []).map((f) => f.path);
  try {
    if (!req.files || req.files.length < 2) {
      return res.status(400).json({ error: 'Please upload at least 2 PDF files.' });
    }

    const outputPath = await mergePdfs(uploadedPaths);
    scheduleFileDeletion(outputPath);
    uploadedPaths.forEach((p) => scheduleFileDeletion(p));

    res.json({
      success: true,
      filename: path.basename(outputPath),
      downloadUrl: `/uploads/${path.basename(outputPath)}`,
      message: `Successfully merged ${req.files.length} PDFs`,
    });
  } catch (err) {
    uploadedPaths.forEach(deleteFile);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
