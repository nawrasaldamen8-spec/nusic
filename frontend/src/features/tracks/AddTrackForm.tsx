import { useState, type FormEvent } from 'react'

interface AddTrackFormProps {
  onAddTrack: (url: string) => Promise<void>
}

export function AddTrackForm({ onAddTrack }: AddTrackFormProps) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!url.trim()) return

    setError(null)
    setIsAdding(true)
    try {
      await onAddTrack(url.trim())
      setUrl('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add track.')
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <input
          id="add-track-url"
          name="trackUrl"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="YouTube or Spotify track URL"
          aria-label="YouTube or Spotify track URL"
          disabled={isAdding}
          className="min-w-0 flex-1 rounded-full border border-white/10 bg-[var(--glass-elevated)] px-4 py-2.5 text-sm text-pure-white placeholder:text-pure-white/40 focus:border-white/30 focus:outline-none"
        />
        <button
          type="submit"
          disabled={isAdding || !url.trim()}
          className="accent-pill-btn rounded-full px-6 py-2.5 text-sm font-bold disabled:opacity-50"
        >
          {isAdding ? 'Resolving...' : 'Add'}
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </form>
  )
}
