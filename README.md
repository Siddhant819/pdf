# PDF Tools Platform

A modern, full-stack web application for PDF utilities — similar to Smallpdf or iLovePDF.

## Features

- **Merge PDF** – Combine multiple PDFs into one
- **Split PDF** – Split PDF by page ranges
- **Compress PDF** – Reduce PDF file size
- **Rotate PDF** – Rotate all pages
- **Reorder Pages** – Reorder or delete pages
- **Image to PDF** – Convert JPG/PNG to PDF
- **PDF to Image** – Convert PDF pages to PNG/JPG
- **Word to PDF** – Convert .docx to PDF *(requires LibreOffice)*
- **PDF to Word** – Convert PDF to .docx *(requires LibreOffice)*
- **PDF Editor** – Add text annotations to PDF

## Tech Stack

- **Frontend**: React (Vite) + TailwindCSS + Framer Motion + React Dropzone
- **Backend**: Node.js + Express + pdf-lib + Sharp + Multer

## Getting Started

### Prerequisites

- Node.js v18+
- npm v9+
- (Optional) LibreOffice for Word↔PDF conversion

### Installation

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd pdf
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

### Running the App

**Terminal 1 – Start the backend:**
```bash
cd backend
npm run dev
# Server runs on http://localhost:5000
```

**Terminal 2 – Start the frontend:**
```bash
cd frontend
npm run dev
# App runs on http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Optional: LibreOffice (for Word/PDF conversion)

```bash
# Ubuntu/Debian
sudo apt-get install libreoffice

# macOS
brew install --cask libreoffice
```

## Project Structure

```
pdf/
├── backend/
│   ├── server.js              # Express app entry point
│   ├── src/
│   │   ├── routes/            # API route handlers
│   │   │   ├── merge.js
│   │   │   ├── split.js
│   │   │   ├── compress.js
│   │   │   ├── rotate.js
│   │   │   ├── reorder.js
│   │   │   ├── imageToPdf.js
│   │   │   ├── pdfToImage.js
│   │   │   ├── wordToPdf.js
│   │   │   ├── pdfToWord.js
│   │   │   └── editor.js
│   │   ├── services/          # Business logic
│   │   │   ├── pdfService.js
│   │   │   ├── imageService.js
│   │   │   └── conversionService.js
│   │   └── middleware/
│   │       └── upload.js      # Multer configuration
│   └── uploads/               # Temp file storage
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/             # One page per tool
│   │   ├── components/        # Reusable UI components
│   │   └── utils/             # API client
│   └── vite.config.js
└── README.md
```

## Security

- File size limits: 50MB for PDFs, 20MB for images/docs
- Auto-delete temporary files after 5 minutes
- File type validation
- Rate limiting -100 requests per 15 minutes
- Helmet.js security headers
