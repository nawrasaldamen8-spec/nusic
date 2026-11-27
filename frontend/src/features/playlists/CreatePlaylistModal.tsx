import { useEffect, useRef, useState, type FormEvent } from 'react'

interface CreatePlaylistModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (name: string) => Promise<void>
}

export function CreatePlaylistModal({ isOpen, onClose, onCreate }: CreatePlaylistModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [name, setName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen && !dialog.open) {
      dialog.showModal()
    } else if (!isOpen && dialog.open) {
      dialog.close()
    }
  }, [isOpen])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return

    setIsSaving(true)
    try {
      await onCreate(trimmed)
      setName('')
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="create-playlist-title"
      className="glass-panel m-auto w-full max-w-sm rounded-[14px] p-6 text-pure-white"
    >
      <h2 id="create-playlist-title" className="text-lg font-bold">
        New Playlist
      </h2>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label htmlFor="new-playlist-name" className="mb-1.5 block text-xs font-semibold text-cloud-gray">
            Playlist name
          </label>
          <input
            id="new-playlist-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Playlist name"
            maxLength={100}
            required
            autoFocus
            className="w-full rounded-[8px] border border-white/15 bg-[var(--glass-elevated)] px-3 py-2 text-sm text-pure-white focus:border-white/40 focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="glass-pill-btn rounded-full px-4 py-2 text-sm font-semibold text-pure-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving || !name.trim()}
            className="accent-pill-btn rounded-full px-5 py-2 text-sm font-bold disabled:opacity-50"
          >
            {isSaving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
