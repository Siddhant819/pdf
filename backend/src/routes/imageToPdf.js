const express = require('express');
const router = express.Router();
const { imageUpload, scheduleFileDeletion, deleteFile } = require('../middleware/upload');
const { imagesToPdf } = require('../services/imageService');
const path = require('path');

router.post('/', imageUpload.array('images', 20), async (req, res) => {
  const uploadedPaths = (req.files || []).map((f) => f.path);
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Please upload at least one image.' });
    }

    const outputPath = await imagesToPdf(uploadedPaths);
    scheduleFileDeletion(outputPath);
    uploadedPaths.forEach((p) => scheduleFileDeletion(p));

    res.json({
      success: true,
      filename: path.basename(outputPath),
      downloadUrl: `/uploads/${path.basename(outputPath)}`,
      message: `Converted ${req.files.length} image(s) to PDF`,
    });
  } catch (err) {
    uploadedPaths.forEach(deleteFile);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
