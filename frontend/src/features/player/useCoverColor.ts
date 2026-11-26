import { useEffect, useState } from 'react'

function darkenRgb(r: number, g: number, b: number): string {
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  const maxLuminance = 0.28
  const factor = luminance > maxLuminance ? maxLuminance / luminance : 0.85

  const dr = Math.max(18, Math.round(r * factor))
  const dg = Math.max(18, Math.round(g * factor))
  const db = Math.max(18, Math.round(b * factor))
  return `rgb(${dr}, ${dg}, ${db})`
}

function supportsCorsPixelRead(imageUrl: string): boolean {
  try {
    const { hostname, origin } = new URL(imageUrl, window.location.origin)
    if (origin === window.location.origin) return true
    // YouTube image CDNs omit Access-Control-Allow-Origin, which triggers noisy console CORS errors.
    return !hostname.endsWith('ytimg.com')
  } catch {
    return false
  }
}

export function useCoverColor(imageUrl: string | null | undefined): string | null {
  const [extracted, setExtracted] = useState<{ url: string; color: string } | null>(null)

  useEffect(() => {
    if (!imageUrl || !supportsCorsPixelRead(imageUrl)) return

    let cancelled = false
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      if (cancelled) return
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 16
        canvas.height = 16
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.drawImage(img, 0, 0, 16, 16)
        const { data } = ctx.getImageData(0, 0, 16, 16)
        let r = 0
        let g = 0
        let b = 0
        const pixels = data.length / 4

        for (let i = 0; i < data.length; i += 4) {
          r += data[i]
          g += data[i + 1]
          b += data[i + 2]
        }

        setExtracted({ url: imageUrl, color: darkenRgb(r / pixels, g / pixels, b / pixels) })
      } catch {
        setExtracted(null)
      }
    }

    img.onerror = () => {
      if (!cancelled) setExtracted(null)
    }

    img.src = imageUrl
    return () => {
      cancelled = true
      img.onload = null
      img.onerror = null
    }
  }, [imageUrl])

  return imageUrl && extracted?.url === imageUrl ? extracted.color : null
}
