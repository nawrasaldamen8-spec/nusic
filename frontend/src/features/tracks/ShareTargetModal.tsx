import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import type { Playlist } from '../../shared/types/api'

interface ShareTargetModalProps {
  sharedUrl: string | null
  playlists: Playlist[]
  defaultPlaylistId: string | null
  onClose: () => void
  onAddToPlaylist: (playlistId: string, url: string) => Promise<void>
}

export function ShareTargetModal({
  sharedUrl,
  playlists,
  defaultPlaylistId,
  onClose,
  onAddToPlaylist,
}: ShareTargetModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [url, setUrl] = useState(() => sharedUrl ?? '')
  const [playlistId, setPlaylistId] = useState(
    () => defaultPlaylistId ?? playlists[0]?.id ?? ''
  )
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

  function handleDialogClose() {
    if (dialogRef.current) {
      dialogRef.current.returnValue = ''
    }
    onClose()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!playlistId || !url.trim()) return

    setError(null)
    setIsSaving(true)
    try {
      await onAddToPlaylist(playlistId, url.trim())
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
        Add Shared Track
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
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

        <div>
          <label htmlFor="shared-playlist-select" className="mb-1.5 block text-xs font-semibold text-cloud-gray">
            Playlist
          </label>
          <select
            id="shared-playlist-select"
            name="sharedPlaylistId"
            autoFocus
            value={playlistId}
            onChange={(e) => setPlaylistId(e.target.value)}
            className="w-full rounded-[4px] border border-ash-gray bg-graphite px-3 py-2 text-sm text-pure-white focus:border-pure-white focus:outline-none"
          >
            {playlists.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
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
            disabled={isSaving || !playlistId || !url.trim()}
            className="rounded-full bg-nusic-green px-6 py-2 text-sm font-bold text-void-black disabled:opacity-50"
          >
            {isSaving ? 'Adding...' : 'Add'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
