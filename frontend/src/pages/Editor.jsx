import { useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Edit3, Plus, Trash2, Type, FileEdit, ScanLine, Languages } from 'lucide-react'
import DropZone from '../components/DropZone'
import ProgressBar from '../components/ProgressBar'
import DownloadResult from '../components/DownloadResult'
import PdfTextEditor from '../components/PdfTextEditor'
import api from '../utils/api'
import { OCR_LANGUAGES } from '../utils/ocrLanguages'

const DEFAULT_ANNOTATION = { page: 1, text: '', x: 50, y: 50, size: 14, color: '#000000' }

function Editor() {
  const [file, setFile] = useState(null)
  const [pageCount, setPageCount] = useState(1)
  const [annotations, setAnnotations] = useState([{ ...DEFAULT_ANNOTATION }])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const [infoLoading, setInfoLoading] = useState(false)

  // Inline text editing state
  const [mode, setMode] = useState('inline') // 'inline' | 'annotate'
  const [extractedPages, setExtractedPages] = useState(null)
  const [isScanned, setIsScanned] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [pendingEdits, setPendingEdits] = useState({})

  // OCR state
  const [ocrRunning, setOcrRunning] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrPages, setOcrPages] = useState(null)
  const [ocrLang, setOcrLang] = useState('eng')

  async function handleFilesAccepted([accepted]) {
    setFile(accepted)
    setResult(null)
    setExtractedPages(null)
    setIsScanned(false)
    setOcrPages(null)
    setPendingEdits({})

    setInfoLoading(true)
    try {
      const formData = new FormData()
      formData.append('pdf', accepted)
      const response = await api.post('/editor/info', formData)
      setPageCount(response.data.pageCount || 1)
    } catch {
      toast.error('Could not read PDF info')
    } finally {
      setInfoLoading(false)
    }

    if (mode === 'inline') {
      await extractText(accepted)
    }
  }

  async function extractText(pdfFile) {
    setExtracting(true)
    try {
      const formData = new FormData()
      formData.append('pdf', pdfFile)
      const response = await api.post('/editor/extract-text', formData)
      setExtractedPages(response.data.pages || [])
      setIsScanned(response.data.isScanned === true)
    } catch {
      toast.error('Could not extract text from PDF')
      setExtractedPages([])
      setIsScanned(false)
    } finally {
      setExtracting(false)
    }
  }

  async function handleModeChange(newMode) {
    setMode(newMode)
    setResult(null)
    if (newMode === 'inline' && file && !extractedPages) {
      await extractText(file)
    }
  }

  // Run OCR via Tesseract.js (lazy-imported to keep initial bundle small)
  async function handleRunOcr() {
    if (!file) return
    setOcrRunning(true)
    setOcrProgress(0)
    try {
      const { runOcr } = await import('../utils/ocrService')
      const result = await runOcr(file, (pct) => setOcrProgress(pct), ocrLang)
      setOcrPages(result.pages)
      const langLabel = OCR_LANGUAGES.find((l) => l.code === ocrLang)?.label || ocrLang
      toast.success(`OCR complete (${langLabel})! Review and edit the recognised text below.`)
    } catch (err) {
      console.error('OCR error:', err)
      toast.error('OCR failed. Please try again.')
    } finally {
      setOcrRunning(false)
    }
  }

  // ── Inline edit save ──────────────────────────────────────────────────────
  async function handleSaveEdits() {
    if (!file) {
      toast.error('Please upload a PDF file')
      return
    }

    const sourcePages = ocrPages || extractedPages || []

    const editList = []
    for (const page of sourcePages) {
      for (const item of page.items) {
        const newText = pendingEdits[item.id]
        if (newText !== undefined && newText !== item.text) {
          editList.push({
            pageNum: page.pageNum,
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height,
            fontSize: item.fontSize,
            fontName: item.fontName || '',
            bold: item.bold || false,
            italic: item.italic || false,
            originalText: item.text,
            newText,
          })
        }
      }
    }

    if (editList.length === 0) {
      toast.error('No changes made — edit some text first')
      return
    }

    setLoading(true)
    setProgress(10)
    try {
      const formData = new FormData()
      formData.append('pdf', file)
      formData.append('edits', JSON.stringify(editList))

      const response = await api.post('/editor/apply-edits', formData, {
        onUploadProgress: (e) => setProgress(Math.round((e.loaded / e.total) * 70) + 10),
      })
      setProgress(100)
      setResult(response.data)
      toast.success('Text edits applied successfully!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to apply text edits')
    } finally {
      setLoading(false)
    }
  }

  // ── Annotation apply ──────────────────────────────────────────────────────
  async function handleApply() {
    if (!file) {
      toast.error('Please upload a PDF file')
      return
    }
    const validAnnotations = annotations.filter((a) => a.text.trim())
    if (validAnnotations.length === 0) {
      toast.error('Please add at least one text annotation')
      return
    }
    setLoading(true)
    setProgress(10)
    try {
      const formData = new FormData()
      formData.append('pdf', file)
      formData.append('annotations', JSON.stringify(validAnnotations))

      const response = await api.post('/editor', formData, {
        onUploadProgress: (e) => setProgress(Math.round((e.loaded / e.total) * 70) + 10),
      })
      setProgress(100)
      setResult(response.data)
      toast.success('Annotations applied successfully!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to apply annotations')
    } finally {
      setLoading(false)
    }
  }

  function addAnnotation() {
    setAnnotations((prev) => [...prev, { ...DEFAULT_ANNOTATION }])
  }

  function removeAnnotation(index) {
    setAnnotations((prev) => prev.filter((_, i) => i !== index))
  }

  function updateAnnotation(index, field, value) {
    setAnnotations((prev) =>
      prev.map((a, i) => (i === index ? { ...a, [field]: value } : a))
    )
  }

  function handleReset() {
    setFile(null)
    setPageCount(1)
    setAnnotations([{ ...DEFAULT_ANNOTATION }])
    setResult(null)
    setProgress(0)
    setExtractedPages(null)
    setIsScanned(false)
    setOcrPages(null)
    setPendingEdits({})
  }

  const editCount = Object.values(pendingEdits).length
  // Which pages to show in the editor: OCR results take priority over extracted
  const displayPages = ocrPages || extractedPages

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
            <Edit3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">PDF Editor</h1>
            <p className="text-gray-500">Edit existing text or add new annotations to your PDF</p>
          </div>
        </div>

        {result ? (
          <DownloadResult result={result} onReset={handleReset} />
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
            <DropZone
              onFilesAccepted={handleFilesAccepted}
              accept={{ 'application/pdf': ['.pdf'] }}
              files={file ? [file] : []}
              onRemove={handleReset}
              label="Drop a PDF file here"
            />

            {(infoLoading || extracting) && (
              <p className="text-sm text-gray-500">
                {extracting ? 'Extracting text from PDF...' : 'Reading PDF...'}
              </p>
            )}

            {file && (
              <>
                {/* Mode tabs */}
                <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => handleModeChange('inline')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
                      mode === 'inline'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <FileEdit className="w-4 h-4" />
                    Edit Existing Text
                  </button>
                  <button
                    onClick={() => handleModeChange('annotate')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
                      mode === 'annotate'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Type className="w-4 h-4" />
                    Add Annotations
                  </button>
                </div>

                {/* ── Inline text editing mode ── */}
                {mode === 'inline' && (
                  <div className="space-y-4">
                    {extracting && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <svg className="animate-spin w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Extracting text elements...
                      </div>
                    )}

                    {/* Scanned PDF banner */}
                    {!extracting && isScanned && !ocrPages && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <ScanLine className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-amber-800">Scanned PDF detected</p>
                            <p className="text-sm text-amber-700 mt-0.5">
                              No selectable text was found. This PDF likely contains scanned images.
                              Select the document language and run OCR to recognise and edit the text.
                            </p>
                          </div>
                        </div>

                        {/* Language selector */}
                        <div className="flex items-center gap-2">
                          <Languages className="w-4 h-4 text-amber-600 shrink-0" />
                          <label className="text-xs font-medium text-amber-800 shrink-0">
                            Document language:
                          </label>
                          <select
                            value={ocrLang}
                            onChange={(e) => setOcrLang(e.target.value)}
                            disabled={ocrRunning}
                            className="flex-1 text-sm border border-amber-300 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50"
                          >
                            {OCR_LANGUAGES.map((l) => (
                              <option key={l.code} value={l.code}>{l.label}</option>
                            ))}
                          </select>
                        </div>

                        {ocrRunning ? (
                          <ProgressBar progress={ocrProgress} label="Running OCR…" />
                        ) : (
                          <button
                            onClick={handleRunOcr}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors"
                          >
                            <ScanLine className="w-4 h-4" />
                            Run OCR
                          </button>
                        )}
                      </div>
                    )}

                    {/* Manual OCR trigger for non-scanned PDFs (optional) */}
                    {!extracting && !isScanned && extractedPages && extractedPages.length > 0 && !ocrPages && (
                      <details className="rounded-xl border border-gray-200">
                        <summary className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-500 cursor-pointer hover:bg-gray-50 rounded-xl select-none">
                          <Languages className="w-4 h-4" />
                          Need OCR for a specific language?
                        </summary>
                        <div className="px-4 pb-4 pt-2 space-y-3">
                          <p className="text-xs text-gray-500">
                            If the PDF contains non-Latin text (e.g. Arabic, Chinese, Devanagari) that
                            was not extracted correctly, select the language and run OCR.
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <select
                              value={ocrLang}
                              onChange={(e) => setOcrLang(e.target.value)}
                              disabled={ocrRunning}
                              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
                            >
                              {OCR_LANGUAGES.map((l) => (
                                <option key={l.code} value={l.code}>{l.label}</option>
                              ))}
                            </select>
                            {ocrRunning ? (
                              <ProgressBar progress={ocrProgress} label="Running OCR…" />
                            ) : (
                              <button
                                onClick={handleRunOcr}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
                              >
                                <ScanLine className="w-4 h-4" />
                                Run OCR
                              </button>
                            )}
                          </div>
                        </div>
                      </details>
                    )}

                    {/* OCR progress while running on non-scanned (manual trigger fallback) */}
                    {ocrRunning && !isScanned && (
                      <ProgressBar progress={ocrProgress} label="Running OCR…" />
                    )}

                    {displayPages && displayPages.length === 0 && !isScanned && (
                      <p className="text-sm text-amber-600 bg-amber-50 rounded-lg p-3">
                        No editable text was found in this PDF. The PDF may use scanned images
                        or non-standard fonts. Try the "Add Annotations" mode instead.
                      </p>
                    )}

                    {displayPages && displayPages.length > 0 && (
                      <>
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <p className="text-sm text-gray-600">
                            {ocrPages && (
                              <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-xs font-medium mr-2">
                                <ScanLine className="w-3 h-3" /> OCR
                                {' · '}
                                {OCR_LANGUAGES.find((l) => l.code === ocrLang)?.label || ocrLang}
                              </span>
                            )}
                            <span className="font-medium">
                              {displayPages.reduce((n, p) => n + p.items.length, 0)}
                            </span>{' '}
                            text elements across{' '}
                            <span className="font-medium">{displayPages.length}</span> page(s).
                            Click any text to edit.
                          </p>
                          {editCount > 0 && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                              {editCount} edited
                            </span>
                          )}
                        </div>

                        <PdfTextEditor
                          file={file}
                          pages={displayPages}
                          onEditsChange={setPendingEdits}
                        />
                      </>
                    )}

                    {loading && <ProgressBar progress={progress} label="Applying text edits..." />}

                    <button
                      onClick={handleSaveEdits}
                      disabled={!file || loading || extracting || ocrRunning}
                      className="btn-primary w-full"
                    >
                      {loading ? 'Saving...' : 'Save Edited PDF'}
                    </button>
                  </div>
                )}

                {/* ── Annotation mode ── */}
                {mode === 'annotate' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-700">Text Annotations</h3>
                      <button
                        onClick={addAnnotation}
                        className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
                      >
                        <Plus className="w-4 h-4" /> Add Text
                      </button>
                    </div>

                    {annotations.map((ann, i) => (
                      <div
                        key={i}
                        className="border border-gray-200 rounded-xl p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">
                            Annotation {i + 1}
                          </span>
                          {annotations.length > 1 && (
                            <button
                              onClick={() => removeAnnotation(i)}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Text</label>
                          <input
                            type="text"
                            placeholder="Enter text to add..."
                            value={ann.text}
                            onChange={(e) => updateAnnotation(i, 'text', e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Page</label>
                            <input
                              type="number"
                              min="1"
                              max={pageCount}
                              value={ann.page}
                              onChange={(e) => updateAnnotation(i, 'page', parseInt(e.target.value) || 1)}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Font size</label>
                            <input
                              type="number"
                              min="6"
                              max="72"
                              value={ann.size}
                              onChange={(e) => updateAnnotation(i, 'size', parseInt(e.target.value) || 12)}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">X position</label>
                            <input
                              type="number"
                              value={ann.x}
                              onChange={(e) => updateAnnotation(i, 'x', parseFloat(e.target.value) || 0)}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Y position</label>
                            <input
                              type="number"
                              value={ann.y}
                              onChange={(e) => updateAnnotation(i, 'y', parseFloat(e.target.value) || 0)}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Color</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={ann.color}
                              onChange={(e) => updateAnnotation(i, 'color', e.target.value)}
                              className="w-8 h-8 rounded border border-gray-200 cursor-pointer"
                            />
                            <span className="text-sm text-gray-600">{ann.color}</span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {loading && <ProgressBar progress={progress} label="Applying annotations..." />}

                    <button
                      onClick={handleApply}
                      disabled={!file || loading}
                      className="btn-primary w-full"
                    >
                      {loading ? 'Applying...' : 'Apply Annotations'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default Editor
