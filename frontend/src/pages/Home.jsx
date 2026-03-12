import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Combine, Scissors, FileDown, RotateCw, AlignJustify,
  Image, FileImage, FileText, FileType2, Edit3
} from 'lucide-react'

const tools = [
  {
    icon: Combine,
    title: 'Merge PDF',
    description: 'Combine multiple PDFs into one file',
    path: '/merge',
    color: 'bg-blue-500',
    lightColor: 'bg-blue-50',
    textColor: 'text-blue-600',
  },
  {
    icon: Scissors,
    title: 'Split PDF',
    description: 'Split a PDF into multiple files by page range',
    path: '/split',
    color: 'bg-orange-500',
    lightColor: 'bg-orange-50',
    textColor: 'text-orange-600',
  },
  {
    icon: FileDown,
    title: 'Compress PDF',
    description: 'Reduce PDF file size while maintaining quality',
    path: '/compress',
    color: 'bg-green-500',
    lightColor: 'bg-green-50',
    textColor: 'text-green-600',
  },
  {
    icon: Edit3,
    title: 'PDF Editor',
    description: 'Add text and annotations to your PDF',
    path: '/editor',
    color: 'bg-purple-500',
    lightColor: 'bg-purple-50',
    textColor: 'text-purple-600',
  },
  {
    icon: RotateCw,
    title: 'Rotate PDF',
    description: 'Rotate pages in your PDF document',
    path: '/rotate',
    color: 'bg-yellow-500',
    lightColor: 'bg-yellow-50',
    textColor: 'text-yellow-600',
  },
  {
    icon: AlignJustify,
    title: 'Reorder Pages',
    description: 'Reorder or delete pages in a PDF',
    path: '/reorder',
    color: 'bg-pink-500',
    lightColor: 'bg-pink-50',
    textColor: 'text-pink-600',
  },
  {
    icon: Image,
    title: 'Image to PDF',
    description: 'Convert JPG/PNG images to a PDF',
    path: '/image-to-pdf',
    color: 'bg-teal-500',
    lightColor: 'bg-teal-50',
    textColor: 'text-teal-600',
  },
  {
    icon: FileImage,
    title: 'PDF to Image',
    description: 'Convert PDF pages to JPG or PNG',
    path: '/pdf-to-image',
    color: 'bg-cyan-500',
    lightColor: 'bg-cyan-50',
    textColor: 'text-cyan-600',
  },
  {
    icon: FileText,
    title: 'Word to PDF',
    description: 'Convert .docx files to PDF format',
    path: '/word-to-pdf',
    color: 'bg-indigo-500',
    lightColor: 'bg-indigo-50',
    textColor: 'text-indigo-600',
  },
  {
    icon: FileType2,
    title: 'PDF to Word',
    description: 'Convert PDF into editable Word documents',
    path: '/pdf-to-word',
    color: 'bg-red-500',
    lightColor: 'bg-red-50',
    textColor: 'text-red-600',
  },
]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-14"
      >
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          All-in-one{' '}
          <span className="text-indigo-600">PDF Tools</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto">
          Edit, convert, and manage your PDF files online — free, fast, and secure.
        </p>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
      >
        {tools.map((tool) => {
          const Icon = tool.icon
          return (
            <motion.div key={tool.path} variants={item}>
              <Link to={tool.path} className="tool-card flex flex-col gap-4 block h-full">
                <div className={`w-12 h-12 ${tool.lightColor} ${tool.textColor} rounded-xl flex items-center justify-center`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{tool.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{tool.description}</p>
                </div>
              </Link>
            </motion.div>
          )
        })}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-center"
      >
        {[
          { label: '100% Free', desc: 'All tools are completely free to use' },
          { label: 'Secure & Private', desc: 'Files are deleted automatically after processing' },
          { label: 'No Registration', desc: 'No account needed — just upload and go' },
        ].map(({ label, desc }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-6">
            <h4 className="font-bold text-gray-900 mb-1">{label}</h4>
            <p className="text-sm text-gray-500">{desc}</p>
          </div>
        ))}
      </motion.div>
    </div>
  )
}

export default Home
