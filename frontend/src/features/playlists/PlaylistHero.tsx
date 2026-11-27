import { Music, Pause, Play } from 'lucide-react'
import type { Playlist } from '../../shared/types/api'

interface PlaylistHeroProps {
  playlist: Playlist
  trackCount: number
  coverUrl: string | null
  isPlaying: boolean
  onTogglePlay: () => void
}

export function PlaylistHero({
  playlist,
  trackCount,
  coverUrl,
  isPlaying,
  onTogglePlay,
}: PlaylistHeroProps) {
  return (
    <section
      aria-label={playlist.name}
      className="glass-card rounded-[12px] p-5 sm:p-7"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
        <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-white/5 shadow-lg sm:h-44 sm:w-44">
          {coverUrl ? (
            <img src={coverUrl} alt="" className="aspect-square h-full w-full object-cover" />
          ) : (
            <Music className="h-12 w-12 text-cloud-gray" aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <h1 className="truncate text-2xl font-bold tracking-tight text-pure-white sm:text-4xl">
            {playlist.name}
          </h1>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onTogglePlay}
              disabled={trackCount === 0}
              aria-label={isPlaying ? `Pause ${playlist.name}` : `Play ${playlist.name}`}
              className="accent-pill-btn inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 fill-current" />
              ) : (
                <Play className="ml-0.5 h-5 w-5 fill-current" />
              )}
            </button>
            <span className="text-sm font-semibold text-cloud-gray">
              {trackCount} {trackCount === 1 ? 'track' : 'tracks'}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
