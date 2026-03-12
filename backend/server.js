const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const mergeRouter = require('./src/routes/merge');
const splitRouter = require('./src/routes/split');
const compressRouter = require('./src/routes/compress');
const rotateRouter = require('./src/routes/rotate');
const reorderRouter = require('./src/routes/reorder');
const imageToPdfRouter = require('./src/routes/imageToPdf');
const pdfToImageRouter = require('./src/routes/pdfToImage');
const wordToPdfRouter = require('./src/routes/wordToPdf');
const pdfToWordRouter = require('./src/routes/pdfToWord');
const editorRouter = require('./src/routes/editor');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/merge', mergeRouter);
app.use('/api/split', splitRouter);
app.use('/api/compress', compressRouter);
app.use('/api/rotate', rotateRouter);
app.use('/api/reorder', reorderRouter);
app.use('/api/image-to-pdf', imageToPdfRouter);
app.use('/api/pdf-to-image', pdfToImageRouter);
app.use('/api/word-to-pdf', wordToPdfRouter);
app.use('/api/pdf-to-word', pdfToWordRouter);
app.use('/api/editor', editorRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`PDF Utilities backend running on port ${PORT}`);
});

module.exports = app;
