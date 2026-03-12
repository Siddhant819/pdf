import { useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { FileImage } from 'lucide-react'
import DropZone from '../components/DropZone'
import ProgressBar from '../components/ProgressBar'
import DownloadResult from '../components/DownloadResult'
import api from '../utils/api'

function PdfToImage() {
  const [file, setFile] = useState(null)
  const [format, setFormat] = useState('png')
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
      formData.append('format', format)

      const response = await api.post('/pdf-to-image', formData, {
        onUploadProgress: (e) => setProgress(Math.round((e.loaded / e.total) * 70) + 10),
      })
      setProgress(100)
      setResult(response.data)
      toast.success('PDF converted to images!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to convert PDF')
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
          <div className="w-12 h-12 bg-cyan-50 text-cyan-600 rounded-xl flex items-center justify-center">
            <FileImage className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">PDF to Image</h1>
            <p className="text-gray-500">Convert PDF pages to JPG or PNG</p>
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

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Output format</label>
              <div className="flex gap-3">
                {['png', 'jpeg'].map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setFormat(fmt)}
                    className={`flex-1 py-2 px-3 rounded-xl border text-sm font-medium transition-colors ${
                      format === fmt
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {loading && <ProgressBar progress={progress} label="Converting PDF to images..." />}

            <button
              onClick={handleConvert}
              disabled={!file || loading}
              className="btn-primary w-full"
            >
              {loading ? 'Converting...' : 'Convert to Images'}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default PdfToImage
