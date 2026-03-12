const express = require('express');
const router = express.Router();
const { pdfUpload, scheduleFileDeletion, deleteFile } = require('../middleware/upload');
const { splitPdf } = require('../services/pdfService');
const path = require('path');

router.post('/', pdfUpload.single('pdf'), async (req, res) => {
  const filePath = req.file && req.file.path;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a PDF file.' });
    }

    let ranges;
    try {
      ranges = req.body.ranges ? JSON.parse(req.body.ranges) : [{ start: 1, end: null }];
    } catch {
      return res.status(400).json({ error: 'Invalid ranges format. Expected JSON array.' });
    }

    if (!Array.isArray(ranges) || ranges.length === 0) {
      return res.status(400).json({ error: 'Please provide at least one page range.' });
    }

    const outputPaths = await splitPdf(filePath, ranges);
    scheduleFileDeletion(filePath);
    outputPaths.forEach((p) => scheduleFileDeletion(p));

    res.json({
      success: true,
      files: outputPaths.map((p, i) => ({
        filename: path.basename(p),
        downloadUrl: `/uploads/${path.basename(p)}`,
        label: `Part ${i + 1}`,
      })),
      message: `Successfully split into ${outputPaths.length} file(s)`,
    });
  } catch (err) {
    deleteFile(filePath);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
