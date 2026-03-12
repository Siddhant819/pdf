import { useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Scissors, Plus, Trash2 } from 'lucide-react'
import DropZone from '../components/DropZone'
import ProgressBar from '../components/ProgressBar'
import DownloadResult from '../components/DownloadResult'
import api from '../utils/api'

function Split() {
  const [file, setFile] = useState(null)
  const [ranges, setRanges] = useState([{ start: '', end: '' }])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)

  function handleFilesAccepted([accepted]) {
    setFile(accepted)
    setResult(null)
  }

  function addRange() {
    setRanges((prev) => [...prev, { start: '', end: '' }])
  }

  function removeRange(index) {
    setRanges((prev) => prev.filter((_, i) => i !== index))
  }

  function updateRange(index, field, value) {
    setRanges((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    )
  }

  async function handleSplit() {
    if (!file) {
      toast.error('Please upload a PDF file')
      return
    }
    setLoading(true)
    setProgress(10)
    try {
      const formData = new FormData()
      formData.append('pdf', file)
      const cleanedRanges = ranges.map((r) => ({
        start: parseInt(r.start) || 1,
        end: r.end ? parseInt(r.end) : null,
      }))
      formData.append('ranges', JSON.stringify(cleanedRanges))

      const response = await api.post('/split', formData, {
        onUploadProgress: (e) => setProgress(Math.round((e.loaded / e.total) * 70) + 10),
      })
      setProgress(100)
      setResult(response.data)
      toast.success('PDF split successfully!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to split PDF')
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setFile(null)
    setRanges([{ start: '', end: '' }])
    setResult(null)
    setProgress(0)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
            <Scissors className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Split PDF</h1>
            <p className="text-gray-500">Split a PDF into multiple files by page range</p>
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
              onRemove={() => setFile(null)}
              label="Drop a PDF file here"
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-700">Page Ranges</h3>
                <button
                  onClick={addRange}
                  className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
                >
                  <Plus className="w-4 h-4" /> Add Range
                </button>
              </div>
              {ranges.map((range, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 w-16">Part {i + 1}</span>
                  <input
                    type="number"
                    min="1"
                    placeholder="From page"
                    value={range.start}
                    onChange={(e) => updateRange(i, 'start', e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-gray-400">—</span>
                  <input
                    type="number"
                    min="1"
                    placeholder="To page"
                    value={range.end}
                    onChange={(e) => updateRange(i, 'end', e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {ranges.length > 1 && (
                    <button
                      onClick={() => removeRange(i)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {loading && <ProgressBar progress={progress} label="Splitting PDF..." />}

            <button
              onClick={handleSplit}
              disabled={!file || loading}
              className="btn-primary w-full"
            >
              {loading ? 'Splitting...' : 'Split PDF'}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default Split
