const express = require('express');
const router = express.Router();
const { pdfUpload, scheduleFileDeletion, deleteFile } = require('../middleware/upload');
const { addTextToPdf, getPdfInfo, extractTextFromPdf, applyTextEdits } = require('../services/pdfService');
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
      tempFile: req.file.filename,
    });
  } catch (err) {
    deleteFile(filePath);
    res.status(500).json({ error: err.message });
  }
});

router.post('/extract-text', pdfUpload.single('pdf'), async (req, res) => {
  const filePath = req.file && req.file.path;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a PDF file.' });
    }
    const { pages, isScanned } = await extractTextFromPdf(filePath);
    scheduleFileDeletion(filePath, 30 * 60 * 1000);
    res.json({
      success: true,
      pages,
      isScanned,
      tempFile: req.file.filename,
    });
  } catch (err) {
    deleteFile(filePath);
    res.status(500).json({ error: err.message });
  }
});

router.post('/apply-edits', pdfUpload.single('pdf'), async (req, res) => {
  const filePath = req.file && req.file.path;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a PDF file.' });
    }

    let edits;
    try {
      edits = req.body.edits ? JSON.parse(req.body.edits) : [];
    } catch {
      return res.status(400).json({ error: 'Invalid edits format.' });
    }

    if (!Array.isArray(edits) || edits.length === 0) {
      return res.status(400).json({ error: 'No edits provided.' });
    }

    const outputPath = await applyTextEdits(filePath, edits);
    scheduleFileDeletion(filePath);
    scheduleFileDeletion(outputPath);

    res.json({
      success: true,
      filename: path.basename(outputPath),
      downloadUrl: `/uploads/${path.basename(outputPath)}`,
      message: `Applied ${edits.length} text edit(s) successfully`,
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

    let annotations;
    try {
      annotations = req.body.annotations ? JSON.parse(req.body.annotations) : [];
    } catch {
      return res.status(400).json({ error: 'Invalid annotations format.' });
    }

    if (!Array.isArray(annotations) || annotations.length === 0) {
      return res.status(400).json({ error: 'Please provide annotations array.' });
    }

    const outputPath = await addTextToPdf(filePath, annotations);
    scheduleFileDeletion(filePath);
    scheduleFileDeletion(outputPath);

    res.json({
      success: true,
      filename: path.basename(outputPath),
      downloadUrl: `/uploads/${path.basename(outputPath)}`,
      message: `Applied ${annotations.length} annotation(s) successfully`,
    });
  } catch (err) {
    deleteFile(filePath);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
