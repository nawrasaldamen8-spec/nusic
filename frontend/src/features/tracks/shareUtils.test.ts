import { describe, expect, it } from 'vitest'
import type { Playlist } from '../../shared/types/api'
import { extractSharedUrl, findMatchingPlaylist, normalizeArtistName } from './shareUtils'

const makePlaylist = (id: string, name: string): Playlist => ({
  id,
  name,
  createdAt: '2026-11-26T00:00:00Z',
  trackCount: 1,
  coverUrl: null,
  lastPlayedAt: null,
})

describe('extractSharedUrl', () => {
  it('extracts direct url parameter', () => {
    expect(extractSharedUrl('?url=https%3A%2F%2Fyoutu.be%2FdQw4w9WgXcQ')).toBe(
      'https://youtu.be/dQw4w9WgXcQ'
    )
  })

  it('extracts url embedded in Android text parameter', () => {
    const query = '?title=Song&text=Listen+to+this+https%3A%2F%2Fopen.spotify.com%2Ftrack%2F123abc'
    expect(extractSharedUrl(query)).toBe('https://open.spotify.com/track/123abc')
  })

  it('returns null when no valid url exists', () => {
    expect(extractSharedUrl('?title=Just+Text&text=Hello')).toBeNull()
    expect(extractSharedUrl('')).toBeNull()
  })
})

describe('normalizeArtistName', () => {
  it('strips YouTube Topic suffix and trims whitespace', () => {
    expect(normalizeArtistName('  Ramy Sabry - Topic  ')).toBe('Ramy Sabry')
    expect(normalizeArtistName('Elissa')).toBe('Elissa')
    expect(normalizeArtistName(null)).toBe('')
  })
})

describe('findMatchingPlaylist', () => {
  const playlists = [makePlaylist('1', 'Ramy Sabry'), makePlaylist('2', 'Elissa')]

  it('matches exact playlist case-insensitively with Topic suffix stripped', () => {
    expect(findMatchingPlaylist(playlists, 'ramy sabry - topic')?.id).toBe('1')
  })

  it('returns null when no playlist matches', () => {
    expect(findMatchingPlaylist(playlists, 'Amr Diab')).toBeNull()
  })
})
