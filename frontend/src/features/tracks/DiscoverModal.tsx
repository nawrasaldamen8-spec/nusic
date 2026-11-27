import { useQuery } from '@tanstack/react-query'
import { Check, Music, Plus, Search, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { formatTime } from '../player/playerUtils'
import { AddTrackForm } from './AddTrackForm'
import { tracksApi } from './tracksApi'

interface DiscoverModalProps {
  isOpen: boolean
  playlistName: string
  existingVideoIds: Set<string>
  onClose: () => void
  onAddTrack: (url: string) => Promise<void>
}

export function DiscoverModal({
  isOpen,
  playlistName,
  existingVideoIds,
  onClose,
  onAddTrack,
}: DiscoverModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [inputQuery, setInputQuery] = useState(playlistName)
  const [submittedQuery, setSubmittedQuery] = useState(playlistName)
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set())
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const [addError, setAddError] = useState<string | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen && !dialog.open) {
      dialog.showModal()
    } else if (!isOpen && dialog.open) {
      dialog.close()
    }
  }, [isOpen])

  const searchQuery = useQuery({
    queryKey: ['track-search', submittedQuery],
    queryFn: () => tracksApi.search(submittedQuery, 12),
    enabled: isOpen && submittedQuery.trim().length > 0,
    staleTime: 60_000,
  })

  function handleDialogClose() {
    if (dialogRef.current) {
      dialogRef.current.returnValue = ''
    }
    onClose()
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = inputQuery.trim()
    if (trimmed) setSubmittedQuery(trimmed)
  }

  async function handleAddResult(videoId: string, url: string) {
    setAddError(null)
    setAddingIds((prev) => new Set(prev).add(videoId))
    try {
      await onAddTrack(url)
      setAddedIds((prev) => new Set(prev).add(videoId))
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add track.')
    } finally {
      setAddingIds((prev) => {
        const next = new Set(prev)
        next.delete(videoId)
        return next
      })
    }
  }

  const results = searchQuery.data ?? []

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={handleDialogClose}
      {...({ closedby: 'any' } as Record<string, string>)}
      className="glass-panel m-auto w-[calc(100%-1.5rem)] max-w-2xl rounded-[16px] p-0 text-pure-white open:flex open:max-h-[85dvh] open:flex-col"
    >
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="min-w-0">
          <h1 id={titleId} className="truncate text-lg font-bold">
            Discover &amp; Add
          </h1>
          <p className="truncate text-xs text-cloud-gray">
            Adding to <span className="font-semibold text-pure-white">{playlistName}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close discover dialog"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-cloud-gray transition-colors hover:bg-white/10 hover:text-pure-white"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-4 border-b border-white/10 px-5 py-4">
        <div className="space-y-1.5">
          <span className="block text-[11px] font-semibold tracking-wider text-cloud-gray uppercase">
            Paste Link
          </span>
          <AddTrackForm onAddTrack={onAddTrack} />
        </div>

        <form onSubmit={handleSearchSubmit} className="space-y-1.5">
          <label htmlFor="discover-search" className="block text-[11px] font-semibold tracking-wider text-cloud-gray uppercase">
            Search Songs
          </label>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-cloud-gray" aria-hidden="true" />
              <input
                id="discover-search"
                type="search"
                autoFocus
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Search artist or song title..."
                className="w-full rounded-full border border-white/10 bg-[var(--glass-elevated)] py-2 pr-4 pl-10 text-sm text-pure-white placeholder:text-pure-white/40 focus:border-white/30 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={!inputQuery.trim() || searchQuery.isFetching}
              className="glass-pill-btn rounded-full px-5 py-2 text-sm font-semibold text-pure-white disabled:opacity-50"
            >
              {searchQuery.isFetching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-4">
        {addError && <p className="text-xs text-red-400">{addError}</p>}

        {searchQuery.isLoading ? (
          <p className="py-8 text-center text-sm text-cloud-gray">
            Searching tracks for “{submittedQuery}”...
          </p>
        ) : searchQuery.isError ? (
          <p className="py-8 text-center text-sm text-red-400">
            Could not load suggestions. Try searching again.
          </p>
        ) : results.length === 0 ? (
          <p className="py-8 text-center text-sm text-cloud-gray">No matching tracks found.</p>
        ) : (
          results.map((item) => {
            const isAlreadyAdded = existingVideoIds.has(item.videoId) || addedIds.has(item.videoId)
            const isAdding = addingIds.has(item.videoId)

            return (
              <div
                key={item.videoId}
                className="glass-card flex items-center justify-between gap-3 rounded-[10px] p-2.5"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[6px] bg-obsidian">
                    {item.thumbnailUrl ? (
                      <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Music className="h-4 w-4 text-cloud-gray" aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-pure-white">{item.title}</p>
                    <p className="truncate text-xs text-cloud-gray">
                      {item.artist ?? 'Unknown'}
                      {item.durationSeconds ? ` · ${formatTime(item.durationSeconds)}` : ''}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isAlreadyAdded || isAdding}
                  onClick={() => void handleAddResult(item.videoId, item.url)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                    isAlreadyAdded
                      ? 'bg-nusic-green/20 text-nusic-green'
                      : 'accent-pill-btn disabled:opacity-50'
                  }`}
                >
                  {isAlreadyAdded ? (
                    <>
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      Added
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      {isAdding ? 'Adding...' : 'Add'}
                    </>
                  )}
                </button>
              </div>
            )
          })
        )}
      </div>
    </dialog>
  )
}
