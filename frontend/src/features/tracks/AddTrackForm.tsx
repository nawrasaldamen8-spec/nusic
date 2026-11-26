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
          className="min-w-0 flex-1 rounded-full bg-graphite px-4 py-2.5 text-sm text-pure-white placeholder:text-pure-white/40 focus:outline-2 focus:outline-pure-white/30"
        />
        <button
          type="submit"
          disabled={isAdding || !url.trim()}
          className="rounded-full bg-nusic-green px-6 py-2.5 text-sm font-bold text-void-black disabled:opacity-50"
        >
          {isAdding ? 'Resolving...' : 'Add'}
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </form>
  )
}
