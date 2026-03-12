import { useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { RotateCw } from 'lucide-react'
import DropZone from '../components/DropZone'
import ProgressBar from '../components/ProgressBar'
import DownloadResult from '../components/DownloadResult'
import api from '../utils/api'

const ROTATION_OPTIONS = [
  { label: '90° clockwise', value: 90 },
  { label: '180°', value: 180 },
  { label: '90° counter-clockwise', value: 270 },
]

function Rotate() {
  const [file, setFile] = useState(null)
  const [angle, setAngle] = useState(90)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)

  function handleFilesAccepted([accepted]) {
    setFile(accepted)
    setResult(null)
  }

  async function handleRotate() {
    if (!file) {
      toast.error('Please upload a PDF file')
      return
    }
    setLoading(true)
    setProgress(10)
    try {
      const formData = new FormData()
      formData.append('pdf', file)
      formData.append('angle', angle)

      const response = await api.post('/rotate', formData, {
        onUploadProgress: (e) => setProgress(Math.round((e.loaded / e.total) * 70) + 10),
      })
      setProgress(100)
      setResult(response.data)
      toast.success('PDF rotated successfully!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to rotate PDF')
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setFile(null)
    setResult(null)
    setProgress(0)
    setAngle(90)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-yellow-50 text-yellow-600 rounded-xl flex items-center justify-center">
            <RotateCw className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rotate PDF</h1>
            <p className="text-gray-500">Rotate all pages in your PDF</p>
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
              <label className="text-sm font-medium text-gray-700">Rotation angle</label>
              <div className="flex gap-3">
                {ROTATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setAngle(opt.value)}
                    className={`flex-1 py-2 px-3 rounded-xl border text-sm font-medium transition-colors ${
                      angle === opt.value
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {loading && <ProgressBar progress={progress} label="Rotating PDF..." />}

            <button
              onClick={handleRotate}
              disabled={!file || loading}
              className="btn-primary w-full"
            >
              {loading ? 'Rotating...' : 'Rotate PDF'}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default Rotate
