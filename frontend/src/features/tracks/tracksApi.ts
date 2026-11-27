import { apiFetch } from '../../shared/api/client'
import type { PlayUrlResponse, Track, TrackPreview, TrackSearchResult } from '../../shared/types/api'

export const tracksApi = {
  preview: (url: string) =>
    apiFetch<TrackPreview>(`/api/tracks/preview?url=${encodeURIComponent(url)}`),
  search: (query: string, limit = 12) =>
    apiFetch<TrackSearchResult[]>(`/api/tracks/search?q=${encodeURIComponent(query)}&limit=${limit}`),
  listByPlaylist: (playlistId: string) =>
    apiFetch<Track[]>(`/api/playlists/${playlistId}/tracks`),
  add: (playlistId: string, url: string) =>
    apiFetch<Track>(`/api/playlists/${playlistId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),
  updateMatch: (trackId: string, youTubeUrlOrId: string) =>
    apiFetch<Track>(`/api/tracks/${trackId}/match`, {
      method: 'PATCH',
      body: JSON.stringify({ youTubeUrlOrId }),
    }),
  remove: (trackId: string) =>
    apiFetch<void>(`/api/tracks/${trackId}`, {
      method: 'DELETE',
    }),
  getPlayUrl: (trackId: string) =>
    apiFetch<PlayUrlResponse>(`/api/tracks/${trackId}/play-url`),
  prepare: (trackId: string) =>
    apiFetch<void>(`/api/tracks/${trackId}/prepare`, {
      method: 'POST',
    }),
}
