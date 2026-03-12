const express = require('express');
const router = express.Router();
const { pdfUpload, scheduleFileDeletion, deleteFile } = require('../middleware/upload');
const { rotatePdf } = require('../services/pdfService');
const path = require('path');

router.post('/', pdfUpload.single('pdf'), async (req, res) => {
  const filePath = req.file && req.file.path;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a PDF file.' });
    }

    let rotations;
    try {
      rotations = req.body.rotations ? JSON.parse(req.body.rotations) : 90;
    } catch {
      rotations = parseInt(req.body.angle) || 90;
    }

    const outputPath = await rotatePdf(filePath, rotations);
    scheduleFileDeletion(filePath);
    scheduleFileDeletion(outputPath);

    res.json({
      success: true,
      filename: path.basename(outputPath),
      downloadUrl: `/uploads/${path.basename(outputPath)}`,
      message: 'PDF rotated successfully',
    });
  } catch (err) {
    deleteFile(filePath);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
