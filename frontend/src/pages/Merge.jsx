import { useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Combine } from 'lucide-react'
import DropZone from '../components/DropZone'
import ProgressBar from '../components/ProgressBar'
import DownloadResult from '../components/DownloadResult'
import api from '../utils/api'

function Merge() {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)

  function handleFilesAccepted(accepted) {
    setFiles((prev) => [...prev, ...accepted])
    setResult(null)
  }

  function handleRemove(index) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleMerge() {
    if (files.length < 2) {
      toast.error('Please upload at least 2 PDF files')
      return
    }
    setLoading(true)
    setProgress(10)
    try {
      const formData = new FormData()
      files.forEach((f) => formData.append('pdfs', f))

      const response = await api.post('/merge', formData, {
        onUploadProgress: (e) => setProgress(Math.round((e.loaded / e.total) * 70) + 10),
      })
      setProgress(100)
      setResult(response.data)
      toast.success('PDFs merged successfully!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to merge PDFs')
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setFiles([])
    setResult(null)
    setProgress(0)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Combine className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Merge PDF</h1>
            <p className="text-gray-500">Combine multiple PDFs into one file</p>
          </div>
        </div>

        {result ? (
          <DownloadResult result={result} onReset={handleReset} />
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
            <DropZone
              onFilesAccepted={handleFilesAccepted}
              accept={{ 'application/pdf': ['.pdf'] }}
              multiple
              files={files}
              onRemove={handleRemove}
              label="Drop PDF files here (at least 2)"
            />

            {loading && <ProgressBar progress={progress} label="Merging PDFs..." />}

            <button
              onClick={handleMerge}
              disabled={files.length < 2 || loading}
              className="btn-primary w-full"
            >
              {loading ? 'Merging...' : `Merge ${files.length} PDF${files.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default Merge
