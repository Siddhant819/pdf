import { useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { FileType2 } from 'lucide-react'
import DropZone from '../components/DropZone'
import ProgressBar from '../components/ProgressBar'
import DownloadResult from '../components/DownloadResult'
import api from '../utils/api'

function PdfToWord() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)

  function handleFilesAccepted([accepted]) {
    setFile(accepted)
    setResult(null)
  }

  async function handleConvert() {
    if (!file) {
      toast.error('Please upload a PDF file')
      return
    }
    setLoading(true)
    setProgress(10)
    try {
      const formData = new FormData()
      formData.append('pdf', file)

      const response = await api.post('/pdf-to-word', formData, {
        onUploadProgress: (e) => setProgress(Math.round((e.loaded / e.total) * 70) + 10),
      })
      setProgress(100)
      setResult(response.data)
      toast.success('PDF converted to Word!')
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to convert PDF'
      toast.error(message)
      if (err.response?.data?.installGuide) {
        toast(err.response.data.installGuide, { icon: 'ℹ️', duration: 6000 })
      }
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
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
            <FileType2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">PDF to Word</h1>
            <p className="text-gray-500">Convert PDF into editable Word documents</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
          <strong>Note:</strong> This feature requires LibreOffice installed on the server.
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

            {loading && <ProgressBar progress={progress} label="Converting PDF to Word..." />}

            <button
              onClick={handleConvert}
              disabled={!file || loading}
              className="btn-primary w-full"
            >
              {loading ? 'Converting...' : 'Convert to Word'}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default PdfToWord
