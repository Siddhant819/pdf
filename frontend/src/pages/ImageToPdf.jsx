import { useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Image } from 'lucide-react'
import DropZone from '../components/DropZone'
import ProgressBar from '../components/ProgressBar'
import DownloadResult from '../components/DownloadResult'
import api from '../utils/api'

function ImageToPdf() {
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

  async function handleConvert() {
    if (files.length === 0) {
      toast.error('Please upload at least one image')
      return
    }
    setLoading(true)
    setProgress(10)
    try {
      const formData = new FormData()
      files.forEach((f) => formData.append('images', f))

      const response = await api.post('/image-to-pdf', formData, {
        onUploadProgress: (e) => setProgress(Math.round((e.loaded / e.total) * 70) + 10),
      })
      setProgress(100)
      setResult(response.data)
      toast.success('Images converted to PDF!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to convert images')
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
          <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center">
            <Image className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Image to PDF</h1>
            <p className="text-gray-500">Convert JPG/PNG images into a PDF</p>
          </div>
        </div>

        {result ? (
          <DownloadResult result={result} onReset={handleReset} />
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
            <DropZone
              onFilesAccepted={handleFilesAccepted}
              accept={{ 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] }}
              multiple
              files={files}
              onRemove={handleRemove}
              label="Drop images here (JPG, PNG)"
            />

            {loading && <ProgressBar progress={progress} label="Converting images to PDF..." />}

            <button
              onClick={handleConvert}
              disabled={files.length === 0 || loading}
              className="btn-primary w-full"
            >
              {loading ? 'Converting...' : `Convert ${files.length} Image${files.length !== 1 ? 's' : ''} to PDF`}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default ImageToPdf
