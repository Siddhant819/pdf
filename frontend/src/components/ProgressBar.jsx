function ProgressBar({ progress, label }) {
  return (
    <div className="space-y-1">
      {label && <p className="text-sm text-gray-600">{label}</p>}
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 text-right">{Math.round(progress)}%</p>
    </div>
  )
}

export default ProgressBar
