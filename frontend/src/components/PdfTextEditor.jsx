import { useEffect, useRef, useState, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).href

/**
 * PdfTextEditor renders each page of a PDF on a canvas and overlays
 * editable text boxes precisely aligned with the extracted text items.
 * Users can click any text item to edit it inline.
 */
function PdfTextEditor({ file, pages, onEditsChange }) {
  const [pdfDoc, setPdfDoc] = useState(null)
  const [scales, setScales] = useState({})
  const [editedItems, setEditedItems] = useState({})
  const [activeItemId, setActiveItemId] = useState(null)
  const canvasRefs = useRef({})
  const containerRefs = useRef({})
  const renderTaskRefs = useRef({})

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

      // Cancel any ongoing render for this page
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
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Render error:', err)
        }
      }
    },
    [pdfDoc]
  )

  // Re-render all pages when pdfDoc or pages change
  useEffect(() => {
    if (!pdfDoc || !pages.length) return
    pages.forEach(({ pageNum, width }) => renderPage(pageNum, width))
  }, [pdfDoc, pages, renderPage])

  function getCurrentText(item) {
    return editedItems[item.id] !== undefined ? editedItems[item.id] : item.text
  }

  function handleItemChange(id, value) {
    const updated = { ...editedItems, [id]: value }
    setEditedItems(updated)
    onEditsChange && onEditsChange(updated)
  }

  // Convert PDF coordinates (bottom-left origin) to CSS overlay coords
  function toOverlayStyle(item, pageHeight, scale) {
    const left = item.x * scale
    // item.y is the baseline position from the bottom of the page.
    // The visible text box top starts above the baseline by approximately item.height.
    const top = (pageHeight - item.y - item.height) * scale
    const width = Math.max(item.width * scale, 20)
    // 0.9 ensures the overlay covers at least 90% of the font em-size when
    // pdfjs reports zero height (e.g. for some embedded fonts)
    const height = Math.max(item.height * scale, item.fontSize * scale * 0.9)
    const fontSize = item.fontSize * scale

    return { left, top, width, height, fontSize }
  }

  if (!pages || pages.length === 0) return null

  return (
    <div className="space-y-6">
      {pages.map(({ pageNum, height: pageHeight, items }) => {
        const scale = scales[pageNum] || 1

        return (
          <div key={pageNum} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">Page {pageNum}</span>
              <span className="text-xs text-gray-400">
                Click any text to edit it inline
              </span>
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

              {/* Text overlay */}
              {items.map((item) => {
                const style = toOverlayStyle(item, pageHeight, scale)
                const isActive = activeItemId === item.id
                const isEdited =
                  editedItems[item.id] !== undefined &&
                  editedItems[item.id] !== item.text

                return (
                  <div
                    key={item.id}
                    className={`absolute cursor-text transition-all ${
                      isActive
                        ? 'ring-2 ring-indigo-400 bg-white/90 z-10'
                        : isEdited
                        ? 'ring-1 ring-amber-400 bg-amber-50/60 hover:ring-indigo-300 hover:bg-indigo-50/60'
                        : 'hover:ring-1 hover:ring-indigo-300 hover:bg-indigo-50/50'
                    }`}
                    style={{
                      position: 'absolute',
                      left: style.left,
                      top: style.top,
                      width: style.width,
                      minWidth: 20,
                      height: style.height,
                      minHeight: 10,
                    }}
                  >
                    <input
                      type="text"
                      value={getCurrentText(item)}
                      onChange={(e) => handleItemChange(item.id, e.target.value)}
                      onFocus={() => setActiveItemId(item.id)}
                      onBlur={() => setActiveItemId(null)}
                      className="w-full h-full bg-transparent border-none outline-none text-transparent caret-indigo-600 selection:bg-indigo-200/70"
                      style={{
                        fontSize: style.fontSize,
                        lineHeight: 1,
                        padding: 0,
                        color: 'transparent',
                        caretColor: '#4f46e5',
                      }}
                      title={`Original: "${item.text}"`}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default PdfTextEditor
