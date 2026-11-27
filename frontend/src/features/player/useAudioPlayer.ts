import { useCallback, useEffect, useRef, useState } from 'react'
import type { Track } from '../../shared/types/api'
import { tracksApi } from '../tracks/tracksApi'

export interface BufferedRange {
  start: number
  end: number
}

export function extractBufferedRanges(buffered: TimeRanges | null | undefined): BufferedRange[] {
  if (!buffered) return []
  const ranges: BufferedRange[] = []
  for (let i = 0; i < buffered.length; i += 1) {
    ranges.push({ start: buffered.start(i), end: buffered.end(i) })
  }
  return ranges
}

const PLAY_URL_SAFETY_BUFFER_MS = 2 * 60 * 1000
const LAST_PLAYBACK_KEY = 'nusic_last_playback'

interface StoredPlayback {
  trackId: string
  playlistId: string
  currentTime: number
}

function loadStoredPlayback(): StoredPlayback | null {
  try {
    const raw = localStorage.getItem(LAST_PLAYBACK_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredPlayback
    if (!parsed.trackId || !parsed.playlistId || !Number.isFinite(parsed.currentTime)) return null
    return parsed
  } catch {
    return null
  }
}

function saveStoredPlayback(playback: StoredPlayback): void {
  try {
    localStorage.setItem(LAST_PLAYBACK_KEY, JSON.stringify(playback))
  } catch {
    // Ignore storage quota errors
  }
}

export function clearStoredPlayback(): void {
  localStorage.removeItem(LAST_PLAYBACK_KEY)
}

export interface CachedPlayUrl {
  url: string
  expiresAtMs: number
}

export function isPlayUrlValid(cached: CachedPlayUrl | undefined, nowMs = Date.now()): boolean {
  if (!cached) return false
  return cached.expiresAtMs - PLAY_URL_SAFETY_BUFFER_MS > nowMs
}

export function findAdjacentTrack(
  queue: Track[],
  currentTrackId: string | null,
  direction: 1 | -1
): Track | null {
  if (queue.length === 0 || !currentTrackId) return null
  const idx = queue.findIndex((t) => t.id === currentTrackId)
  if (idx === -1) return null
  const targetIdx = idx + direction
  return targetIdx >= 0 && targetIdx < queue.length ? queue[targetIdx] : null
}

export function useAudioPlayer(
  queue: Track[],
  playlistId: string | null = null,
  onPlaylistPlayed?: (playlistId: string) => void
) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const retryAttemptedForId = useRef<string | null>(null)
  const playUrlCacheRef = useRef<Map<string, CachedPlayUrl>>(new Map())
  const warmedTrackIdsRef = useRef<Set<string>>(new Set())
  const lastSavedAtMsRef = useRef<number>(0)
  const lastMarkedPlaylistIdRef = useRef<string | null>(null)
  const onPlaylistPlayedRef = useRef(onPlaylistPlayed)
  const restoredForPlaylistRef = useRef<string | null>(null)
  const pendingResumeRef = useRef<{ trackId: string; currentTime: number } | null>(null)

  useEffect(() => {
    onPlaylistPlayedRef.current = onPlaylistPlayed
  }, [onPlaylistPlayed])

  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [bufferedRanges, setBufferedRanges] = useState<BufferedRange[]>([])
  const [error, setError] = useState<string | null>(null)

  const warmTrack = useCallback((trackId: string) => {
    if (warmedTrackIdsRef.current.has(trackId)) return
    warmedTrackIdsRef.current.add(trackId)
    void tracksApi.prepare(trackId).catch(() => {
      warmedTrackIdsRef.current.delete(trackId)
    })
  }, [])

  const invalidateTrack = useCallback((trackId: string) => {
    playUrlCacheRef.current.delete(trackId)
    warmedTrackIdsRef.current.delete(trackId)
  }, [])

  const getValidPlayUrl = useCallback(async (trackId: string): Promise<string> => {
    const cached = playUrlCacheRef.current.get(trackId)
    if (isPlayUrlValid(cached)) {
      return cached!.url
    }

    const response = await tracksApi.getPlayUrl(trackId)
    const expiresAtMs = Date.parse(response.expiresAt)
    playUrlCacheRef.current.set(trackId, {
      url: response.url,
      expiresAtMs: Number.isFinite(expiresAtMs) ? expiresAtMs : Date.now() + 60 * 60 * 1000,
    })
    return response.url
  }, [])

  const loadAndPlay = useCallback(async (track: Track, resumeAtSeconds = 0) => {
    const audio = audioRef.current
    if (!audio) return

    audio.pause()
    setError(null)
    setIsLoading(true)
    setIsPlaying(false)
    setCurrentTrack(track)
    setCurrentTime(resumeAtSeconds)
    setDuration(track.durationSeconds ?? 0)
    setBufferedRanges([])

    try {
      const { url } = { url: await getValidPlayUrl(track.id) }
      audio.src = url
      audio.load()
      if (resumeAtSeconds > 0) {
        audio.currentTime = resumeAtSeconds
      }
      await audio.play()
      retryAttemptedForId.current = null
      pendingResumeRef.current = null
      setIsPlaying(true)
      if (track.playlistId && lastMarkedPlaylistIdRef.current !== track.playlistId) {
        lastMarkedPlaylistIdRef.current = track.playlistId
        onPlaylistPlayedRef.current?.(track.playlistId)
      }
      if (playlistId) {
        saveStoredPlayback({ trackId: track.id, playlistId, currentTime: resumeAtSeconds })
      }

      const nextTrack = findAdjacentTrack(queue, track.id, 1)
      if (nextTrack) warmTrack(nextTrack.id)
    } catch (err) {
      setIsPlaying(false)
      setError(err instanceof Error ? err.message : 'Playback failed.')
    } finally {
      setIsLoading(false)
    }
  }, [getValidPlayUrl, playlistId, queue, warmTrack])

  const playTrack = useCallback(
    async (track: Track) => {
      const audio = audioRef.current
      if (currentTrack?.id === track.id && audio) {
        if (pendingResumeRef.current?.trackId === track.id) {
          await loadAndPlay(track, pendingResumeRef.current.currentTime)
          return
        }
        if (audio.paused) {
          await audio.play()
          setIsPlaying(true)
          if (track.playlistId && lastMarkedPlaylistIdRef.current !== track.playlistId) {
            lastMarkedPlaylistIdRef.current = track.playlistId
            onPlaylistPlayedRef.current?.(track.playlistId)
          }
        } else {
          audio.pause()
          setIsPlaying(false)
        }
        return
      }
      await loadAndPlay(track)
    },
    [currentTrack, loadAndPlay]
  )

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return
    if (pendingResumeRef.current?.trackId === currentTrack.id) {
      await loadAndPlay(currentTrack, pendingResumeRef.current.currentTime)
      return
    }
    if (audio.paused) {
      await audio.play()
      setIsPlaying(true)
    } else {
      audio.pause()
      setIsPlaying(false)
      if (playlistId) {
        saveStoredPlayback({ trackId: currentTrack.id, playlistId, currentTime: audio.currentTime })
      }
    }
  }, [currentTrack, loadAndPlay, playlistId])

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = seconds
    setCurrentTime(seconds)
  }, [])

  const next = useCallback(() => {
    const target = findAdjacentTrack(queue, currentTrack?.id ?? null, 1)
    if (target) void loadAndPlay(target)
  }, [queue, currentTrack, loadAndPlay])

  const previous = useCallback(() => {
    const target = findAdjacentTrack(queue, currentTrack?.id ?? null, -1)
    if (target) void loadAndPlay(target)
  }, [queue, currentTrack, loadAndPlay])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const syncProgress = () => {
      setCurrentTime(audio.currentTime)
      if (Number.isFinite(audio.duration)) setDuration(audio.duration)
      setBufferedRanges(extractBufferedRanges(audio.buffered))

      const now = Date.now()
      if (currentTrack && playlistId && !audio.paused && now - lastSavedAtMsRef.current >= 2000) {
        lastSavedAtMsRef.current = now
        saveStoredPlayback({ trackId: currentTrack.id, playlistId, currentTime: audio.currentTime })
      }
    }

    const handleEnded = () => {
      setIsPlaying(false)
      const nextTrack = findAdjacentTrack(queue, currentTrack?.id ?? null, 1)
      if (nextTrack) void loadAndPlay(nextTrack)
    }

    const handleError = () => {
      if (currentTrack && retryAttemptedForId.current !== currentTrack.id) {
        retryAttemptedForId.current = currentTrack.id
        playUrlCacheRef.current.delete(currentTrack.id)
        void loadAndPlay(currentTrack, audio.currentTime)
        return
      }
      setIsPlaying(false)
      setError('Stream unavailable.')
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
  }, [currentTrack, loadAndPlay, playlistId, queue])

  useEffect(() => {
    if (!currentTrack || !('mediaSession' in navigator)) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist ?? currentTrack.sourceType,
      artwork: currentTrack.thumbnailUrl ? [{ src: currentTrack.thumbnailUrl }] : [],
    })
    navigator.mediaSession.setActionHandler('play', () => void togglePlay())
    navigator.mediaSession.setActionHandler('pause', () => void togglePlay())
    navigator.mediaSession.setActionHandler('nexttrack', next)
    navigator.mediaSession.setActionHandler('previoustrack', previous)
  }, [currentTrack, next, previous, togglePlay])

  useEffect(() => {
    if (queue.length > 0) {
      warmTrack(queue[0].id)
    }
    if (!playlistId || currentTrack || restoredForPlaylistRef.current === playlistId) return
    restoredForPlaylistRef.current = playlistId

    const stored = loadStoredPlayback()
    if (!stored || stored.playlistId !== playlistId) return
    const match = queue.find((t) => t.id === stored.trackId)
    if (!match) return

    pendingResumeRef.current = { trackId: match.id, currentTime: stored.currentTime }
    setCurrentTrack(match)
    setCurrentTime(stored.currentTime)
    setDuration(match.durationSeconds ?? 0)
    warmTrack(match.id)
  }, [currentTrack, playlistId, queue, warmTrack])

  return {
    audioRef,
    currentTrack,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    bufferedRanges,
    error,
    playTrack,
    togglePlay,
    seek,
    next,
    previous,
    invalidateTrack,
  }
}
