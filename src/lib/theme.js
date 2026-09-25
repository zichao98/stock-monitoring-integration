import { useEffect, useState } from 'react'

// Recharts writes colours into SVG attributes, where CSS variables do not
// resolve, so read the tokens from index.css and re-read them when the OS
// switches between light and dark.
function readPalette() {
  const css = getComputedStyle(document.documentElement)
  const rgb = (name, alpha = 1) => `rgb(${css.getPropertyValue(`--${name}`).trim()} / ${alpha})`
  const hsl = (name, alpha = 1) => `hsl(${css.getPropertyValue(`--${name}`).trim()} / ${alpha})`
  return {
    green: rgb('green'), red: rgb('red'), blue: rgb('blue'), orange: rgb('yellow'),
    purple: rgb('purple'), cyan: rgb('cyan'),
    greenSoft: rgb('green', 0.18), redSoft: rgb('red', 0.18), blueSoft: rgb('blue', 0.1),
    grid: hsl('border'), axis: hsl('muted-foreground'), card: hsl('card'), text: hsl('foreground'),
  }
}

export function usePalette() {
  const [palette, setPalette] = useState(readPalette)
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)')
    const update = () => setPalette(readPalette())
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  return palette
}

export const tooltipStyle = (p) => ({
  backgroundColor: p.card,
  border: `1px solid ${p.grid}`,
  borderRadius: '12px',
  fontSize: '12px',
  boxShadow: '0 10px 30px rgb(0 0 0 / .15)',
})
