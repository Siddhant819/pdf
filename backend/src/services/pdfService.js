const { PDFDocument, degrees } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { UPLOAD_DIR } = require('../middleware/upload');

// Well-known system font paths (TTF) used for embedding Unicode-capable fonts.
// These Liberation fonts cover the full Latin extended range and are available
// on most Linux/Ubuntu systems.
const SYSTEM_FONT_PATHS = {
  sansRegular:    '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
  sansBold:       '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
  sansItalic:     '/usr/share/fonts/truetype/liberation/LiberationSans-Italic.ttf',
  sansBoldItalic: '/usr/share/fonts/truetype/liberation/LiberationSans-BoldItalic.ttf',
  serifRegular:   '/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf',
  serifBold:      '/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf',
  monoRegular:    '/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf',
  monoBold:       '/usr/share/fonts/truetype/liberation/LiberationMono-Bold.ttf',
};

/**
 * Try to load a system TTF font. Returns the font bytes or null if the file
 * is not available.
 * @param {string} fontPath
 * @returns {Buffer|null}
 */
function tryLoadSystemFont(fontPath) {
  try {
    if (fs.existsSync(fontPath)) return fs.readFileSync(fontPath);
  } catch {
    // ignore
  }
  return null;
}

async function mergePdfs(filePaths) {
  const mergedPdf = await PDFDocument.create();

  for (const filePath of filePaths) {
    const pdfBytes = fs.readFileSync(filePath);
    const pdf = await PDFDocument.load(pdfBytes);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  const mergedBytes = await mergedPdf.save();
  const outputPath = path.join(UPLOAD_DIR, `merged_${uuidv4()}.pdf`);
  fs.writeFileSync(outputPath, mergedBytes);
  return outputPath;
}

async function splitPdf(filePath, ranges) {
  const pdfBytes = fs.readFileSync(filePath);
  const pdf = await PDFDocument.load(pdfBytes);
  const totalPages = pdf.getPageCount();
  const outputPaths = [];

  for (const range of ranges) {
    const { start, end } = range;
    const s = Math.max(0, (parseInt(start) || 1) - 1);
    const e = Math.min(totalPages - 1, (parseInt(end) || totalPages) - 1);

    if (s > e) continue;

    const splitDoc = await PDFDocument.create();
    const pageIndices = [];
    for (let i = s; i <= e; i++) pageIndices.push(i);

    const copiedPages = await splitDoc.copyPages(pdf, pageIndices);
    copiedPages.forEach((page) => splitDoc.addPage(page));

    const splitBytes = await splitDoc.save();
    const outputPath = path.join(UPLOAD_DIR, `split_${uuidv4()}.pdf`);
    fs.writeFileSync(outputPath, splitBytes);
    outputPaths.push(outputPath);
  }

  return outputPaths;
}

async function rotatePdf(filePath, rotations) {
  const pdfBytes = fs.readFileSync(filePath);
  const pdf = await PDFDocument.load(pdfBytes);
  const totalPages = pdf.getPageCount();

  if (Array.isArray(rotations)) {
    rotations.forEach(({ page, angle }) => {
      const pageIndex = parseInt(page) - 1;
      if (pageIndex >= 0 && pageIndex < totalPages) {
        const pdfPage = pdf.getPage(pageIndex);
        const current = pdfPage.getRotation().angle;
        pdfPage.setRotation(degrees((current + (parseInt(angle) || 90)) % 360));
      }
    });
  } else {
    const angle = parseInt(rotations) || 90;
    for (let i = 0; i < totalPages; i++) {
      const page = pdf.getPage(i);
      const current = page.getRotation().angle;
      page.setRotation(degrees((current + angle) % 360));
    }
  }

  const rotatedBytes = await pdf.save();
  const outputPath = path.join(UPLOAD_DIR, `rotated_${uuidv4()}.pdf`);
  fs.writeFileSync(outputPath, rotatedBytes);
  return outputPath;
}

async function reorderPdf(filePath, pageOrder, deletedPages = []) {
  const pdfBytes = fs.readFileSync(filePath);
  const pdf = await PDFDocument.load(pdfBytes);
  const totalPages = pdf.getPageCount();

  const newDoc = await PDFDocument.create();

  const order = pageOrder
    .map((p) => parseInt(p) - 1)
    .filter((i) => i >= 0 && i < totalPages && !deletedPages.map((d) => parseInt(d) - 1).includes(i));

  const copiedPages = await newDoc.copyPages(pdf, order);
  copiedPages.forEach((page) => newDoc.addPage(page));

  const reorderedBytes = await newDoc.save();
  const outputPath = path.join(UPLOAD_DIR, `reordered_${uuidv4()}.pdf`);
  fs.writeFileSync(outputPath, reorderedBytes);
  return outputPath;
}

async function compressPdf(filePath) {
  const pdfBytes = fs.readFileSync(filePath);
  const pdf = await PDFDocument.load(pdfBytes);

  const compressedBytes = await pdf.save({ useObjectStreams: true, addDefaultPage: false });
  const outputPath = path.join(UPLOAD_DIR, `compressed_${uuidv4()}.pdf`);
  fs.writeFileSync(outputPath, compressedBytes);

  const originalSize = fs.statSync(filePath).size;
  const compressedSize = compressedBytes.length;

  return { outputPath, originalSize, compressedSize };
}

async function getPdfInfo(filePath) {
  const pdfBytes = fs.readFileSync(filePath);
  const pdf = await PDFDocument.load(pdfBytes);
  return {
    pageCount: pdf.getPageCount(),
    title: pdf.getTitle() || '',
    author: pdf.getAuthor() || '',
  };
}

/**
 * Detect font style (bold / italic) from the raw font name string embedded in the PDF.
 * PDF font names often follow patterns like "Arial-BoldItalicMT" or "TimesNewRomanPS-BoldMT".
 */
function detectFontStyle(fontName) {
  const name = (fontName || '').toLowerCase();
  const bold = /bold|black|heavy|semibold|demi/.test(name);
  const italic = /italic|oblique|slanted/.test(name);
  return { bold, italic };
}

/**
 * Map a raw PDF font name to a human-readable family name used in the UI.
 * The full mapping (including pdf-lib StandardFont selection) lives in fontMap.js on
 * the frontend; here we just attach a cleaned-up display name to each text item.
 */
function normaliseFontFamily(fontName) {
  const name = (fontName || '').replace(/[,+].*$/, '').trim(); // strip subset prefix like "ABCDEF+"
  if (!name) return 'Unknown';
  // Strip common MT / PS suffixes and style words for a cleaner display name
  return name
    .replace(/-(Bold|Italic|Oblique|Regular|Roman|MT|PS|BoldItalic|BoldOblique|LightItalic|Light|Medium|Narrow|Condensed|Extended).*/i, '')
    .replace(/(Bold|Italic|Oblique|Regular|Roman|MT)$/i, '')
    .trim() || name;
}

async function extractTextFromPdf(filePath) {
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const workerPath = require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs');
  GlobalWorkerOptions.workerSrc = `file://${workerPath}`;

  const pdfBytes = fs.readFileSync(filePath);
  const pdf = await getDocument({ data: new Uint8Array(pdfBytes) }).promise;

  const pages = [];
  let totalItems = 0;

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();

    const items = [];
    let itemId = 0;
    for (const item of textContent.items) {
      if (!item.str || !item.str.trim()) continue;
      const transform = item.transform;
      const x = transform[4];
      const y = transform[5];
      const a = transform[0];
      const b = transform[1];
      const fontSize = Math.max(Math.round(Math.sqrt(a * a + b * b)), 6);
      const { bold, italic } = detectFontStyle(item.fontName);

      items.push({
        id: `p${pageNum}_i${itemId++}`,
        text: item.str,
        x,
        y,
        // Fall back to an approximate char width when pdfjs omits the width value
        // 0.6 is a common approximation for Helvetica-like fonts (char width / em size)
        width: item.width || fontSize * item.str.length * 0.6,
        height: item.height || fontSize,
        fontSize,
        fontName: item.fontName || '',
        fontFamily: normaliseFontFamily(item.fontName),
        bold,
        italic,
      });
    }

    totalItems += items.length;
    pages.push({
      pageNum,
      width: viewport.width,
      height: viewport.height,
      items,
    });
  }

  return { pages, isScanned: totalItems === 0 };
}

/**
 * Select the closest pdf-lib StandardFont for a given raw PDF font name.
 * We inspect the name for family keywords and bold/italic markers.
 */
function resolveStandardFont(fontName, bold, italic) {
  const { StandardFonts } = require('pdf-lib');
  const name = (fontName || '').toLowerCase();

  const isSerif = /times|roman|georgia|palatin|garamond|bookman|century|charter|utopia/.test(name);
  const isMono = /courier|mono|typewriter|consol|inconsolata|lucida console/.test(name);

  if (isMono) {
    if (bold && italic) return StandardFonts.CourierBoldOblique;
    if (bold) return StandardFonts.CourierBold;
    if (italic) return StandardFonts.CourierOblique;
    return StandardFonts.Courier;
  }
  if (isSerif) {
    if (bold && italic) return StandardFonts.TimesBoldItalic;
    if (bold) return StandardFonts.TimesBold;
    if (italic) return StandardFonts.TimesItalic;
    return StandardFonts.TimesRoman;
  }
  // Default: sans-serif family (Helvetica)
  if (bold && italic) return StandardFonts.HelveticaBoldOblique;
  if (bold) return StandardFonts.HelveticaBold;
  if (italic) return StandardFonts.HelveticaOblique;
  return StandardFonts.Helvetica;
}

async function applyTextEdits(filePath, edits) {
  const pdfBytes = fs.readFileSync(filePath);
  const pdf = await PDFDocument.load(pdfBytes);
  pdf.registerFontkit(fontkit);

  const { rgb } = require('pdf-lib');

  // Cache embedded fonts to avoid re-embedding the same font for every edit.
  // We maintain two font caches: one for custom TTF fonts (preferred) and one for
  // pdf-lib standard fonts (fallback when system fonts are unavailable).
  const ttfCache = {};
  const stdCache = {};

  /**
   * Pick the best system font key based on style flags and family name.
   */
  function pickSystemFontKey(fontName, bold, italic) {
    const name = (fontName || '').toLowerCase();
    const isMono = /courier|mono|typewriter|consol|inconsolata|lucida console/.test(name);
    const isSerif = /times|roman|georgia|palatin|garamond|bookman|century|charter|utopia/.test(name);

    if (isMono) return bold ? 'monoBold' : 'monoRegular';
    if (isSerif) return bold ? 'serifBold' : 'serifRegular';
    if (bold && italic) return 'sansBoldItalic';
    if (bold) return 'sansBold';
    if (italic) return 'sansItalic';
    return 'sansRegular';
  }

  /**
   * Embed (or return cached) the best-available font for this text item.
   * Priority: system TTF (Liberation) → pdf-lib standard font.
   */
  async function getFont(fontName, bold, italic) {
    // 1. Try to embed a TTF system font (supports extended Latin + more glyphs)
    const ttfKey = pickSystemFontKey(fontName, bold, italic);
    if (!ttfCache[ttfKey]) {
      const fontBytes = tryLoadSystemFont(SYSTEM_FONT_PATHS[ttfKey]);
      if (fontBytes) {
        try {
          ttfCache[ttfKey] = await pdf.embedFont(fontBytes);
        } catch {
          ttfCache[ttfKey] = null; // mark as unavailable
        }
      } else {
        ttfCache[ttfKey] = null;
      }
    }
    if (ttfCache[ttfKey]) return ttfCache[ttfKey];

    // 2. Fall back to a pdf-lib standard font
    const stdFont = resolveStandardFont(fontName, bold, italic);
    if (!stdCache[stdFont]) {
      stdCache[stdFont] = await pdf.embedFont(stdFont);
    }
    return stdCache[stdFont];
  }

  for (const edit of edits) {
    if (edit.newText === edit.originalText) continue;

    const { pageNum, x, y, width, height, fontSize, fontName, bold, italic, color, newText } = edit;
    const pageIndex = (parseInt(pageNum) || 1) - 1;
    if (pageIndex < 0 || pageIndex >= pdf.getPageCount()) continue;

    const page = pdf.getPage(pageIndex);
    const fsVal = parseFloat(fontSize) || 12;
    const textWidth = parseFloat(width) || 100;
    const textHeight = parseFloat(height) || fsVal;
    const posX = parseFloat(x);
    const posY = parseFloat(y);

    // Cover the original text with a white rectangle.
    // Add generous padding to handle font descenders and rendering differences.
    const padX = 2;
    const padY = Math.max(2, fsVal * 0.2); // ~20% of font size as vertical padding
    page.drawRectangle({
      x: posX - padX,
      y: posY - padY,
      width: textWidth + padX * 2,
      height: textHeight + padY * 2,
      color: rgb(1, 1, 1),
      opacity: 1,
    });

    // TTF-embedded Liberation fonts support extended Latin and basic Arabic/Greek/Cyrillic,
    // but not CJK (Chinese/Japanese/Korean) or complex Indic scripts.
    // We still attempt to draw the text; pdf-lib will substitute replacement glyphs
    // for unsupported code points so the user gets a result rather than an error.
    const newStr = String(newText);

    // Resolve the best-matching font for this text item
    const font = await getFont(fontName, bold === true, italic === true);

    // Resolve text color (support hex from annotations, default to black)
    let textColor = rgb(0, 0, 0);
    if (color && typeof color === 'string' && color.startsWith('#')) {
      const [r, g, b] = parseColor(color);
      textColor = rgb(r, g, b);
    }

    try {
      page.drawText(newStr, {
        x: posX,
        y: posY,
        size: fsVal,
        font,
        color: textColor,
        // Allow a small overflow buffer (+20 units) beyond the original bounding box
        // so that slight font-metric differences don't cause premature line wrapping.
        maxWidth: textWidth + 20,
        lineHeight: textHeight,
      });
    } catch {
      // If the font still can't encode the character(s), skip this edit silently
      // rather than aborting the whole document.
    }
  }

  const editedBytes = await pdf.save();
  const outputPath = path.join(UPLOAD_DIR, `text_edited_${uuidv4()}.pdf`);
  fs.writeFileSync(outputPath, editedBytes);
  return outputPath;
}

async function addTextToPdf(filePath, annotations) {
  const pdfBytes = fs.readFileSync(filePath);
  const pdf = await PDFDocument.load(pdfBytes);
  pdf.registerFontkit(fontkit);

  const { rgb } = require('pdf-lib');

  // Prefer system Liberation Sans for richer glyph coverage over the built-in
  // Helvetica (which only covers basic Latin).
  let font;
  const sansFontBytes = tryLoadSystemFont(SYSTEM_FONT_PATHS.sansRegular);
  if (sansFontBytes) {
    try {
      font = await pdf.embedFont(sansFontBytes);
    } catch {
      font = null;
    }
  }
  if (!font) {
    const { StandardFonts } = require('pdf-lib');
    font = await pdf.embedFont(StandardFonts.Helvetica);
  }

  for (const annotation of annotations) {
    const { page: pageNum, text, x, y, size, color } = annotation;
    const pageIndex = (parseInt(pageNum) || 1) - 1;
    if (pageIndex < 0 || pageIndex >= pdf.getPageCount()) continue;

    const page = pdf.getPage(pageIndex);
    const fontSize = parseInt(size) || 12;
    const [r, g, b] = parseColor(color || '#000000');

    try {
      page.drawText(String(text), {
        x: parseFloat(x) || 50,
        y: parseFloat(y) || 50,
        size: fontSize,
        font,
        color: rgb(r, g, b),
      });
    } catch {
      // Skip annotations that cannot be encoded by the available font
    }
  }

  const editedBytes = await pdf.save();
  const outputPath = path.join(UPLOAD_DIR, `edited_${uuidv4()}.pdf`);
  fs.writeFileSync(outputPath, editedBytes);
  return outputPath;
}

function parseColor(hex) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return [r, g, b];
}

module.exports = {
  mergePdfs,
  splitPdf,
  rotatePdf,
  reorderPdf,
  compressPdf,
  getPdfInfo,
  addTextToPdf,
  extractTextFromPdf,
  applyTextEdits,
};
