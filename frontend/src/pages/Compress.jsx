import { useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { FileDown } from 'lucide-react'
import DropZone from '../components/DropZone'
import ProgressBar from '../components/ProgressBar'
import DownloadResult from '../components/DownloadResult'
import api from '../utils/api'

function Compress() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)

  function handleFilesAccepted([accepted]) {
    setFile(accepted)
    setResult(null)
  }

  async function handleCompress() {
    if (!file) {
      toast.error('Please upload a PDF file')
      return
    }
    setLoading(true)
    setProgress(10)
    try {
      const formData = new FormData()
      formData.append('pdf', file)

      const response = await api.post('/compress', formData, {
        onUploadProgress: (e) => setProgress(Math.round((e.loaded / e.total) * 70) + 10),
      })
      setProgress(100)
      setResult(response.data)
      toast.success('PDF compressed successfully!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to compress PDF')
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setFile(null)
    setResult(null)
    setProgress(0)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
            <FileDown className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Compress PDF</h1>
            <p className="text-gray-500">Reduce file size while maintaining quality</p>
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
              label="Drop a PDF file here to compress"
            />

            {loading && <ProgressBar progress={progress} label="Compressing PDF..." />}

            <button
              onClick={handleCompress}
              disabled={!file || loading}
              className="btn-primary w-full"
            >
              {loading ? 'Compressing...' : 'Compress PDF'}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default Compress
