import { useCallback, useEffect, useRef, useState } from 'react'
import type { Track } from '../../shared/types/api'
import { tracksApi } from '../tracks/tracksApi'
import {
  findAdjacentTrack,
  isPlayUrlValid,
  loadStoredPlayback,
  saveStoredPlayback,
  type BufferedRange,
  type CachedPlayUrl,
} from './playerUtils'
import { useAudioEvents } from './useAudioEvents'
import { useMediaSession } from './useMediaSession'
import { useVolume } from './useVolume'

export type { BufferedRange } from './playerUtils'

export function useAudioPlayer(
  queue: Track[],
  playlistId: string | null = null,
  onPlaylistPlayed?: (playlistId: string) => void
) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const playUrlCacheRef = useRef<Map<string, CachedPlayUrl>>(new Map())
  const warmedTrackIdsRef = useRef<Set<string>>(new Set())
  const lastMarkedPlaylistIdRef = useRef<string | null>(null)
  const onPlaylistPlayedRef = useRef(onPlaylistPlayed)
  const restoredForPlaylistRef = useRef<string | null>(null)
  const pendingResumeRef = useRef<{ trackId: string; currentTime: number } | null>(null)

  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [bufferedRanges, setBufferedRanges] = useState<BufferedRange[]>([])
  const [error, setError] = useState<string | null>(null)
  const resetRetryRef = useRef<() => void>(() => {})
  const { volume, isMuted, setVolume, toggleMute } = useVolume(audioRef)

  useEffect(() => {
    onPlaylistPlayedRef.current = onPlaylistPlayed
  }, [onPlaylistPlayed])

  const notifyPlaylistPlayed = useCallback((trackPlaylistId: string | undefined) => {
    if (!trackPlaylistId || lastMarkedPlaylistIdRef.current === trackPlaylistId) return
    lastMarkedPlaylistIdRef.current = trackPlaylistId
    onPlaylistPlayedRef.current?.(trackPlaylistId)
  }, [])

  const warmTrack = useCallback((trackId: string) => {
    if (warmedTrackIdsRef.current.has(trackId)) return
    warmedTrackIdsRef.current.add(trackId)
    void tracksApi.prepare(trackId).catch(() => warmedTrackIdsRef.current.delete(trackId))
  }, [])

  const invalidateTrack = useCallback((trackId: string) => {
    playUrlCacheRef.current.delete(trackId)
    warmedTrackIdsRef.current.delete(trackId)
  }, [])

  const getValidPlayUrl = useCallback(async (trackId: string): Promise<string> => {
    const cached = playUrlCacheRef.current.get(trackId)
    if (isPlayUrlValid(cached)) return cached!.url

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
      audio.src = await getValidPlayUrl(track.id)
      audio.load()
      if (resumeAtSeconds > 0) audio.currentTime = resumeAtSeconds
      await audio.play()
      resetRetryRef.current()
      pendingResumeRef.current = null
      setIsPlaying(true)
      notifyPlaylistPlayed(track.playlistId)
      if (playlistId) saveStoredPlayback({ trackId: track.id, playlistId, currentTime: resumeAtSeconds })

      const nextTrack = findAdjacentTrack(queue, track.id, 1)
      if (nextTrack) warmTrack(nextTrack.id)
    } catch (err) {
      setIsPlaying(false)
      setError(err instanceof Error ? err.message : 'Playback failed.')
    } finally {
      setIsLoading(false)
    }
  }, [getValidPlayUrl, notifyPlaylistPlayed, playlistId, queue, warmTrack])

  const playTrack = useCallback(async (track: Track) => {
    const audio = audioRef.current
    if (currentTrack?.id !== track.id || !audio) { await loadAndPlay(track); return }
    if (pendingResumeRef.current?.trackId === track.id) {
      await loadAndPlay(track, pendingResumeRef.current.currentTime)
      return
    }
    if (audio.paused) {
      await audio.play()
      setIsPlaying(true)
      notifyPlaylistPlayed(track.playlistId)
    } else {
      audio.pause()
      setIsPlaying(false)
    }
  }, [currentTrack, loadAndPlay, notifyPlaylistPlayed])

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return
    if (pendingResumeRef.current?.trackId === currentTrack.id) {
      await loadAndPlay(currentTrack, pendingResumeRef.current.currentTime)
      return
    }
    if (audio.paused) { await audio.play(); setIsPlaying(true) }
    else {
      audio.pause()
      setIsPlaying(false)
      if (playlistId) saveStoredPlayback({ trackId: currentTrack.id, playlistId, currentTime: audio.currentTime })
    }
  }, [currentTrack, loadAndPlay, playlistId])

  const seek = useCallback((seconds: number) => {
    if (!audioRef.current) return
    audioRef.current.currentTime = seconds
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

  const { resetRetry } = useAudioEvents({
    audioRef, queue, playlistId, currentTrack,
    onTimeUpdate: setCurrentTime, onDurationChange: setDuration, onBufferedChange: setBufferedRanges,
    onPlayingChange: setIsPlaying, onError: setError,
    onRetryTrack: useCallback((t, sec) => { playUrlCacheRef.current.delete(t.id); void loadAndPlay(t, sec) }, [loadAndPlay]),
    onAdvanceTrack: useCallback((t) => { void loadAndPlay(t) }, [loadAndPlay]),
  })

  useEffect(() => { resetRetryRef.current = resetRetry }, [resetRetry])
  useMediaSession(currentTrack, togglePlay, next, previous)

  useEffect(() => {
    if (queue.length > 0) warmTrack(queue[0].id)
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
    audioRef, currentTrack, isPlaying, isLoading, currentTime, duration,
    bufferedRanges, error, volume, isMuted, playTrack, togglePlay, seek, setVolume, toggleMute, next, previous, invalidateTrack,
  }
}
