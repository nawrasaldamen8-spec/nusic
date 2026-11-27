import { Plus } from 'lucide-react'
import { useEffect, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import type { Playlist, Track } from '../../shared/types/api'
import { CreatePlaylistModal } from './CreatePlaylistModal'
import { PlaylistSidebarItem } from './PlaylistSidebarItem'

const RAIL_WIDTH = 68
const DEFAULT_WIDTH = 280
const MIN_EXPANDED_WIDTH = 200
const COLLAPSE_THRESHOLD = 160
const MAX_WIDTH = 360

interface PlaylistSidebarProps {
  playlists: Playlist[]
  selectedId: string | null
  nowPlayingTrack: Track | null
  isPlaying: boolean
  onSelect: (id: string) => void
  onCreate: (name: string) => Promise<void>
  onRename: (id: string, name: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function PlaylistSidebar({
  playlists,
  selectedId,
  nowPlayingTrack,
  isPlaying,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: PlaylistSidebarProps) {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : true
  )
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)')
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const isCollapsed = !isDesktop || width <= RAIL_WIDTH

  function applyResizedWidth(rawWidth: number) {
    if (rawWidth < COLLAPSE_THRESHOLD) {
      setWidth(RAIL_WIDTH)
      return
    }
    setWidth(Math.min(MAX_WIDTH, Math.max(MIN_EXPANDED_WIDTH, rawWidth)))
  }

  function handleResizePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault()
    const startX = event.clientX
    const startWidth = width
    const onPointerMove = (e: PointerEvent) => applyResizedWidth(startWidth + (e.clientX - startX))
    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  function handleResizeKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      applyResizedWidth(width <= RAIL_WIDTH ? MIN_EXPANDED_WIDTH : width + 24)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      applyResizedWidth(width <= MIN_EXPANDED_WIDTH ? RAIL_WIDTH : width - 24)
    }
  }

  async function handleRename(id: string) {
    if (!editName.trim()) return
    await onRename(id, editName.trim())
    setEditingId(null)
  }

  return (
    <>
      <aside
        style={{
          width: isDesktop ? `${width}px` : `${RAIL_WIDTH}px`,
          containerType: 'inline-size',
        }}
        className={`glass-panel relative flex h-full min-h-0 shrink-0 flex-col rounded-[14px] ${
          isCollapsed ? 'px-1.5' : 'px-2'
        }`}
      >
        <div
          className={`flex items-center py-3 ${
            isCollapsed ? 'justify-center' : 'justify-between px-2.5'
          }`}
        >
          {!isCollapsed && <h2 className="text-sm font-bold text-cloud-gray">Your Library</h2>}
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            aria-label="Create playlist"
            className="glass-pill-btn inline-flex h-9 w-9 items-center justify-center rounded-full text-pure-white"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <nav aria-label="Playlists" className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-1 pb-4">
          {playlists.map((playlist) => (
            <PlaylistSidebarItem
              key={playlist.id}
              playlist={playlist}
              isSelected={playlist.id === selectedId}
              isCollapsed={isCollapsed}
              isEditing={!isCollapsed && editingId === playlist.id}
              editName={editName}
              onEditNameChange={setEditName}
              onSelect={() => onSelect(playlist.id)}
              onStartEdit={() => {
                setEditingId(playlist.id)
                setEditName(playlist.name)
              }}
              onSaveEdit={() => void handleRename(playlist.id)}
              onCancelEdit={() => setEditingId(null)}
              onDelete={() => void onDelete(playlist.id)}
            />
          ))}
        </nav>

        {!isCollapsed && nowPlayingTrack && (
          <div className="glass-card mx-1 mb-24 flex items-center justify-between gap-2.5 rounded-[12px] px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-pure-white">{nowPlayingTrack.title}</p>
              <p className="truncate text-[11px] text-cloud-gray">
                {nowPlayingTrack.artist ?? 'Unknown artist'}
              </p>
            </div>
            <div aria-hidden="true" className="flex h-4 items-end gap-0.5">
              <span className={`eq-bar eq-bar-1 h-4 w-1 rounded-full bg-nusic-green ${isPlaying ? 'eq-playing' : ''}`} />
              <span className={`eq-bar eq-bar-2 h-4 w-1 rounded-full bg-nusic-green ${isPlaying ? 'eq-playing' : ''}`} />
              <span className={`eq-bar eq-bar-3 h-4 w-1 rounded-full bg-nusic-green ${isPlaying ? 'eq-playing' : ''}`} />
            </div>
          </div>
        )}

        {isDesktop && (
          <div
            role="separator"
            tabIndex={0}
            aria-orientation="vertical"
            aria-label="Resize library"
            aria-valuemin={RAIL_WIDTH}
            aria-valuemax={MAX_WIDTH}
            aria-valuenow={width}
            onPointerDown={handleResizePointerDown}
            onKeyDown={handleResizeKeyDown}
            className="absolute inset-y-2 right-0 hidden w-1.5 cursor-col-resize rounded-full transition-colors hover:bg-white/25 focus-visible:bg-nusic-green focus-visible:outline-none md:block"
          />
        )}
      </aside>

      <CreatePlaylistModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={onCreate}
      />
    </>
  )
}
