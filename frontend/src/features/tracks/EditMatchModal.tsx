import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import type { Track } from '../../shared/types/api'

interface EditMatchModalProps {
  track: Track | null
  onClose: () => void
  onSave: (trackId: string, youTubeUrlOrId: string) => Promise<void>
}

export function EditMatchModal({ track, onClose, onSave }: EditMatchModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [value, setValue] = useState(() => track?.youTubeVideoId ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (track && !dialog.open) {
      dialog.showModal()
    } else if (!track && dialog.open) {
      dialog.close()
    }
  }, [track])

  function handleDialogClose() {
    if (dialogRef.current) {
      dialogRef.current.returnValue = ''
    }
    onClose()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!track || !value.trim()) return

    setError(null)
    setIsSaving(true)
    try {
      await onSave(track.id, value.trim())
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update match.')
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
        Edit YouTube Match
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="yt-match-input" className="mb-1.5 block text-xs font-semibold text-cloud-gray">
            YouTube URL or Video ID
          </label>
          <input
            id="yt-match-input"
            type="text"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded-[4px] border border-ash-gray bg-graphite px-3 py-2 text-sm text-pure-white focus:border-pure-white focus:outline-none"
          />
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
            disabled={isSaving || !value.trim()}
            className="rounded-full bg-nusic-green px-6 py-2 text-sm font-bold text-void-black disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
