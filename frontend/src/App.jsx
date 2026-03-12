import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Merge from './pages/Merge'
import Split from './pages/Split'
import Compress from './pages/Compress'
import Rotate from './pages/Rotate'
import Reorder from './pages/Reorder'
import ImageToPdf from './pages/ImageToPdf'
import PdfToImage from './pages/PdfToImage'
import WordToPdf from './pages/WordToPdf'
import PdfToWord from './pages/PdfToWord'
import Editor from './pages/Editor'

function App() {
  return (
    <Router>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <Navbar />
      <main className="min-h-screen">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/merge" element={<Merge />} />
          <Route path="/split" element={<Split />} />
          <Route path="/compress" element={<Compress />} />
          <Route path="/rotate" element={<Rotate />} />
          <Route path="/reorder" element={<Reorder />} />
          <Route path="/image-to-pdf" element={<ImageToPdf />} />
          <Route path="/pdf-to-image" element={<PdfToImage />} />
          <Route path="/word-to-pdf" element={<WordToPdf />} />
          <Route path="/pdf-to-word" element={<PdfToWord />} />
          <Route path="/editor" element={<Editor />} />
        </Routes>
      </main>
    </Router>
  )
}

export default App
