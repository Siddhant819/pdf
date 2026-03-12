const express = require('express');
const router = express.Router();
const { pdfUpload, scheduleFileDeletion, deleteFile } = require('../middleware/upload');
const { reorderPdf, getPdfInfo } = require('../services/pdfService');
const path = require('path');

router.post('/info', pdfUpload.single('pdf'), async (req, res) => {
  const filePath = req.file && req.file.path;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a PDF file.' });
    }

    const info = await getPdfInfo(filePath);
    scheduleFileDeletion(filePath, 30 * 60 * 1000);

    res.json({
      success: true,
      ...info,
      filename: req.file.filename,
      tempFile: req.file.filename,
    });
  } catch (err) {
    deleteFile(filePath);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', pdfUpload.single('pdf'), async (req, res) => {
  const filePath = req.file && req.file.path;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a PDF file.' });
    }

    let pageOrder;
    let deletedPages;
    try {
      pageOrder = req.body.pageOrder ? JSON.parse(req.body.pageOrder) : null;
      deletedPages = req.body.deletedPages ? JSON.parse(req.body.deletedPages) : [];
    } catch {
      return res.status(400).json({ error: 'Invalid pageOrder format.' });
    }

    if (!pageOrder || !Array.isArray(pageOrder)) {
      return res.status(400).json({ error: 'Please provide pageOrder as a JSON array.' });
    }

    const outputPath = await reorderPdf(filePath, pageOrder, deletedPages);
    scheduleFileDeletion(filePath);
    scheduleFileDeletion(outputPath);

    res.json({
      success: true,
      filename: path.basename(outputPath),
      downloadUrl: `/uploads/${path.basename(outputPath)}`,
      message: 'Pages reordered successfully',
    });
  } catch (err) {
    deleteFile(filePath);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
