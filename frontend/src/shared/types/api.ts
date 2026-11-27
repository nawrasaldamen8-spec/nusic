export interface LoginRequest {
  identifier: string
  password: string
}

export interface LoginResponse {
  token: string
  username: string
  expiresAt: string
}

export interface Playlist {
  id: string
  name: string
  createdAt: string
  trackCount: number
  coverUrl: string | null
  lastPlayedAt: string | null
}

export interface Track {
  id: string
  playlistId: string
  position: number
  sourceType: 'youtube' | 'spotify' | string
  originalUrl: string
  youTubeVideoId: string
  title: string
  artist: string | null
  durationSeconds: number | null
  thumbnailUrl: string | null
  createdAt: string
}

export interface PlayUrlResponse {
  url: string
  expiresAt: string
}

export interface TrackPreview {
  sourceType: 'youtube' | 'spotify' | string
  title: string
  artist: string | null
  thumbnailUrl: string | null
}

export interface TrackSearchResult {
  videoId: string
  title: string
  artist: string | null
  durationSeconds: number | null
  thumbnailUrl: string | null
  url: string
}
