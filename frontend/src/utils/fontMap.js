/**
 * fontMap.js
 *
 * Utilities for working with PDF font names on the frontend.
 * Mirrors the backend resolveStandardFont logic so the editor UI can show
 * the closest standard-font family name next to each text item.
 */

/**
 * Groups of keywords that identify a font family.
 * Checked in order; first match wins.
 */
const FONT_FAMILY_GROUPS = [
  {
    name: 'Courier (Monospace)',
    cssStack: "'Courier New', Courier, monospace",
    keywords: ['courier', 'mono', 'typewriter', 'consol', 'inconsolata', 'lucida console'],
  },
  {
    name: 'Times Roman (Serif)',
    cssStack: "'Times New Roman', Times, serif",
    keywords: ['times', 'roman', 'georgia', 'palatin', 'garamond', 'bookman', 'century', 'charter', 'utopia'],
  },
  {
    name: 'Helvetica (Sans-serif)',
    cssStack: 'Helvetica, Arial, sans-serif',
    keywords: ['helvetica', 'arial', 'sans', 'gothic', 'futura', 'gill', 'verdana', 'tahoma', 'calibri', 'myriad'],
  },
];

const DEFAULT_GROUP = {
  name: 'Sans-serif',
  cssStack: 'Helvetica, Arial, sans-serif',
};

/**
 * Resolve the display name and CSS font-family stack for a raw PDF font name.
 *
 * @param {string} rawFontName  – fontName as reported by PDF.js (e.g. "ABCDEF+Arial-BoldMT")
 * @param {boolean} bold
 * @param {boolean} italic
 * @returns {{ displayName: string, cssStack: string }}
 */
export function resolveFontDisplay(rawFontName, bold = false, italic = false) {
  const lower = (rawFontName || '').toLowerCase();
  const group = FONT_FAMILY_GROUPS.find((g) => g.keywords.some((kw) => lower.includes(kw))) ?? DEFAULT_GROUP;

  const modifiers = [bold && 'Bold', italic && 'Italic'].filter(Boolean).join(' ');
  const displayName = modifiers ? `${group.name} ${modifiers}` : group.name;

  return { displayName, cssStack: group.cssStack };
}
