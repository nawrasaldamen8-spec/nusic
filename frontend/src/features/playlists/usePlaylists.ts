import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../shared/api/queryClient'
import type { Playlist } from '../../shared/types/api'
import { playlistsApi } from './playlistsApi'

export function usePlaylistsQuery() {
  return useQuery({
    queryKey: queryKeys.playlists,
    queryFn: playlistsApi.list,
  })
}

export function useCreatePlaylistMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => playlistsApi.create(name),
    onSuccess: (created) => {
      queryClient.setQueryData<Playlist[]>(queryKeys.playlists, (old = []) => [...old, created])
    },
  })
}

export function useRenamePlaylistMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => playlistsApi.rename(id, name),
    onSuccess: (updated) => {
      queryClient.setQueryData<Playlist[]>(queryKeys.playlists, (old = []) =>
        old.map((p) => (p.id === updated.id ? updated : p))
      )
    },
  })
}

export function useDeletePlaylistMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => playlistsApi.remove(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<Playlist[]>(queryKeys.playlists, (old = []) =>
        old.filter((p) => p.id !== id)
      )
      queryClient.removeQueries({ queryKey: queryKeys.tracks(id) })
    },
  })
}
