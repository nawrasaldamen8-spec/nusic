import { Music, Pause, Play } from 'lucide-react'
import type { Track } from '../../shared/types/api'

interface MobileMiniPlayerProps {
  track: Track | null
  coverColor: string | null
  isPlaying: boolean
  isLoading: boolean
  playedPercent: number
  error: string | null
  onTogglePlay: () => void
  onOpenMobilePlayer: () => void
}

export function MobileMiniPlayer({
  track,
  coverColor,
  isPlaying,
  isLoading,
  playedPercent,
  error,
  onTogglePlay,
  onOpenMobilePlayer,
}: MobileMiniPlayerProps) {
  return (
    <div
      style={{ backgroundColor: coverColor ?? 'rgba(20, 20, 24, 0.78)' }}
      className="fixed inset-x-2 bottom-2 z-40 overflow-hidden rounded-[12px] border border-white/15 shadow-[var(--shadow-glass)] backdrop-blur-xl transition-colors duration-300 md:hidden"
    >
      <div className="flex items-center justify-between gap-3 px-2.5 py-2">
        <button
          type="button"
          onClick={onOpenMobilePlayer}
          disabled={!track}
          aria-label={track ? `Open player for ${track.title}` : 'No track selected'}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left disabled:cursor-default"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[4px] bg-obsidian">
            {track?.thumbnailUrl ? (
              <img src={track.thumbnailUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Music className="h-4 w-4 text-cloud-gray" aria-hidden="true" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-pure-white">
              {track ? track.title : 'No track selected'}
            </span>
            <span className="block truncate text-xs text-pure-white/75">
              {error ?? (track ? track.artist ?? 'Unknown artist' : 'Select a track')}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={onTogglePlay}
          disabled={!track || isLoading}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-pure-white disabled:opacity-40"
        >
          {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
        </button>
      </div>

      <div className="h-0.5 w-full bg-pure-white/25">
        <div className="h-full bg-pure-white" style={{ width: `${playedPercent}%` }} />
      </div>
    </div>
  )
}
