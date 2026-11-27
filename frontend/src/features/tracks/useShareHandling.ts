import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { queryKeys } from '../../shared/api/queryClient'
import type { Playlist, Track } from '../../shared/types/api'
import { extractSharedUrl } from './shareUtils'
import { tracksApi } from './tracksApi'

const PENDING_SHARE_KEY = 'nusic_pending_share_url'

function consumeInitialShareUrl(): string | null {
  if (window.location.pathname === '/share') {
    const extracted = extractSharedUrl(window.location.search)
    window.history.replaceState(null, '', '/')
    if (extracted) {
      sessionStorage.setItem(PENDING_SHARE_KEY, extracted)
      return extracted
    }
  }
  return sessionStorage.getItem(PENDING_SHARE_KEY)
}

export function useShareHandling(
  onSelectPlaylist: (id: string) => void,
  createPlaylist: (name: string) => Promise<Playlist>
) {
  const queryClient = useQueryClient()
  const [pendingShareUrl, setPendingShareUrl] = useState<string | null>(() =>
    consumeInitialShareUrl()
  )

  function closeShareModal() {
    sessionStorage.removeItem(PENDING_SHARE_KEY)
    setPendingShareUrl(null)
  }

  async function addSharedTrack(playlistId: string, url: string) {
    const added = await tracksApi.add(playlistId, url)
    queryClient.setQueryData<Track[]>(queryKeys.tracks(playlistId), (prev) =>
      prev ? [...prev, added] : [added]
    )
    queryClient.setQueryData<Playlist[]>(queryKeys.playlists, (prev) =>
      prev?.map((p) =>
        p.id === playlistId
          ? {
              ...p,
              trackCount: p.trackCount + 1,
              coverUrl: p.coverUrl ?? added.thumbnailUrl,
            }
          : p
      )
    )
    onSelectPlaylist(playlistId)
  }

  async function createAndAddSharedTrack(playlistName: string, url: string) {
    const created = await createPlaylist(playlistName)
    await addSharedTrack(created.id, url)
  }

  return {
    pendingShareUrl,
    closeShareModal,
    addSharedTrack,
    createAndAddSharedTrack,
  }
}
