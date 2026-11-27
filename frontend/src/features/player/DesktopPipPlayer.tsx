import { Music, Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import { createPortal } from 'react-dom'
import type { Track } from '../../shared/types/api'

interface DesktopPipPlayerProps {
  container: HTMLElement | null
  track: Track | null
  coverColor: string | null
  isPlaying: boolean
  isLoading: boolean
  playedPercent: number
  onTogglePlay: () => void
  onNext: () => void
  onPrevious: () => void
}

export function DesktopPipPlayer({
  container,
  track,
  coverColor,
  isPlaying,
  isLoading,
  playedPercent,
  onTogglePlay,
  onNext,
  onPrevious,
}: DesktopPipPlayerProps) {
  if (!container || !track) return null

  return createPortal(
    <div
      style={{ backgroundColor: coverColor ?? 'rgba(20, 20, 24, 0.92)' }}
      className="flex h-full w-full flex-col justify-between overflow-hidden text-pure-white transition-colors duration-300"
    >
      <div className="flex flex-1 items-center justify-between gap-2.5 px-2.5 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[4px] bg-obsidian">
            {track.thumbnailUrl ? (
              <img src={track.thumbnailUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Music className="h-4 w-4 text-cloud-gray" aria-hidden="true" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-bold tracking-widest text-pure-white/55 uppercase">
              nusic
            </span>
            <span className="block truncate text-sm font-semibold text-pure-white">{track.title}</span>
            <span className="block truncate text-xs text-pure-white/75">{track.artist ?? 'Unknown artist'}</span>
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={onPrevious}
            aria-label="Previous track"
            className="flex h-8 w-8 items-center justify-center rounded-full text-pure-white/85 transition-colors hover:bg-white/10 hover:text-pure-white"
          >
            <SkipBack className="h-4 w-4 fill-current" />
          </button>
          <button
            type="button"
            onClick={onTogglePlay}
            disabled={isLoading}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="flex h-9 w-9 items-center justify-center rounded-full text-pure-white transition-colors hover:bg-white/10 disabled:opacity-40"
          >
            {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
          </button>
          <button
            type="button"
            onClick={onNext}
            aria-label="Next track"
            className="flex h-8 w-8 items-center justify-center rounded-full text-pure-white/85 transition-colors hover:bg-white/10 hover:text-pure-white"
          >
            <SkipForward className="h-4 w-4 fill-current" />
          </button>
        </div>
      </div>

      <div className="h-0.5 w-full bg-pure-white/25">
        <div className="h-full bg-pure-white transition-[width] duration-150" style={{ width: `${playedPercent}%` }} />
      </div>
    </div>,
    container
  )
}
