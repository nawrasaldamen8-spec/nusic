import { useCallback, useEffect, useRef, useState } from 'react'

interface DocumentPictureInPictureApi {
  window: Window | null
  requestWindow: (options?: {
    width?: number
    height?: number
    disallowReturnToOpener?: boolean
    preferInitialWindowPlacement?: boolean
  }) => Promise<Window>
}

function getDocumentPipApi(): DocumentPictureInPictureApi | null {
  if (typeof window === 'undefined') return null
  const candidate = (window as Window & { documentPictureInPicture?: DocumentPictureInPictureApi })
    .documentPictureInPicture
  return candidate && typeof candidate.requestWindow === 'function' ? candidate : null
}

function copyStylesToPipWindow(pipWindow: Window): void {
  for (const styleSheet of Array.from(document.styleSheets)) {
    try {
      const cssText = Array.from(styleSheet.cssRules).map((rule) => rule.cssText).join('\n')
      const style = pipWindow.document.createElement('style')
      style.textContent = cssText
      pipWindow.document.head.appendChild(style)
    } catch {
      if (styleSheet.href) {
        const link = pipWindow.document.createElement('link')
        link.rel = 'stylesheet'
        link.href = styleSheet.href
        pipWindow.document.head.appendChild(link)
      }
    }
  }
}

export function useDesktopPip(hasTrack: boolean) {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : false
  )
  const [pipContainer, setPipContainer] = useState<HTMLElement | null>(null)
  const pipWindowRef = useRef<Window | null>(null)

  const isPipSupported = isDesktop && getDocumentPipApi() !== null

  const closePip = useCallback(() => {
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.close()
    }
    pipWindowRef.current = null
    setPipContainer(null)
  }, [])

  const openPip = useCallback(async () => {
    const api = getDocumentPipApi()
    if (!api || !isDesktop || !hasTrack) return

    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.focus()
      return
    }

    try {
      const pipWindow = await api.requestWindow({ width: 350, height: 74 })
      copyStylesToPipWindow(pipWindow)

      pipWindow.document.documentElement.className = document.documentElement.className
      pipWindow.document.body.style.margin = '0'
      pipWindow.document.body.style.padding = '0'
      pipWindow.document.body.style.overflow = 'hidden'
      pipWindow.document.body.style.background = '#09090b'

      const mount = pipWindow.document.createElement('div')
      mount.style.width = '100%'
      mount.style.height = '100%'
      pipWindow.document.body.appendChild(mount)

      pipWindow.addEventListener('pagehide', () => {
        pipWindowRef.current = null
        setPipContainer(null)
      })

      pipWindowRef.current = pipWindow
      setPipContainer(mount)
    } catch {
      // User gesture or browser policy prevented PiP window
    }
  }, [hasTrack, isDesktop])

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)')
    const onChange = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches)
      if (!e.matches) closePip()
    }
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [closePip])

  useEffect(() => {
    if (!isDesktop || !isPipSupported || !hasTrack || !('mediaSession' in navigator)) return
    try {
      navigator.mediaSession.setActionHandler('enterpictureinpicture' as MediaSessionAction, () => {
        void openPip()
      })
      return () => {
        try {
          navigator.mediaSession.setActionHandler('enterpictureinpicture' as MediaSessionAction, null)
        } catch {
          // Ignore unsupported cleanup
        }
      }
    } catch {
      return undefined
    }
  }, [hasTrack, isDesktop, isPipSupported, openPip])

  useEffect(() => {
    if (!hasTrack) closePip()
  }, [closePip, hasTrack])

  useEffect(() => () => closePip(), [closePip])

  return {
    isPipSupported,
    isPipOpen: pipContainer !== null,
    pipContainer,
    openPip,
    closePip,
  }
}
