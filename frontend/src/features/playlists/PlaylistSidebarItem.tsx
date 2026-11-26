import { Check, Music, Pencil, Trash2, X } from 'lucide-react'
import type { Playlist } from '../../shared/types/api'

interface PlaylistSidebarItemProps {
  playlist: Playlist
  isSelected: boolean
  isCollapsed: boolean
  isEditing: boolean
  editName: string
  onEditNameChange: (name: string) => void
  onSelect: () => void
  onStartEdit: () => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onDelete: () => void
}

function PlaylistCover({ coverUrl, sizeClass }: { coverUrl: string | null; sizeClass: string }) {
  return (
    <span className={`flex ${sizeClass} shrink-0 items-center justify-center overflow-hidden rounded-[6px] bg-graphite`}>
      {coverUrl ? (
        <img src={coverUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <Music className="h-4 w-4 text-cloud-gray" aria-hidden="true" />
      )}
    </span>
  )
}

export function PlaylistSidebarItem({
  playlist,
  isSelected,
  isCollapsed,
  isEditing,
  editName,
  onEditNameChange,
  onSelect,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: PlaylistSidebarItemProps) {
  if (isCollapsed) {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-label={playlist.name}
        aria-current={isSelected ? 'page' : undefined}
        className={`flex w-full justify-center rounded-[6px] p-1 transition-colors ${
          isSelected ? 'bg-graphite ring-2 ring-nusic-green' : 'hover:bg-graphite/60'
        }`}
      >
        <PlaylistCover coverUrl={playlist.coverUrl} sizeClass="h-11 w-11" />
      </button>
    )
  }

  return (
    <div
      className={`group flex items-center justify-between gap-2 rounded-[6px] px-2.5 py-2 ${
        isSelected ? 'bg-graphite' : 'bg-obsidian hover:bg-graphite/60'
      }`}
    >
      {isEditing ? (
        <div className="flex flex-1 items-center gap-1">
          <input
            type="text"
            value={editName}
            onChange={(e) => onEditNameChange(e.target.value)}
            autoFocus
            aria-label="Playlist name"
            className="min-w-0 flex-1 rounded-[4px] border border-ash-gray bg-void-black px-2 py-1 text-sm text-pure-white focus:outline-none"
          />
          <button
            type="button"
            onClick={onSaveEdit}
            aria-label="Save name"
            className="p-1 text-nusic-green"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onCancelEdit}
            aria-label="Cancel rename"
            className="p-1 text-cloud-gray"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={onSelect}
            aria-current={isSelected ? 'page' : undefined}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <PlaylistCover coverUrl={playlist.coverUrl} sizeClass="h-10 w-10" />
            <span className="min-w-0 flex-1">
              <span className={`block truncate text-sm font-semibold ${isSelected ? 'text-nusic-green' : 'text-pure-white'}`}>
                {playlist.name}
              </span>
              <span className="block text-xs text-cloud-gray">{playlist.trackCount} tracks</span>
            </span>
          </button>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
            <button
              type="button"
              onClick={onStartEdit}
              aria-label={`Rename ${playlist.name}`}
              className="p-1 text-cloud-gray hover:text-pure-white"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              aria-label={`Delete ${playlist.name}`}
              className="p-1 text-cloud-gray hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
