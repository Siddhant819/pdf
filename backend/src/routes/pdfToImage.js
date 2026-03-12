const express = require('express');
const router = express.Router();
const { pdfUpload, scheduleFileDeletion, deleteFile } = require('../middleware/upload');
const { pdfToImages } = require('../services/imageService');
const path = require('path');

router.post('/', pdfUpload.single('pdf'), async (req, res) => {
  const filePath = req.file && req.file.path;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a PDF file.' });
    }

    const format = req.body.format === 'jpeg' ? 'jpeg' : 'png';
    const outputPaths = await pdfToImages(filePath, format);
    scheduleFileDeletion(filePath);
    outputPaths.forEach((p) => scheduleFileDeletion(p));

    res.json({
      success: true,
      files: outputPaths.map((p, i) => ({
        filename: path.basename(p),
        downloadUrl: `/uploads/${path.basename(p)}`,
        label: `Page ${i + 1}`,
      })),
      message: `Converted ${outputPaths.length} page(s) to ${format.toUpperCase()}`,
    });
  } catch (err) {
    deleteFile(filePath);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
