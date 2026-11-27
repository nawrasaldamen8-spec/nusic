import type { Track } from '../../shared/types/api'

export interface BufferedRange {
  start: number
  end: number
}

export interface CachedPlayUrl {
  url: string
  expiresAtMs: number
}

export interface StoredPlayback {
  trackId: string
  playlistId: string
  currentTime: number
}

const PLAY_URL_SAFETY_BUFFER_MS = 2 * 60 * 1000
const LAST_PLAYBACK_KEY = 'nusic_last_playback'

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const whole = Math.floor(seconds)
  const mins = Math.floor(whole / 60)
  const secs = whole % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function extractBufferedRanges(buffered: TimeRanges | null | undefined): BufferedRange[] {
  if (!buffered) return []
  const ranges: BufferedRange[] = []
  for (let i = 0; i < buffered.length; i += 1) {
    ranges.push({ start: buffered.start(i), end: buffered.end(i) })
  }
  return ranges
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

export function loadStoredPlayback(): StoredPlayback | null {
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

export function saveStoredPlayback(playback: StoredPlayback): void {
  try {
    localStorage.setItem(LAST_PLAYBACK_KEY, JSON.stringify(playback))
  } catch {
    // Ignore storage quota errors
  }
}

export function clearStoredPlayback(): void {
  localStorage.removeItem(LAST_PLAYBACK_KEY)
}
