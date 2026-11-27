import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from './features/auth/AuthContext'
import { AudioPlayer } from './features/player/AudioPlayer'
import { MobilePlayerModal } from './features/player/MobilePlayerModal'
import { clearStoredPlayback } from './features/player/playerUtils'
import { useAudioPlayer } from './features/player/useAudioPlayer'
import { useCoverColor } from './features/player/useCoverColor'
import { PlaylistHero } from './features/playlists/PlaylistHero'
import { PlaylistSidebar } from './features/playlists/PlaylistSidebar'
import {
  useCreatePlaylistMutation,
  useDeletePlaylistMutation,
  useMarkPlaylistPlayedMutation,
  usePlaylistsQuery,
  useRenamePlaylistMutation,
} from './features/playlists/usePlaylists'
import { AddTrackForm } from './features/tracks/AddTrackForm'
import { EditMatchModal } from './features/tracks/EditMatchModal'
import { ShareTargetModal } from './features/tracks/ShareTargetModal'
import { TrackList } from './features/tracks/TrackList'
import {
  useAddTrackMutation,
  useDeleteTrackMutation,
  usePlaylistTracksQuery,
  useUpdateTrackMatchMutation,
} from './features/tracks/usePlaylistTracks'
import { useShareHandling } from './features/tracks/useShareHandling'
import { TopBar } from './shared/components/TopBar'
import type { Track } from './shared/types/api'

const LAST_PLAYLIST_KEY = 'nusic_last_playlist'
const toErrorMessage = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback

export function Workspace() {
  const { username, logout } = useAuth()
  const queryClient = useQueryClient()
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get('playlist') ?? localStorage.getItem(LAST_PLAYLIST_KEY)
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [editingTrack, setEditingTrack] = useState<Track | null>(null)
  const [isMobilePlayerOpen, setIsMobilePlayerOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const playlistsQuery = usePlaylistsQuery()
  const playlists = useMemo(() => playlistsQuery.data ?? [], [playlistsQuery.data])
  const activePlaylistId = useMemo(
    () => (selectedPlaylistId && playlists.some((p) => p.id === selectedPlaylistId) ? selectedPlaylistId : (playlists[0]?.id ?? null)),
    [playlists, selectedPlaylistId]
  )

  const tracksQuery = usePlaylistTracksQuery(activePlaylistId)
  const tracks = useMemo(() => tracksQuery.data ?? [], [tracksQuery.data])
  const createPlaylistMutation = useCreatePlaylistMutation()
  const renamePlaylistMutation = useRenamePlaylistMutation()
  const deletePlaylistMutation = useDeletePlaylistMutation()
  const markPlaylistPlayedMutation = useMarkPlaylistPlayedMutation()
  const addTrackMutation = useAddTrackMutation(activePlaylistId)
  const updateTrackMatchMutation = useUpdateTrackMatchMutation(activePlaylistId)
  const deleteTrackMutation = useDeleteTrackMutation(activePlaylistId)

  const share = useShareHandling(setSelectedPlaylistId, (name) => createPlaylistMutation.mutateAsync(name))
  const player = useAudioPlayer(tracks, activePlaylistId, (id) => markPlaylistPlayedMutation.mutate(id))
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
    const onChange = (e: MediaQueryListEvent) => { if (e.matches) setIsMobilePlayerOpen(false) }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  function openMobilePlayerIfMobile() {
    if (player.currentTrack && window.matchMedia('(max-width: 767px)').matches) setIsMobilePlayerOpen(true)
  }

  const filteredTracks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return tracks
    return tracks.filter((t) => t.title.toLowerCase().includes(query) || (t.artist?.toLowerCase().includes(query) ?? false))
  }, [searchQuery, tracks])

  const selectedPlaylist = playlists.find((p) => p.id === activePlaylistId) ?? null
  const queryError = playlistsQuery.error ?? tracksQuery.error
  const visibleError = actionError ?? (queryError ? toErrorMessage(queryError, 'Failed to load data.') : null)

  async function handleCreatePlaylist(name: string) {
    setActionError(null)
    try {
      const created = await createPlaylistMutation.mutateAsync(name)
      setSelectedPlaylistId(created.id)
    } catch (err) { setActionError(toErrorMessage(err, 'Failed to create playlist.')) }
  }

  async function handleRenamePlaylist(id: string, name: string) {
    setActionError(null)
    try { await renamePlaylistMutation.mutateAsync({ id, name }) }
    catch (err) { setActionError(toErrorMessage(err, 'Failed to rename playlist.')) }
  }

  async function handleDeletePlaylist(id: string) {
    setActionError(null)
    try {
      await deletePlaylistMutation.mutateAsync(id)
      if (activePlaylistId === id) setSelectedPlaylistId(playlists.find((p) => p.id !== id)?.id ?? null)
    } catch (err) { setActionError(toErrorMessage(err, 'Failed to delete playlist.')) }
  }

  async function handleSaveMatch(trackId: string, youTubeUrlOrId: string) {
    await updateTrackMatchMutation.mutateAsync({ trackId, youTubeUrlOrId })
    player.invalidateTrack(trackId)
  }

  async function handleDeleteTrack(trackId: string) {
    setActionError(null)
    try { await deleteTrackMutation.mutateAsync(trackId) }
    catch (err) { setActionError(toErrorMessage(err, 'Failed to delete track.')) }
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

  const isPlayingSelectedPlaylist = player.isPlaying && tracks.some((t) => t.id === player.currentTrack?.id)
  function handleTogglePlaylistPlay() {
    if (tracks.length === 0) return
    if (tracks.some((t) => t.id === player.currentTrack?.id)) { void player.togglePlay(); return }
    void player.playTrack(tracks[0])
  }

  return (
    <div className="relative z-10 flex h-dvh flex-col overflow-hidden text-pure-white">
      <TopBar username={username ?? ''} searchQuery={searchQuery} onSearchChange={setSearchQuery} onLogout={handleLogout} />
      <div className="flex min-h-0 flex-1 gap-2 overflow-hidden p-2">
        <PlaylistSidebar
          playlists={playlists} selectedId={activePlaylistId} nowPlayingTrack={player.currentTrack}
          isPlaying={player.isPlaying} onSelect={setSelectedPlaylistId} onCreate={handleCreatePlaylist}
          onRename={handleRenamePlaylist} onDelete={handleDeletePlaylist}
        />
        <main className="glass-panel min-h-0 min-w-0 flex-1 space-y-6 overflow-y-auto rounded-[14px] px-4 pt-4 pb-28 md:px-8">
          {visibleError && (
            <div className="glass-card flex items-center justify-between rounded-[12px] px-4 py-2.5 text-xs text-red-400">
              <span>{visibleError}</span>
              <button type="button" onClick={() => setActionError(null)} className="font-semibold text-cloud-gray hover:text-pure-white">Dismiss</button>
            </div>
          )}
          {selectedPlaylist ? (
            <>
              <PlaylistHero playlist={selectedPlaylist} trackCount={tracks.length} coverUrl={selectedPlaylist.coverUrl ?? tracks[0]?.thumbnailUrl ?? null} isPlaying={isPlayingSelectedPlaylist} onTogglePlay={handleTogglePlaylistPlay} />
              <AddTrackForm onAddTrack={(url) => addTrackMutation.mutateAsync(url).then(() => undefined)} />
              <TrackList tracks={filteredTracks} currentTrackId={player.currentTrack?.id ?? null} isPlaying={player.isPlaying} onPlayTrack={(t) => void player.playTrack(t)} onOpenMobilePlayer={openMobilePlayerIfMobile} onEditMatch={setEditingTrack} onDeleteTrack={handleDeleteTrack} />
            </>
          ) : (
            <div className="glass-card rounded-[12px] p-6 text-sm text-cloud-gray">Create or select a playlist.</div>
          )}
        </main>
      </div>
      <EditMatchModal key={editingTrack?.id ?? 'closed'} track={editingTrack} onClose={() => setEditingTrack(null)} onSave={handleSaveMatch} />
      <ShareTargetModal key={share.pendingShareUrl ?? 'no-share'} sharedUrl={share.pendingShareUrl} playlists={playlists} defaultPlaylistId={activePlaylistId} onClose={share.closeShareModal} onAddToPlaylist={share.addSharedTrack} onCreateAndAdd={share.createAndAddSharedTrack} />
      <AudioPlayer audioRef={player.audioRef} track={player.currentTrack} coverColor={coverColor} isPlaying={player.isPlaying} isLoading={player.isLoading} currentTime={player.currentTime} duration={player.duration} bufferedRanges={player.bufferedRanges} error={player.error} onTogglePlay={() => void player.togglePlay()} onSeek={player.seek} onNext={player.next} onPrevious={player.previous} onOpenMobilePlayer={openMobilePlayerIfMobile} />
      <MobilePlayerModal isOpen={isMobilePlayerOpen} track={player.currentTrack} playlistName={selectedPlaylist?.name ?? null} coverColor={coverColor} isPlaying={player.isPlaying} isLoading={player.isLoading} currentTime={player.currentTime} duration={player.duration} bufferedRanges={player.bufferedRanges} error={player.error} onClose={() => setIsMobilePlayerOpen(false)} onTogglePlay={() => void player.togglePlay()} onSeek={player.seek} onNext={player.next} onPrevious={player.previous} />
    </div>
  )
}
