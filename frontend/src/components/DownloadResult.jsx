import { Download, CheckCircle } from 'lucide-react'

function DownloadResult({ result, onReset }) {
  if (!result) return null

  const files = result.files || (result.downloadUrl ? [{ downloadUrl: result.downloadUrl, filename: result.filename, label: 'Download' }] : [])

  return (
    <div className="bg-green-50 border border-green-200 rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-2 text-green-700">
        <CheckCircle className="w-5 h-5" />
        <span className="font-semibold">{result.message || 'Processing complete!'}</span>
      </div>

      {result.savedPercent !== undefined && (
        <div className="text-sm text-green-600 bg-green-100 rounded-lg px-3 py-2">
          Reduced by {result.savedPercent}% &bull;{' '}
          {(result.originalSize / 1024).toFixed(1)} KB → {(result.compressedSize / 1024).toFixed(1)} KB
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {files.map((file, i) => (
          <a
            key={i}
            href={file.downloadUrl}
            download={file.filename}
            className="btn-primary flex items-center gap-2 no-underline"
          >
            <Download className="w-4 h-4" />
            {file.label || `Download ${i + 1}`}
          </a>
        ))}
      </div>

      <button onClick={onReset} className="btn-secondary text-sm py-2 px-4">
        Process another file
      </button>
    </div>
  )
}

export default DownloadResult
