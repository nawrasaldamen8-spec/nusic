import { Music, Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import type { RefObject } from 'react'
import type { Track } from '../../shared/types/api'
import { PlayerSeekBar } from './PlayerSeekBar'
import type { BufferedRange } from './useAudioPlayer'

interface AudioPlayerProps {
  audioRef: RefObject<HTMLAudioElement | null>
  track: Track | null
  coverColor: string | null
  isPlaying: boolean
  isLoading: boolean
  currentTime: number
  duration: number
  bufferedRanges: BufferedRange[]
  error: string | null
  onTogglePlay: () => void
  onSeek: (seconds: number) => void
  onNext: () => void
  onPrevious: () => void
  onOpenMobilePlayer: () => void
}

export function AudioPlayer({
  audioRef,
  track,
  coverColor,
  isPlaying,
  isLoading,
  currentTime,
  duration,
  bufferedRanges,
  error,
  onTogglePlay,
  onSeek,
  onNext,
  onPrevious,
  onOpenMobilePlayer,
}: AudioPlayerProps) {
  const safeDuration = duration > 0 ? duration : track?.durationSeconds ?? 0
  const playedPercent = safeDuration > 0 ? Math.min(100, (currentTime / safeDuration) * 100) : 0

  return (
    <>
      <audio ref={audioRef} preload="metadata" />

      {/* Mobile floating mini-player */}
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

      {/* Desktop bottom player bar */}
      <footer className="glass-panel hidden border-x-0 border-b-0 px-4 py-3 md:fixed md:inset-x-0 md:bottom-0 md:z-40 md:block">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-white/5">
              {track?.thumbnailUrl ? (
                <img src={track.thumbnailUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Music className="h-5 w-5 text-cloud-gray" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-pure-white">
                {track ? track.title : 'No track selected'}
              </p>
              <p className="truncate text-xs text-cloud-gray">
                {error ?? (track ? track.artist ?? 'Unknown artist' : 'Select a track')}
              </p>
            </div>
          </div>

          <div className="flex flex-[2] flex-col items-center gap-1.5">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={onPrevious}
                disabled={!track}
                aria-label="Previous track"
                className="text-cloud-gray hover:text-pure-white disabled:opacity-40"
              >
                <SkipBack className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onTogglePlay}
                disabled={!track || isLoading}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-pure-white text-void-black disabled:opacity-40"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={onNext}
                disabled={!track}
                aria-label="Next track"
                className="text-cloud-gray hover:text-pure-white disabled:opacity-40"
              >
                <SkipForward className="h-4 w-4" />
              </button>
            </div>

            <PlayerSeekBar
              currentTime={currentTime}
              duration={safeDuration}
              bufferedRanges={bufferedRanges}
              disabled={!track}
              onSeek={onSeek}
              className="max-w-lg"
            />
          </div>

          <div className="flex-1" />
        </div>
      </footer>
    </>
  )
}
