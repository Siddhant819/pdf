import { useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { AlignJustify, GripVertical, Trash2 } from 'lucide-react'
import DropZone from '../components/DropZone'
import ProgressBar from '../components/ProgressBar'
import DownloadResult from '../components/DownloadResult'
import api from '../utils/api'

function Reorder() {
  const [file, setFile] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  const [pageOrder, setPageOrder] = useState([])
  const [deletedPages, setDeletedPages] = useState([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const [infoLoading, setInfoLoading] = useState(false)

  async function handleFilesAccepted([accepted]) {
    setFile(accepted)
    setResult(null)
    setInfoLoading(true)
    try {
      const formData = new FormData()
      formData.append('pdf', accepted)
      const response = await api.post('/reorder/info', formData)
      const count = response.data.pageCount
      setPageCount(count)
      setPageOrder(Array.from({ length: count }, (_, i) => i + 1))
      setDeletedPages([])
    } catch (err) {
      toast.error('Could not read PDF info')
    } finally {
      setInfoLoading(false)
    }
  }

  function moveUp(index) {
    if (index === 0) return
    const newOrder = [...pageOrder]
    ;[newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]]
    setPageOrder(newOrder)
  }

  function moveDown(index) {
    if (index === pageOrder.length - 1) return
    const newOrder = [...pageOrder]
    ;[newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]
    setPageOrder(newOrder)
  }

  function toggleDelete(pageNum) {
    setDeletedPages((prev) =>
      prev.includes(pageNum) ? prev.filter((p) => p !== pageNum) : [...prev, pageNum]
    )
  }

  async function handleReorder() {
    if (!file) {
      toast.error('Please upload a PDF file')
      return
    }
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
    setPageOrder([])
    setDeletedPages([])
    setResult(null)
    setProgress(0)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-pink-50 text-pink-600 rounded-xl flex items-center justify-center">
            <AlignJustify className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reorder Pages</h1>
            <p className="text-gray-500">Reorder or delete pages in your PDF</p>
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

            {infoLoading && <p className="text-sm text-gray-500">Reading PDF...</p>}

            {pageOrder.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-gray-500">
                  {pageCount} pages — drag to reorder, click trash to delete
                </p>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {pageOrder.map((pageNum, index) => {
                    const isDeleted = deletedPages.includes(pageNum)
                    return (
                      <div
                        key={pageNum}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                          isDeleted
                            ? 'opacity-40 bg-red-50 border-red-100'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <GripVertical className="w-4 h-4 text-gray-400" />
                        <span className="flex-1 text-sm font-medium text-gray-700">
                          Page {pageNum}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => moveUp(index)}
                            disabled={index === 0}
                            className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => moveDown(index)}
                            disabled={index === pageOrder.length - 1}
                            className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => toggleDelete(pageNum)}
                            className={`text-xs px-2 py-1 transition-colors ${
                              isDeleted ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {loading && <ProgressBar progress={progress} label="Processing PDF..." />}

            <button
              onClick={handleReorder}
              disabled={!file || loading || pageOrder.length === 0}
              className="btn-primary w-full"
            >
              {loading ? 'Processing...' : 'Apply Changes'}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default Reorder
