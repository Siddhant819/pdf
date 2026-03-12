import { Link, useLocation } from 'react-router-dom'
import { FileText } from 'lucide-react'

function Navbar() {
  const location = useLocation()

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-indigo-600">
            <FileText className="w-6 h-6" />
            PDF Tools
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {[
              { path: '/merge', label: 'Merge' },
              { path: '/split', label: 'Split' },
              { path: '/compress', label: 'Compress' },
              { path: '/editor', label: 'Editor' },
            ].map(({ path, label }) => (
              <Link
                key={path}
                to={path}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === path
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
          <Link to="/" className="btn-primary text-sm py-2 px-4">
            All Tools
          </Link>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
