import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../shared/api/queryClient'
import type { Playlist, Track } from '../../shared/types/api'
import { tracksApi } from './tracksApi'

export function usePlaylistTracksQuery(playlistId: string | null) {
  return useQuery({
    queryKey: queryKeys.tracks(playlistId ?? ''),
    queryFn: () => tracksApi.listByPlaylist(playlistId!),
    enabled: Boolean(playlistId),
  })
}

export function useAddTrackMutation(playlistId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (url: string) => {
      if (!playlistId) throw new Error('No playlist selected.')
      return tracksApi.add(playlistId, url)
    },
    onSuccess: (added) => {
      if (!playlistId) return
      queryClient.setQueryData<Track[]>(queryKeys.tracks(playlistId), (old = []) => [...old, added])
      queryClient.setQueryData<Playlist[]>(queryKeys.playlists, (old = []) =>
        old.map((p) =>
          p.id === playlistId
            ? { ...p, trackCount: p.trackCount + 1, coverUrl: p.coverUrl ?? added.thumbnailUrl }
            : p
        )
      )
    },
  })
}

export function useUpdateTrackMatchMutation(playlistId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ trackId, youTubeUrlOrId }: { trackId: string; youTubeUrlOrId: string }) =>
      tracksApi.updateMatch(trackId, youTubeUrlOrId),
    onSuccess: (updated) => {
      if (!playlistId) return
      let isFirstTrack = false
      queryClient.setQueryData<Track[]>(queryKeys.tracks(playlistId), (old = []) => {
        isFirstTrack = old[0]?.id === updated.id
        return old.map((t) => (t.id === updated.id ? updated : t))
      })
      if (isFirstTrack) {
        queryClient.setQueryData<Playlist[]>(queryKeys.playlists, (old = []) =>
          old.map((p) => (p.id === playlistId ? { ...p, coverUrl: updated.thumbnailUrl } : p))
        )
      }
    },
  })
}

export function useDeleteTrackMutation(playlistId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (trackId: string) => tracksApi.remove(trackId),
    onSuccess: (_, trackId) => {
      if (!playlistId) return
      let nextCoverUrl: string | null = null
      queryClient.setQueryData<Track[]>(queryKeys.tracks(playlistId), (old = []) => {
        const remaining = old.filter((t) => t.id !== trackId)
        nextCoverUrl = remaining[0]?.thumbnailUrl ?? null
        return remaining
      })
      queryClient.setQueryData<Playlist[]>(queryKeys.playlists, (old = []) =>
        old.map((p) =>
          p.id === playlistId
            ? { ...p, trackCount: Math.max(0, p.trackCount - 1), coverUrl: nextCoverUrl }
            : p
        )
      )
    },
  })
}
