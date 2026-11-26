import type { Playlist } from '../../shared/types/api'

const URL_IN_TEXT_REGEX = /https?:\/\/[^\s]+/i
const YOUTUBE_TOPIC_SUFFIX_REGEX = /\s*-\s*Topic$/i

export function extractSharedUrl(search: string): string | null {
  const params = new URLSearchParams(search)
  const candidates = [params.get('url'), params.get('text'), params.get('title')]

  for (const candidate of candidates) {
    if (!candidate) continue
    const match = candidate.match(URL_IN_TEXT_REGEX)
    if (match) return match[0]
  }

  return null
}

export function normalizeArtistName(artist: string | null | undefined): string {
  if (!artist) return ''
  return artist.trim().replace(YOUTUBE_TOPIC_SUFFIX_REGEX, '').trim()
}

export function findMatchingPlaylist(
  playlists: Playlist[],
  artist: string | null | undefined
): Playlist | null {
  const normalized = normalizeArtistName(artist).toLowerCase()
  if (!normalized) return null

  const exact = playlists.find((p) => p.name.trim().toLowerCase() === normalized)
  if (exact) return exact

  return (
    playlists.find((p) => {
      const name = p.name.trim().toLowerCase()
      return name.length >= 3 && (normalized.includes(name) || name.includes(normalized))
    }) ?? null
  )
}
