import { useState } from 'react'
import { motion, Reorder } from 'framer-motion'
import toast from 'react-hot-toast'
import { Combine, GripVertical, X, FileText } from 'lucide-react'
import DropZone from '../components/DropZone'
import ProgressBar from '../components/ProgressBar'
import DownloadResult from '../components/DownloadResult'
import api from '../utils/api'

let _uid = 0

function Merge() {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)

  function handleFilesAccepted(accepted) {
    const wrapped = accepted.map((file) => ({ id: ++_uid, file }))
    setFiles((prev) => [...prev, ...wrapped])
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
      files.forEach(({ file }) => formData.append('pdfs', file))

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
              label="Drop PDF files here (at least 2)"
            />

            {files.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Drag to reorder — PDFs will be merged in the order shown below:
                </p>
                <Reorder.Group axis="y" values={files} onReorder={setFiles} className="space-y-2">
                  {files.map(({ id, file }, i) => (
                    <Reorder.Item
                      key={id}
                      value={{ id, file }}
                      className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-2 border border-gray-200 cursor-grab active:cursor-grabbing select-none"
                    >
                      <span className="text-xs font-bold text-indigo-500 w-5 text-center shrink-0">
                        {i + 1}
                      </span>
                      <GripVertical className="w-4 h-4 text-gray-400 shrink-0" />
                      <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span className="text-sm text-gray-700 truncate flex-1">{file.name}</span>
                      <span className="text-xs text-gray-400 shrink-0">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => handleRemove(i)}
                        className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              </div>
            )}

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
