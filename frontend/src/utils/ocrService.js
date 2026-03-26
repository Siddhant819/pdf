/**
 * ocrService.js
 *
 * Runs Tesseract.js OCR over each page of a PDF (rendered via PDF.js) and returns
 * a page/items structure that matches the format expected by PdfTextEditor and the
 * /editor/apply-edits backend endpoint.
 *
 * OCR items are treated as new annotations (they do not replace existing PDF text
 * streams), so they are submitted to the backend via the standard "add annotations"
 * flow once the user confirms.
 */

import * as pdfjsLib from 'pdfjs-dist'
import { createWorker } from 'tesseract.js'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).href

/**
 * Render a single PDF page to an HTMLCanvasElement at the given scale.
 * @param {import('pdfjs-dist').PDFPageProxy} page
 * @param {number} scale
 * @returns {Promise<HTMLCanvasElement>}
 */
async function renderPageToCanvas(page, scale = 2) {
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')
  await page.render({ canvasContext: ctx, viewport }).promise
  return canvas
}

/**
 * Convert a Tesseract word into the item format used by PdfTextEditor.
 * Coordinates are converted from screen-space (top-left origin) to PDF space
 * (bottom-left origin) using the page height.
 *
 * @param {object} word       – Tesseract word result
 * @param {number} pageNum
 * @param {number} itemIndex
 * @param {number} pageHeight – PDF page height in PDF units (scale=1)
 * @param {number} scale      – render scale used when OCR was run
 * @returns {object}
 */
function wordToItem(word, pageNum, itemIndex, pageHeight, scale) {
  const { bbox, text, font_size: fontSize } = word
  // Convert from render-space back to PDF coordinate space
  const x = bbox.x0 / scale
  const w = (bbox.x1 - bbox.x0) / scale
  const h = (bbox.y1 - bbox.y0) / scale
  // PDF y is from bottom; Tesseract bbox.y0 is from top
  const y = pageHeight - bbox.y1 / scale

  const fs = Math.max(Math.round((fontSize || h) / scale), 6)

  return {
    id: `ocr_p${pageNum}_i${itemIndex}`,
    text: text.trim(),
    x,
    y,
    width: w,
    height: h,
    fontSize: fs,
    fontName: '',
    fontFamily: 'Unknown (OCR)',
    bold: false,
    italic: false,
    isOcr: true,
  }
}

/**
 * Run OCR on every page of the given PDF file.
 *
 * @param {File} file  – the PDF File object
 * @param {(progress: number) => void} [onProgress]  – called with 0–100
 * @returns {Promise<{ pages: Array, isScanned: true }>}
 */
export async function runOcr(file, onProgress) {
  onProgress?.(5)

  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise

  // Initialise a single Tesseract worker (English).
  // OEM 1 = LSTM engine only (best accuracy for most documents).
  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        // m.progress is 0–1 per page; we spread across 10–90% of overall progress
        onProgress?.(10 + Math.round(m.progress * 80))
      }
    },
  })

  const pages = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const viewport = page.getViewport({ scale: 1 })
    const RENDER_SCALE = 2 // higher scale → better OCR accuracy
    const canvas = await renderPageToCanvas(page, RENDER_SCALE)

    const {
      data: { words },
    } = await worker.recognize(canvas)

    const items = []
    words.forEach((word, idx) => {
      if (!word.text.trim()) return
      items.push(wordToItem(word, pageNum, idx, viewport.height, RENDER_SCALE))
    })

    pages.push({
      pageNum,
      width: viewport.width,
      height: viewport.height,
      items,
    })
  }

  await worker.terminate()
  onProgress?.(100)

  return { pages, isScanned: true }
}
