import { Check, Music, Plus } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import type { Playlist, TrackPreview } from '../../shared/types/api'
import { findMatchingPlaylist, normalizeArtistName } from './shareUtils'
import { tracksApi } from './tracksApi'

interface ShareTargetModalProps {
  sharedUrl: string | null
  playlists: Playlist[]
  defaultPlaylistId: string | null
  onClose: () => void
  onAddToPlaylist: (playlistId: string, url: string) => Promise<void>
  onCreateAndAdd: (playlistName: string, url: string) => Promise<void>
}

export function ShareTargetModal({
  sharedUrl,
  playlists,
  defaultPlaylistId,
  onClose,
  onAddToPlaylist,
  onCreateAndAdd,
}: ShareTargetModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [url, setUrl] = useState(() => sharedUrl ?? '')
  const [playlistId, setPlaylistId] = useState(
    () => defaultPlaylistId ?? playlists[0]?.id ?? ''
  )
  const [isCreatingNew, setIsCreatingNew] = useState(() => playlists.length === 0)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [preview, setPreview] = useState<TrackPreview | null>(null)
  const [isDetecting, setIsDetecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (sharedUrl && !dialog.open) {
      dialog.showModal()
    } else if (!sharedUrl && dialog.open) {
      dialog.close()
    }
  }, [sharedUrl])

  useEffect(() => {
    if (!sharedUrl) return
    let cancelled = false
    setIsDetecting(true)

    tracksApi
      .preview(sharedUrl)
      .then((info) => {
        if (cancelled) return
        setPreview(info)
        const matched = findMatchingPlaylist(playlists, info.artist)
        if (matched) {
          setIsCreatingNew(false)
          setPlaylistId(matched.id)
          return
        }
        const suggestedName = normalizeArtistName(info.artist)
        if (suggestedName) {
          setIsCreatingNew(true)
          setNewPlaylistName(suggestedName)
        }
      })
      .catch(() => {
        // Preview is best-effort; user can still pick or create manually.
      })
      .finally(() => {
        if (!cancelled) setIsDetecting(false)
      })

    return () => {
      cancelled = true
    }
  }, [playlists, sharedUrl])

  function handleDialogClose() {
    if (dialogRef.current) {
      dialogRef.current.returnValue = ''
    }
    onClose()
  }

  const canSubmit = Boolean(
    url.trim() && (isCreatingNew ? newPlaylistName.trim() : playlistId)
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return

    setError(null)
    setIsSaving(true)
    try {
      if (isCreatingNew) {
        await onCreateAndAdd(newPlaylistName.trim(), url.trim())
      } else {
        await onAddToPlaylist(playlistId, url.trim())
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add shared track.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={handleDialogClose}
      className="m-auto w-full max-w-md rounded-[6px] bg-obsidian p-6 text-pure-white shadow-lg"
    >
      <h1 id={titleId} className="mb-4 text-lg font-bold">
        Add to Playlist
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isDetecting && (
          <p className="text-xs text-cloud-gray">Detecting artist...</p>
        )}

        {preview && (
          <div className="flex items-center gap-3 rounded-[6px] bg-void-black/60 p-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[4px] bg-graphite">
              {preview.thumbnailUrl ? (
                <img src={preview.thumbnailUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Music className="h-4 w-4 text-cloud-gray" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-pure-white">{preview.title}</p>
              <p className="truncate text-xs text-cloud-gray">
                {normalizeArtistName(preview.artist) || preview.sourceType}
              </p>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="shared-track-url" className="mb-1.5 block text-xs font-semibold text-cloud-gray">
            Song URL
          </label>
          <input
            id="shared-track-url"
            name="sharedTrackUrl"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full rounded-[4px] border border-ash-gray bg-graphite px-3 py-2 text-sm text-pure-white focus:border-pure-white focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-cloud-gray">
              {isCreatingNew ? 'New Playlist' : 'Choose Playlist'}
            </span>
            {playlists.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setIsCreatingNew((prev) => !prev)
                  setError(null)
                }}
                className="inline-flex items-center gap-1 rounded-full bg-graphite px-3 py-1 text-xs font-semibold text-pure-white hover:bg-ash-gray"
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
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="Playlist name"
              className="w-full rounded-[4px] border border-ash-gray bg-graphite px-3 py-2 text-sm text-pure-white focus:border-pure-white focus:outline-none"
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
                    onClick={() => setPlaylistId(p.id)}
                    className={`flex w-full items-center gap-3 rounded-[6px] px-3 py-2 text-left transition-colors ${
                      isSelected
                        ? 'bg-graphite ring-1 ring-nusic-green'
                        : 'bg-void-black/60 hover:bg-graphite/60'
                    }`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[4px] bg-graphite">
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

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-pure-white/25 px-5 py-2 text-sm font-semibold text-pure-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving || !canSubmit}
            className="rounded-full bg-nusic-green px-6 py-2 text-sm font-bold text-void-black disabled:opacity-50"
          >
            {isSaving ? 'Adding...' : isCreatingNew ? 'Create & Add' : 'Add'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
