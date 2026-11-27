import { useEffect, useRef, type RefObject } from 'react'
import type { Track } from '../../shared/types/api'
import { extractBufferedRanges, findAdjacentTrack, saveStoredPlayback, type BufferedRange } from './playerUtils'

interface UseAudioEventsOptions {
  audioRef: RefObject<HTMLAudioElement | null>
  queue: Track[]
  playlistId: string | null
  currentTrack: Track | null
  onTimeUpdate: (time: number) => void
  onDurationChange: (duration: number) => void
  onBufferedChange: (ranges: BufferedRange[]) => void
  onPlayingChange: (playing: boolean) => void
  onError: (message: string) => void
  onRetryTrack: (track: Track, resumeAtSeconds: number) => void
  onAdvanceTrack: (track: Track) => void
}

export function useAudioEvents({
  audioRef,
  queue,
  playlistId,
  currentTrack,
  onTimeUpdate,
  onDurationChange,
  onBufferedChange,
  onPlayingChange,
  onError,
  onRetryTrack,
  onAdvanceTrack,
}: UseAudioEventsOptions) {
  const lastSavedAtMsRef = useRef(0)
  const retryAttemptedForIdRef = useRef<string | null>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const syncProgress = () => {
      onTimeUpdate(audio.currentTime)
      if (Number.isFinite(audio.duration)) onDurationChange(audio.duration)
      onBufferedChange(extractBufferedRanges(audio.buffered))
      const now = Date.now()
      if (currentTrack && playlistId && !audio.paused && now - lastSavedAtMsRef.current >= 2000) {
        lastSavedAtMsRef.current = now
        saveStoredPlayback({ trackId: currentTrack.id, playlistId, currentTime: audio.currentTime })
      }
    }

    const handleEnded = () => {
      onPlayingChange(false)
      const nextTrack = findAdjacentTrack(queue, currentTrack?.id ?? null, 1)
      if (nextTrack) onAdvanceTrack(nextTrack)
    }

    const handleError = () => {
      if (currentTrack && retryAttemptedForIdRef.current !== currentTrack.id) {
        retryAttemptedForIdRef.current = currentTrack.id
        onRetryTrack(currentTrack, audio.currentTime)
        return
      }
      onPlayingChange(false)
      onError('Stream unavailable.')
    }

    audio.addEventListener('timeupdate', syncProgress)
    audio.addEventListener('progress', syncProgress)
    audio.addEventListener('loadedmetadata', syncProgress)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)
    return () => {
      audio.removeEventListener('timeupdate', syncProgress)
      audio.removeEventListener('progress', syncProgress)
      audio.removeEventListener('loadedmetadata', syncProgress)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
    }
  }, [
    audioRef,
    currentTrack,
    onAdvanceTrack,
    onBufferedChange,
    onDurationChange,
    onError,
    onPlayingChange,
    onRetryTrack,
    onTimeUpdate,
    playlistId,
    queue,
  ])

  return {
    resetRetry: () => {
      retryAttemptedForIdRef.current = null
    },
  }
}
