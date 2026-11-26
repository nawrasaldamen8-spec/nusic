import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { AuthProvider, useAuth } from './features/auth/AuthContext'
import { LoginForm } from './features/auth/LoginForm'
import { AudioPlayer } from './features/player/AudioPlayer'
import { MobilePlayerModal } from './features/player/MobilePlayerModal'
import { clearStoredPlayback, useAudioPlayer } from './features/player/useAudioPlayer'
import { useCoverColor } from './features/player/useCoverColor'
import { PlaylistHero } from './features/playlists/PlaylistHero'
import { PlaylistSidebar } from './features/playlists/PlaylistSidebar'
import {
  useCreatePlaylistMutation,
  useDeletePlaylistMutation,
  usePlaylistsQuery,
  useRenamePlaylistMutation,
} from './features/playlists/usePlaylists'
import { AddTrackForm } from './features/tracks/AddTrackForm'
import { EditMatchModal } from './features/tracks/EditMatchModal'
import { ShareTargetModal } from './features/tracks/ShareTargetModal'
import { extractSharedUrl } from './features/tracks/shareUtils'
import { TrackList } from './features/tracks/TrackList'
import { tracksApi } from './features/tracks/tracksApi'
import {
  useAddTrackMutation,
  useDeleteTrackMutation,
  usePlaylistTracksQuery,
  useUpdateTrackMatchMutation,
} from './features/tracks/usePlaylistTracks'
import { queryKeys } from './shared/api/queryClient'
import { TopBar } from './shared/components/TopBar'
import type { Playlist, Track } from './shared/types/api'

function toErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback
}

const LAST_PLAYLIST_KEY = 'nusic_last_playlist'
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

function getInitialPlaylistId(): string | null {
  const fromQuery = new URLSearchParams(window.location.search).get('playlist')
  if (fromQuery) return fromQuery
  return localStorage.getItem(LAST_PLAYLIST_KEY)
}

function Workspace() {
  const { username, logout } = useAuth()
  const queryClient = useQueryClient()
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(() => getInitialPlaylistId())
  const [searchQuery, setSearchQuery] = useState('')
  const [editingTrack, setEditingTrack] = useState<Track | null>(null)
  const [pendingShareUrl, setPendingShareUrl] = useState<string | null>(() =>
    consumeInitialShareUrl()
  )
  const [isMobilePlayerOpen, setIsMobilePlayerOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const playlistsQuery = usePlaylistsQuery()
  const playlists = useMemo(() => playlistsQuery.data ?? [], [playlistsQuery.data])
  const activePlaylistId = useMemo(
    () =>
      selectedPlaylistId && playlists.some((p) => p.id === selectedPlaylistId)
        ? selectedPlaylistId
        : (playlists[0]?.id ?? null),
    [playlists, selectedPlaylistId]
  )

  const tracksQuery = usePlaylistTracksQuery(activePlaylistId)
  const tracks = useMemo(() => tracksQuery.data ?? [], [tracksQuery.data])

  const createPlaylistMutation = useCreatePlaylistMutation()
  const renamePlaylistMutation = useRenamePlaylistMutation()
  const deletePlaylistMutation = useDeletePlaylistMutation()
  const addTrackMutation = useAddTrackMutation(activePlaylistId)
  const updateTrackMatchMutation = useUpdateTrackMatchMutation(activePlaylistId)
  const deleteTrackMutation = useDeleteTrackMutation(activePlaylistId)

  const player = useAudioPlayer(tracks, activePlaylistId)
  const coverColor = useCoverColor(player.currentTrack?.thumbnailUrl)

  useEffect(() => {
    if (!activePlaylistId) return
    localStorage.setItem(LAST_PLAYLIST_KEY, activePlaylistId)
    const url = new URL(window.location.href)
    if (url.searchParams.get('playlist') !== activePlaylistId) {
      url.searchParams.set('playlist', activePlaylistId)
      window.history.replaceState(null, '', url)
    }
  }, [activePlaylistId])

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)')
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) setIsMobilePlayerOpen(false)
    }
    media.addEventListener('change', handleMediaChange)
    return () => media.removeEventListener('change', handleMediaChange)
  }, [])

  function openMobilePlayerIfMobile() {
    if (!player.currentTrack) return
    if (window.matchMedia('(max-width: 767px)').matches) {
      setIsMobilePlayerOpen(true)
    }
  }

  const filteredTracks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return tracks
    return tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        (t.artist?.toLowerCase().includes(query) ?? false)
    )
  }, [searchQuery, tracks])

  const selectedPlaylist = playlists.find((p) => p.id === activePlaylistId) ?? null
  const queryError = playlistsQuery.error ?? tracksQuery.error
  const visibleError = actionError ?? (queryError ? toErrorMessage(queryError, 'Failed to load data.') : null)

  async function handleCreatePlaylist(name: string) {
    setActionError(null)
    try {
      const created = await createPlaylistMutation.mutateAsync(name)
      setSelectedPlaylistId(created.id)
    } catch (err) {
      setActionError(toErrorMessage(err, 'Failed to create playlist.'))
    }
  }

  async function handleRenamePlaylist(id: string, name: string) {
    setActionError(null)
    try {
      await renamePlaylistMutation.mutateAsync({ id, name })
    } catch (err) {
      setActionError(toErrorMessage(err, 'Failed to rename playlist.'))
    }
  }

  async function handleDeletePlaylist(id: string) {
    setActionError(null)
    try {
      await deletePlaylistMutation.mutateAsync(id)
      if (activePlaylistId === id) {
        const next = playlists.find((p) => p.id !== id)
        setSelectedPlaylistId(next?.id ?? null)
      }
    } catch (err) {
      setActionError(toErrorMessage(err, 'Failed to delete playlist.'))
    }
  }

  async function handleAddTrack(url: string) {
    await addTrackMutation.mutateAsync(url)
  }

  async function handleSaveMatch(trackId: string, youTubeUrlOrId: string) {
    await updateTrackMatchMutation.mutateAsync({ trackId, youTubeUrlOrId })
    player.invalidateTrack(trackId)
  }

  async function handleDeleteTrack(trackId: string) {
    setActionError(null)
    try {
      await deleteTrackMutation.mutateAsync(trackId)
    } catch (err) {
      setActionError(toErrorMessage(err, 'Failed to delete track.'))
    }
  }

  function handleLogout() {
    localStorage.removeItem(LAST_PLAYLIST_KEY)
    clearStoredPlayback()
    const url = new URL(window.location.href)
    url.searchParams.delete('playlist')
    window.history.replaceState(null, '', url)
    queryClient.clear()
    logout()
  }

  const isPlayingSelectedPlaylist =
    player.isPlaying && tracks.some((t) => t.id === player.currentTrack?.id)

  function handleTogglePlaylistPlay() {
    if (tracks.length === 0) return
    if (tracks.some((t) => t.id === player.currentTrack?.id)) {
      void player.togglePlay()
      return
    }
    void player.playTrack(tracks[0])
  }

  function handleCloseShareModal() {
    sessionStorage.removeItem(PENDING_SHARE_KEY)
    setPendingShareUrl(null)
  }

  async function handleAddSharedTrack(playlistId: string, url: string) {
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
    setSelectedPlaylistId(playlistId)
  }

  async function handleCreateAndAddSharedTrack(playlistName: string, url: string) {
    const created = await createPlaylistMutation.mutateAsync(playlistName)
    await handleAddSharedTrack(created.id, url)
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-void-black text-pure-white">
      <TopBar
        username={username ?? ''}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onLogout={handleLogout}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <PlaylistSidebar
          playlists={playlists}
          selectedId={activePlaylistId}
          onSelect={setSelectedPlaylistId}
          onCreate={handleCreatePlaylist}
          onRename={handleRenamePlaylist}
          onDelete={handleDeletePlaylist}
        />

        <main className="min-h-0 min-w-0 flex-1 space-y-6 overflow-y-auto px-4 pt-4 pb-28 md:px-8">
          {visibleError && (
            <div className="flex items-center justify-between rounded-[6px] bg-obsidian px-4 py-2.5 text-xs text-red-400">
              <span>{visibleError}</span>
              <button
                type="button"
                onClick={() => setActionError(null)}
                className="font-semibold text-cloud-gray hover:text-pure-white"
              >
                Dismiss
              </button>
            </div>
          )}

          {selectedPlaylist ? (
            <>
              <PlaylistHero
                playlist={selectedPlaylist}
                trackCount={tracks.length}
                coverUrl={selectedPlaylist.coverUrl ?? tracks[0]?.thumbnailUrl ?? null}
                isPlaying={isPlayingSelectedPlaylist}
                onTogglePlay={handleTogglePlaylistPlay}
              />

              <AddTrackForm onAddTrack={handleAddTrack} />

              <TrackList
                tracks={filteredTracks}
                currentTrackId={player.currentTrack?.id ?? null}
                isPlaying={player.isPlaying}
                onPlayTrack={(track) => void player.playTrack(track)}
                onOpenMobilePlayer={openMobilePlayerIfMobile}
                onEditMatch={setEditingTrack}
                onDeleteTrack={handleDeleteTrack}
              />
            </>
          ) : (
            <div className="rounded-[6px] bg-obsidian p-6 text-sm text-cloud-gray shadow-lg">
              Create or select a playlist.
            </div>
          )}
        </main>
      </div>

      <EditMatchModal
        key={editingTrack?.id ?? 'closed'}
        track={editingTrack}
        onClose={() => setEditingTrack(null)}
        onSave={handleSaveMatch}
      />

      {pendingShareUrl && (
        <ShareTargetModal
          key={pendingShareUrl}
          sharedUrl={pendingShareUrl}
          playlists={playlists}
          defaultPlaylistId={activePlaylistId}
          onClose={handleCloseShareModal}
          onAddToPlaylist={handleAddSharedTrack}
          onCreateAndAdd={handleCreateAndAddSharedTrack}
        />
      )}

      <AudioPlayer
        audioRef={player.audioRef}
        track={player.currentTrack}
        coverColor={coverColor}
        isPlaying={player.isPlaying}
        isLoading={player.isLoading}
        currentTime={player.currentTime}
        duration={player.duration}
        bufferedRanges={player.bufferedRanges}
        error={player.error}
        onTogglePlay={() => void player.togglePlay()}
        onSeek={player.seek}
        onNext={player.next}
        onPrevious={player.previous}
        onOpenMobilePlayer={openMobilePlayerIfMobile}
      />

      <MobilePlayerModal
        isOpen={isMobilePlayerOpen}
        track={player.currentTrack}
        playlistName={selectedPlaylist?.name ?? null}
        coverColor={coverColor}
        isPlaying={player.isPlaying}
        isLoading={player.isLoading}
        currentTime={player.currentTime}
        duration={player.duration}
        bufferedRanges={player.bufferedRanges}
        error={player.error}
        onClose={() => setIsMobilePlayerOpen(false)}
        onTogglePlay={() => void player.togglePlay()}
        onSeek={player.seek}
        onNext={player.next}
        onPrevious={player.previous}
      />
    </div>
  )
}

function AppGate() {
  const { isAuthenticated } = useAuth()
  useState(() => {
    if (!isAuthenticated) consumeInitialShareUrl()
  })
  return isAuthenticated ? <Workspace /> : <LoginForm />
}

export default function App() {
  return (
    <AuthProvider>
      <AppGate />
    </AuthProvider>
  )
}
