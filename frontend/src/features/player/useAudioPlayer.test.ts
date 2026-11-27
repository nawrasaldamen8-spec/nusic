import { describe, expect, it } from 'vitest'
import type { Track } from '../../shared/types/api'
import { extractBufferedRanges, findAdjacentTrack, isPlayUrlValid } from './playerUtils'

const makeTrack = (id: string, position: number): Track => ({
  id,
  playlistId: 'pl-1',
  position,
  sourceType: 'youtube',
  originalUrl: `https://youtu.be/${id}`,
  youTubeVideoId: id,
  title: `Track ${id}`,
  artist: 'Artist',
  durationSeconds: 180,
  thumbnailUrl: null,
  createdAt: '2026-11-26T00:00:00Z',
})

describe('extractBufferedRanges', () => {
  it('returns empty array when buffered is null', () => {
    expect(extractBufferedRanges(null)).toEqual([])
  })

  it('extracts start and end seconds from TimeRanges', () => {
    const mockTimeRanges = {
      length: 2,
      start: (i: number) => (i === 0 ? 0 : 40),
      end: (i: number) => (i === 0 ? 25 : 75),
    } as TimeRanges

    expect(extractBufferedRanges(mockTimeRanges)).toEqual([
      { start: 0, end: 25 },
      { start: 40, end: 75 },
    ])
  })
})

describe('findAdjacentTrack', () => {
  const queue = [makeTrack('a', 0), makeTrack('b', 1), makeTrack('c', 2)]

  it('returns next and previous tracks within bounds', () => {
    expect(findAdjacentTrack(queue, 'b', 1)?.id).toBe('c')
    expect(findAdjacentTrack(queue, 'b', -1)?.id).toBe('a')
  })

  it('returns null at queue boundaries', () => {
    expect(findAdjacentTrack(queue, 'a', -1)).toBeNull()
    expect(findAdjacentTrack(queue, 'c', 1)).toBeNull()
  })
})

describe('isPlayUrlValid', () => {
  it('returns false when undefined or within 2-minute expiry buffer', () => {
    const now = 1_000_000
    expect(isPlayUrlValid(undefined, now)).toBe(false)
    expect(isPlayUrlValid({ url: 'u', expiresAtMs: now + 60_000 }, now)).toBe(false)
  })

  it('returns true when expiry is beyond the 2-minute safety buffer', () => {
    const now = 1_000_000
    expect(isPlayUrlValid({ url: 'u', expiresAtMs: now + 5 * 60_000 }, now)).toBe(true)
  })
})
