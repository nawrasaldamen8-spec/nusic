import { Plus } from 'lucide-react'
import { useEffect, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import type { Playlist } from '../../shared/types/api'
import { CreatePlaylistModal } from './CreatePlaylistModal'
import { PlaylistSidebarItem } from './PlaylistSidebarItem'

const RAIL_WIDTH = 64
const DEFAULT_WIDTH = 280
const MIN_EXPANDED_WIDTH = 200
const COLLAPSE_THRESHOLD = 160
const MAX_WIDTH = 360

interface PlaylistSidebarProps {
  playlists: Playlist[]
  selectedId: string | null
  onSelect: (id: string) => void
  onCreate: (name: string) => Promise<void>
  onRename: (id: string, name: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function PlaylistSidebar({
  playlists,
  selectedId,
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
    const clamped = Math.min(MAX_WIDTH, Math.max(MIN_EXPANDED_WIDTH, rawWidth))
    setWidth(clamped)
  }

  function handleResizePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault()
    const startX = event.clientX
    const startWidth = width

    const onPointerMove = (moveEvent: PointerEvent) => {
      applyResizedWidth(startWidth + (moveEvent.clientX - startX))
    }

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
        className={`relative flex h-full min-h-0 shrink-0 flex-col bg-void-black ${
          isCollapsed ? 'px-1.5' : 'px-2'
        }`}
      >
        <div
          className={`flex items-center py-3 ${
            isCollapsed ? 'justify-center' : 'justify-between px-3'
          }`}
        >
          {!isCollapsed && <h2 className="text-sm font-bold text-cloud-gray">Your Library</h2>}
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            aria-label="Create playlist"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-graphite text-pure-white hover:bg-ash-gray"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <nav aria-label="Playlists" className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-1 pb-28">
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
            className="absolute inset-y-0 right-0 hidden w-1.5 cursor-col-resize transition-colors hover:bg-ash-gray focus-visible:bg-nusic-green focus-visible:outline-none md:block"
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
