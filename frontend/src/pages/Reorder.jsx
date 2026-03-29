import { useState, useEffect, useRef } from 'react'
import { motion, Reorder as FramerReorder } from 'framer-motion'
import toast from 'react-hot-toast'
import { AlignJustify, GripVertical, Trash2, RotateCcw, FileText, X } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import DropZone from '../components/DropZone'
import ProgressBar from '../components/ProgressBar'
import DownloadResult from '../components/DownloadResult'
import api from '../utils/api'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).href

// Generate a small thumbnail for a single PDF page
async function generateThumbnail(pdfDoc, pageNum, width = 80) {
  try {
    const page = await pdfDoc.getPage(pageNum)
    const viewport = page.getViewport({ scale: 1 })
    const scale = width / viewport.width
    const scaledViewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = scaledViewport.width
    canvas.height = scaledViewport.height
    const ctx = canvas.getContext('2d')
    await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise
    return canvas.toDataURL('image/jpeg', 0.7)
  } catch {
    return null
  }
}

function Reorder() {
  const [file, setFile] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  // Each entry: { id: number (original 1-based page number), label: number (position label) }
  const [pages, setPages] = useState([])
  const [deletedIds, setDeletedIds] = useState(new Set())
  const [thumbnails, setThumbnails] = useState({})
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const [infoLoading, setInfoLoading] = useState(false)
  const pdfDocRef = useRef(null)

  // Load PDF.js document and generate thumbnails when file changes
  useEffect(() => {
    if (!file) return
    let cancelled = false
    file.arrayBuffer().then(async (buffer) => {
      if (cancelled) return
      const doc = await pdfjsLib.getDocument({ data: buffer }).promise
      if (cancelled) return
      pdfDocRef.current = doc
      for (let i = 1; i <= doc.numPages; i++) {
        const dataUrl = await generateThumbnail(doc, i)
        if (cancelled) return
        if (dataUrl) {
          setThumbnails((prev) => ({ ...prev, [i]: dataUrl }))
        }
      }
    }).catch(() => {})
    return () => { cancelled = true }
  }, [file])

  async function handleFilesAccepted([accepted]) {
    setFile(accepted)
    setResult(null)
    setThumbnails({})
    setDeletedIds(new Set())
    setInfoLoading(true)
    try {
      const formData = new FormData()
      formData.append('pdf', accepted)
      const response = await api.post('/reorder/info', formData)
      const count = response.data.pageCount
      setPageCount(count)
      setPages(Array.from({ length: count }, (_, i) => ({ id: i + 1 })))
    } catch {
      toast.error('Could not read PDF info')
    } finally {
      setInfoLoading(false)
    }
  }

  function toggleDelete(id) {
    setDeletedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleRestoreAll() {
    setDeletedIds(new Set())
  }

  async function handleReorder() {
    if (!file) {
      toast.error('Please upload a PDF file')
      return
    }
    const pageOrder = pages.map((p) => p.id)
    const deletedPages = Array.from(deletedIds)
    setLoading(true)
    setProgress(10)
    try {
      const formData = new FormData()
      formData.append('pdf', file)
      formData.append('pageOrder', JSON.stringify(pageOrder))
      formData.append('deletedPages', JSON.stringify(deletedPages))

      const response = await api.post('/reorder', formData, {
        onUploadProgress: (e) => setProgress(Math.round((e.loaded / e.total) * 70) + 10),
      })
      setProgress(100)
      setResult(response.data)
      toast.success('Pages reordered successfully!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reorder pages')
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setFile(null)
    setPageCount(0)
    setPages([])
    setDeletedIds(new Set())
    setThumbnails({})
    setResult(null)
    setProgress(0)
    pdfDocRef.current = null
  }

  const activeCount = pages.length - deletedIds.size

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-pink-50 text-pink-600 rounded-xl flex items-center justify-center">
            <AlignJustify className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reorder Pages</h1>
            <p className="text-gray-500">Drag to reorder or delete pages in your PDF</p>
          </div>
        </div>

        {result ? (
          <DownloadResult result={result} onReset={handleReset} />
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">

            {/* Show DropZone only when no file is loaded yet */}
            {!file ? (
              <DropZone
                onFilesAccepted={handleFilesAccepted}
                accept={{ 'application/pdf': ['.pdf'] }}
                label="Drop a PDF file here"
              />
            ) : (
              /* Compact file info bar — prevents accidentally re-triggering the upload zone while reordering */
              <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
                <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
                <span className="text-sm font-medium text-indigo-700 truncate flex-1">{file.name}</span>
                <span className="text-xs text-indigo-400 shrink-0">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
                <button
                  onClick={handleReset}
                  className="text-indigo-400 hover:text-red-500 transition-colors shrink-0"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {infoLoading && <p className="text-sm text-gray-500">Reading PDF…</p>}

            {pages.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    <span className="font-medium text-gray-700">{pageCount}</span> pages
                    {deletedIds.size > 0 && (
                      <span className="text-red-500 ml-1">· {deletedIds.size} marked for deletion</span>
                    )}
                  </p>
                  <div className="flex items-center gap-2">
                    {deletedIds.size > 0 && (
                      <button
                        onClick={handleRestoreAll}
                        className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" /> Restore all
                      </button>
                    )}
                    <span className="text-xs text-gray-400">Drag rows to reorder</span>
                  </div>
                </div>

                <FramerReorder.Group
                  axis="y"
                  values={pages}
                  onReorder={setPages}
                  className="space-y-2"
                >
                  {pages.map((page, index) => {
                    const isDeleted = deletedIds.has(page.id)
                    const thumb = thumbnails[page.id]
                    return (
                      <FramerReorder.Item
                        key={page.id}
                        value={page}
                        className={`flex items-center gap-3 p-2 rounded-xl border transition-all select-none ${
                          isDeleted
                            ? 'opacity-40 bg-red-50 border-red-200'
                            : 'bg-gray-50 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40'
                        }`}
                        style={{ cursor: isDeleted ? 'default' : 'grab' }}
                      >
                        <GripVertical className="w-4 h-4 text-gray-400 shrink-0" />

                        {/* Page thumbnail */}
                        <div className="w-10 h-14 bg-white border border-gray-200 rounded overflow-hidden shrink-0 flex items-center justify-center">
                          {thumb ? (
                            <img src={thumb} alt={`Page ${page.id}`} className="w-full h-full object-contain" />
                          ) : (
                            <span className="text-[9px] text-gray-400">PDF</span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-gray-700">
                            Page {page.id}
                          </span>
                          <span className="ml-2 text-xs text-gray-400">→ position {index + 1}</span>
                          {isDeleted && (
                            <span className="ml-2 text-xs text-red-500 font-medium">will be removed</span>
                          )}
                        </div>

                        <button
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={() => toggleDelete(page.id)}
                          className={`shrink-0 p-1.5 rounded-lg transition-colors ${
                            isDeleted
                              ? 'text-red-500 bg-red-100 hover:bg-red-200'
                              : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                          }`}
                          title={isDeleted ? 'Restore page' : 'Mark for deletion'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </FramerReorder.Item>
                    )
                  })}
                </FramerReorder.Group>
              </div>
            )}

            {loading && <ProgressBar progress={progress} label="Processing PDF..." />}

            <button
              onClick={handleReorder}
              disabled={!file || loading || pages.length === 0 || activeCount === 0}
              className="btn-primary w-full"
            >
              {loading
                ? 'Processing...'
                : `Apply Changes${activeCount > 0 ? ` (${activeCount} page${activeCount !== 1 ? 's' : ''})` : ''}`}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default Reorder
