import { useEffect, useRef, useState, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { resolveFontDisplay } from '../utils/fontMap'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).href

/**
 * PdfTextEditor renders each page of a PDF on a canvas and overlays
 * editable text boxes precisely aligned with the extracted text items.
 *
 * Improvements:
 *  - Text is visible when an item is active or has been edited
 *  - Font family / style badge shown on the active item
 *  - Full undo / redo history (Ctrl+Z / Ctrl+Y)
 *  - Bounding boxes highlighted on hover
 *  - Bold / italic / fontFamily forwarded from extraction
 */
function PdfTextEditor({ file, pages, onEditsChange }) {
  const [pdfDoc, setPdfDoc] = useState(null)
  const [scales, setScales] = useState({})
  // editHistory is a stack of snapshots (each snapshot = { [id]: newText })
  const [editHistory, setEditHistory] = useState([{}])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [activeItemId, setActiveItemId] = useState(null)
  const canvasRefs = useRef({})
  const containerRefs = useRef({})
  const renderTaskRefs = useRef({})

  // Convenience: current edit map is always history[historyIndex]
  const editedItems = editHistory[historyIndex] ?? {}

  // Load the PDF document using pdfjs-dist
  useEffect(() => {
    if (!file) return
    let cancelled = false

    file
      .arrayBuffer()
      .then((buffer) => {
        if (cancelled) return
        return pdfjsLib.getDocument({ data: buffer }).promise
      })
      .then((doc) => {
        if (!cancelled && doc) setPdfDoc(doc)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [file])

  // Render a single page onto its canvas
  const renderPage = useCallback(
    async (pageNum, pageWidth) => {
      if (!pdfDoc) return
      const canvas = canvasRefs.current[pageNum]
      const container = containerRefs.current[pageNum]
      if (!canvas || !container) return

      const containerWidth = container.clientWidth || 800
      const scale = containerWidth / pageWidth

      if (renderTaskRefs.current[pageNum]) {
        try {
          renderTaskRefs.current[pageNum].cancel()
        } catch {
          // ignore render cancellation errors
        }
      }

      const page = await pdfDoc.getPage(pageNum)
      const viewport = page.getViewport({ scale })
      canvas.width = viewport.width
      canvas.height = viewport.height

      const ctx = canvas.getContext('2d')
      const renderTask = page.render({ canvasContext: ctx, viewport })
      renderTaskRefs.current[pageNum] = renderTask

      try {
        await renderTask.promise
        setScales((prev) => ({ ...prev, [pageNum]: scale }))
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException') console.error('Render error:', err)
      }
    },
    [pdfDoc],
  )

  // Re-render all pages when pdfDoc or pages change
  useEffect(() => {
    if (!pdfDoc || !pages.length) return
    pages.forEach(({ pageNum, width }) => renderPage(pageNum, width))
  }, [pdfDoc, pages, renderPage])

  // Keyboard shortcuts: Ctrl+Z (undo) / Ctrl+Y or Ctrl+Shift+Z (redo)
  useEffect(() => {
    function onKeyDown(e) {
      const ctrl = e.ctrlKey || e.metaKey
      if (!ctrl) return
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        setHistoryIndex((i) => {
          const next = Math.max(0, i - 1)
          onEditsChange && onEditsChange(editHistory[next] ?? {})
          return next
        })
      }
      if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault()
        setHistoryIndex((i) => {
          const next = Math.min(editHistory.length - 1, i + 1)
          onEditsChange && onEditsChange(editHistory[next] ?? {})
          return next
        })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [editHistory, onEditsChange])

  function getCurrentText(item) {
    return editedItems[item.id] !== undefined ? editedItems[item.id] : item.text
  }

  function handleItemChange(id, value) {
    // Truncate future history when a new edit is made (standard undo behaviour)
    setEditHistory((prev) => {
      const base = prev.slice(0, historyIndex + 1)
      const next = { ...base[base.length - 1], [id]: value }
      return [...base, next]
    })
    setHistoryIndex((i) => i + 1)
    onEditsChange && onEditsChange({ ...editedItems, [id]: value })
  }

  // Convert PDF coordinates (bottom-left origin) to CSS overlay coords
  function toOverlayStyle(item, pageHeight, scale) {
    const left = item.x * scale
    // item.y is the baseline position from the bottom of the page.
    // The visible text box top starts above the baseline by approximately item.height.
    const top = (pageHeight - item.y - item.height) * scale
    const width = Math.max(item.width * scale, 20)
    // Ensure the overlay covers at least 90% of the font em-size
    const height = Math.max(item.height * scale, item.fontSize * scale * 0.9)
    const fontSize = item.fontSize * scale

    return { left, top, width, height, fontSize }
  }

  if (!pages || pages.length === 0) return null

  const undoAvailable = historyIndex > 0
  const redoAvailable = historyIndex < editHistory.length - 1
  const editCount = Object.keys(editedItems).length

  return (
    <div className="space-y-4">
      {/* Undo / Redo toolbar */}
      <div className="flex items-center gap-3 text-sm">
        <button
          disabled={!undoAvailable}
          onClick={() =>
            setHistoryIndex((i) => {
              const next = Math.max(0, i - 1)
              onEditsChange && onEditsChange(editHistory[next] ?? {})
              return next
            })
          }
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50 disabled:cursor-not-allowed"
          title="Undo (Ctrl+Z)"
        >
          ↩ Undo
        </button>
        <button
          disabled={!redoAvailable}
          onClick={() =>
            setHistoryIndex((i) => {
              const next = Math.min(editHistory.length - 1, i + 1)
              onEditsChange && onEditsChange(editHistory[next] ?? {})
              return next
            })
          }
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50 disabled:cursor-not-allowed"
          title="Redo (Ctrl+Y)"
        >
          ↪ Redo
        </button>
        {editCount > 0 && (
          <span className="ml-auto text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
            {editCount} change{editCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Per-page canvas + overlay */}
      <div className="space-y-6">
        {pages.map(({ pageNum, height: pageHeight, items }) => {
          const scale = scales[pageNum] || 1

          return (
            <div key={pageNum} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Page {pageNum}</span>
                <span className="text-xs text-gray-400">Click any text to edit · Ctrl+Z to undo</span>
              </div>

              {/* Page container: canvas + overlay */}
              <div
                ref={(el) => { containerRefs.current[pageNum] = el }}
                className="relative bg-white"
                style={{ width: '100%' }}
              >
                <canvas
                  ref={(el) => { canvasRefs.current[pageNum] = el }}
                  className="block w-full"
                />

                {/* Text overlay items */}
                {items.map((item) => {
                  const style = toOverlayStyle(item, pageHeight, scale)
                  const isActive = activeItemId === item.id
                  const currentText = getCurrentText(item)
                  const isEdited =
                    editedItems[item.id] !== undefined && editedItems[item.id] !== item.text

                  const { displayName, cssStack } = resolveFontDisplay(
                    item.fontName,
                    item.bold,
                    item.italic,
                  )

                  return (
                    <div
                      key={item.id}
                      className={`absolute cursor-text transition-all ${
                        isActive
                          ? 'ring-2 ring-indigo-500 z-10'
                          : isEdited
                          ? 'ring-1 ring-amber-400 hover:ring-indigo-300'
                          : 'hover:ring-1 hover:ring-indigo-300'
                      }`}
                      style={{
                        position: 'absolute',
                        left: style.left,
                        top: style.top,
                        width: style.width,
                        minWidth: 20,
                        height: style.height,
                        minHeight: 10,
                        backgroundColor: isActive
                          ? 'rgba(255,255,255,0.92)'
                          : isEdited
                          ? 'rgba(255,251,235,0.75)'
                          : 'transparent',
                      }}
                    >
                      {/* Font info badge shown above the active item */}
                      {isActive && (
                        <div
                          className="absolute -top-6 left-0 whitespace-nowrap bg-indigo-600 text-white px-1.5 py-0.5 rounded z-20 pointer-events-none"
                          style={{ fontSize: 10 }}
                        >
                          {displayName} · {Math.round(item.fontSize)}pt
                        </div>
                      )}

                      <input
                        type="text"
                        value={currentText}
                        onChange={(e) => handleItemChange(item.id, e.target.value)}
                        onFocus={() => setActiveItemId(item.id)}
                        onBlur={() => setActiveItemId(null)}
                        className="w-full h-full bg-transparent border-none outline-none caret-indigo-600 selection:bg-indigo-200/70"
                        style={{
                          fontSize: style.fontSize,
                          lineHeight: 1,
                          padding: 0,
                          // Text is visible when focused or edited; transparent otherwise
                          // so the underlying PDF canvas shows through undisturbed.
                          color: isActive || isEdited ? '#1e1b4b' : 'transparent',
                          caretColor: '#4f46e5',
                          fontFamily: cssStack,
                          fontWeight: item.bold ? 'bold' : 'normal',
                          fontStyle: item.italic ? 'italic' : 'normal',
                        }}
                        title={`Original: "${item.text}" · Font: ${displayName}`}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PdfTextEditor
