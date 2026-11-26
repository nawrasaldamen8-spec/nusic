import { describe, expect, it } from 'vitest'
import { extractSharedUrl } from './shareUtils'

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
