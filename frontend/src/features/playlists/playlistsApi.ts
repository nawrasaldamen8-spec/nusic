import { apiFetch } from '../../shared/api/client'
import type { Playlist } from '../../shared/types/api'

export const playlistsApi = {
  list: () => apiFetch<Playlist[]>('/api/playlists'),
  create: (name: string) =>
    apiFetch<Playlist>('/api/playlists', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  rename: (id: string, name: string) =>
    apiFetch<Playlist>(`/api/playlists/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),
  remove: (id: string) =>
    apiFetch<void>(`/api/playlists/${id}`, {
      method: 'DELETE',
    }),
}
