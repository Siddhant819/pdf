import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, X } from 'lucide-react'

function DropZone({ onFilesAccepted, accept, multiple = false, files = [], onRemove, label }) {
  const onDrop = useCallback(
    (accepted) => {
      if (accepted.length > 0) onFilesAccepted(accepted)
    },
    [onFilesAccepted]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple,
  })

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`upload-zone ${isDragActive ? 'dragging' : ''}`}
      >
        <input {...getInputProps()} />
        <Upload className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
        {isDragActive ? (
          <p className="text-indigo-600 font-medium">Drop files here...</p>
        ) : (
          <>
            <p className="text-gray-600 font-medium">{label || 'Drag & drop files here'}</p>
            <p className="text-gray-400 text-sm mt-1">or click to browse</p>
          </>
        )}
      </div>

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, i) => (
            <li
              key={i}
              className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2 border border-gray-200"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                <span className="text-sm text-gray-700 truncate max-w-xs">{file.name}</span>
                <span className="text-xs text-gray-400">
                  ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
              {onRemove && (
                <button
                  onClick={() => onRemove(i)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default DropZone
