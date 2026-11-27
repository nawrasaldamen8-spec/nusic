import { Music } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import type { Playlist, TrackPreview } from '../../shared/types/api'
import { SharePlaylistPicker } from './SharePlaylistPicker'
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
      className="glass-panel m-auto w-full max-w-md rounded-[14px] p-6 text-pure-white"
    >
      <h1 id={titleId} className="mb-4 text-lg font-bold">
        Add to Playlist
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isDetecting && (
          <p className="text-xs text-cloud-gray">Detecting artist...</p>
        )}

        {preview && (
          <div className="glass-card flex items-center gap-3 rounded-[12px] p-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-white/5">
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
            className="w-full rounded-[8px] border border-white/15 bg-[var(--glass-elevated)] px-3 py-2 text-sm text-pure-white focus:border-white/40 focus:outline-none"
          />
        </div>

        <SharePlaylistPicker
          playlists={playlists}
          playlistId={playlistId}
          isCreatingNew={isCreatingNew}
          newPlaylistName={newPlaylistName}
          onToggleMode={() => {
            setIsCreatingNew((prev) => !prev)
            setError(null)
          }}
          onSelectPlaylist={setPlaylistId}
          onNewPlaylistNameChange={setNewPlaylistName}
        />

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="glass-pill-btn rounded-full px-5 py-2 text-sm font-semibold text-pure-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving || !canSubmit}
            className="accent-pill-btn rounded-full px-6 py-2 text-sm font-bold disabled:opacity-50"
          >
            {isSaving ? 'Adding...' : isCreatingNew ? 'Create & Add' : 'Add'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
