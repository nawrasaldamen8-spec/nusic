import { useEffect } from 'react'
import type { Track } from '../../shared/types/api'

export function useMediaSession(
  currentTrack: Track | null,
  togglePlay: () => Promise<void>,
  next: () => void,
  previous: () => void
) {
  useEffect(() => {
    if (!currentTrack || !('mediaSession' in navigator)) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist ?? 'Unknown artist',
      artwork: currentTrack.thumbnailUrl ? [{ src: currentTrack.thumbnailUrl }] : [],
    })
    navigator.mediaSession.setActionHandler('play', () => void togglePlay())
    navigator.mediaSession.setActionHandler('pause', () => void togglePlay())
    navigator.mediaSession.setActionHandler('nexttrack', next)
    navigator.mediaSession.setActionHandler('previoustrack', previous)
  }, [currentTrack, next, previous, togglePlay])
}
