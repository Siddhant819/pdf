const express = require('express');
const router = express.Router();
const { pdfUpload, scheduleFileDeletion, deleteFile } = require('../middleware/upload');
const { compressPdf } = require('../services/pdfService');
const path = require('path');

router.post('/', pdfUpload.single('pdf'), async (req, res) => {
  const filePath = req.file && req.file.path;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a PDF file.' });
    }

    const { outputPath, originalSize, compressedSize } = await compressPdf(filePath);
    scheduleFileDeletion(filePath);
    scheduleFileDeletion(outputPath);

    const saved = originalSize - compressedSize;
    const savedPercent = originalSize > 0 ? ((saved / originalSize) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      filename: path.basename(outputPath),
      downloadUrl: `/uploads/${path.basename(outputPath)}`,
      originalSize,
      compressedSize,
      savedBytes: saved,
      savedPercent: parseFloat(savedPercent),
      message: `Compressed by ${savedPercent}%`,
    });
  } catch (err) {
    deleteFile(filePath);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
