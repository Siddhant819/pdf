/**
 * ocrLanguages.js
 *
 * Static list of Tesseract.js language codes and their display names.
 * Kept separate from ocrService.js so that components can import only
 * the language list without pulling in the heavy Tesseract.js module.
 */

export const OCR_LANGUAGES = [
  { code: 'eng', label: 'English' },
  { code: 'fra', label: 'French' },
  { code: 'deu', label: 'German' },
  { code: 'spa', label: 'Spanish' },
  { code: 'por', label: 'Portuguese' },
  { code: 'ita', label: 'Italian' },
  { code: 'rus', label: 'Russian' },
  { code: 'ara', label: 'Arabic' },
  { code: 'hin', label: 'Hindi' },
  { code: 'chi_sim', label: 'Chinese (Simplified)' },
  { code: 'chi_tra', label: 'Chinese (Traditional)' },
  { code: 'jpn', label: 'Japanese' },
  { code: 'kor', label: 'Korean' },
  { code: 'nld', label: 'Dutch' },
  { code: 'pol', label: 'Polish' },
  { code: 'tur', label: 'Turkish' },
  { code: 'vie', label: 'Vietnamese' },
  { code: 'tha', label: 'Thai' },
]
