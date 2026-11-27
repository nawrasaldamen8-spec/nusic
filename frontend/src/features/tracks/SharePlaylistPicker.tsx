import { Check, Music, Plus } from 'lucide-react'
import type { Playlist } from '../../shared/types/api'

interface SharePlaylistPickerProps {
  playlists: Playlist[]
  playlistId: string
  isCreatingNew: boolean
  newPlaylistName: string
  onToggleMode: () => void
  onSelectPlaylist: (id: string) => void
  onNewPlaylistNameChange: (name: string) => void
}

export function SharePlaylistPicker({
  playlists,
  playlistId,
  isCreatingNew,
  newPlaylistName,
  onToggleMode,
  onSelectPlaylist,
  onNewPlaylistNameChange,
}: SharePlaylistPickerProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-cloud-gray">
          {isCreatingNew ? 'New Playlist' : 'Choose Playlist'}
        </span>
        {playlists.length > 0 && (
          <button
            type="button"
            onClick={onToggleMode}
            className="glass-pill-btn inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-pure-white"
          >
            <Plus className="h-3.5 w-3.5 text-nusic-green" />
            <span>{isCreatingNew ? 'Existing playlist' : 'New playlist'}</span>
          </button>
        )}
      </div>

      {isCreatingNew ? (
        <input
          id="shared-new-playlist-name"
          name="newPlaylistName"
          type="text"
          autoFocus
          value={newPlaylistName}
          onChange={(e) => onNewPlaylistNameChange(e.target.value)}
          placeholder="Playlist name"
          className="w-full rounded-[8px] border border-white/15 bg-[var(--glass-elevated)] px-3 py-2 text-sm text-pure-white focus:border-white/40 focus:outline-none"
        />
      ) : (
        <div
          role="radiogroup"
          aria-label="Playlists"
          className="max-h-60 space-y-1.5 overflow-y-auto pr-1"
        >
          {playlists.map((p) => {
            const isSelected = p.id === playlistId
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onSelectPlaylist(p.id)}
                className={`glass-card flex w-full items-center gap-3 rounded-[12px] px-3 py-2 text-left ${
                  isSelected ? 'border-nusic-green/70 bg-white/10' : ''
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-white/5">
                  {p.coverUrl ? (
                    <img src={p.coverUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Music className="h-4 w-4 text-cloud-gray" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-semibold ${isSelected ? 'text-nusic-green' : 'text-pure-white'}`}>
                    {p.name}
                  </p>
                  <p className="text-xs text-cloud-gray">{p.trackCount} tracks</p>
                </div>
                {isSelected && <Check className="h-4 w-4 shrink-0 text-nusic-green" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
