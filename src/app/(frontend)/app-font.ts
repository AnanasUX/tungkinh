/** CSS variable published by next/font in layout.tsx. */
export const APP_FONT_VARIABLE = '--font-be-vietnam-pro'

/** Resolve the app font (Be Vietnam Pro via next/font) for canvas text. */
export function appFontFamily() {
  const family = getComputedStyle(document.documentElement)
    .getPropertyValue(APP_FONT_VARIABLE)
    .trim()
  return family || '"Be Vietnam Pro", system-ui, sans-serif'
}

/**
 * Wait until the primary face is ready for canvas drawing. Only the first
 * family is requested: next/font's metric fallback face may not exist locally.
 * Never rejects, so callers can always redraw afterwards.
 */
export function whenAppFontReady(weights: string[]) {
  if (typeof document === 'undefined' || !document.fonts) return Promise.resolve()
  const primary = appFontFamily().split(',')[0].trim()
  return Promise.all(weights.map((weight) => document.fonts.load(`${weight} 32px ${primary}`)))
    .then(() => undefined)
    .catch(() => undefined)
}
