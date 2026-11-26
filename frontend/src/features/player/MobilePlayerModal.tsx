import { ChevronDown, Music, Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { Track } from '../../shared/types/api'
import { PlayerSeekBar } from './PlayerSeekBar'
import type { BufferedRange } from './useAudioPlayer'

interface MobilePlayerModalProps {
  isOpen: boolean
  track: Track | null
  playlistName: string | null
  coverColor: string | null
  isPlaying: boolean
  isLoading: boolean
  currentTime: number
  duration: number
  bufferedRanges: BufferedRange[]
  error: string | null
  onClose: () => void
  onTogglePlay: () => void
  onSeek: (seconds: number) => void
  onNext: () => void
  onPrevious: () => void
}

export function MobilePlayerModal({
  isOpen,
  track,
  playlistName,
  coverColor,
  isPlaying,
  isLoading,
  currentTime,
  duration,
  bufferedRanges,
  error,
  onClose,
  onTogglePlay,
  onSeek,
  onNext,
  onPrevious,
}: MobilePlayerModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen && track && !dialog.open) {
      dialog.showModal()
    } else if ((!isOpen || !track) && dialog.open) {
      dialog.close()
    }
  }, [isOpen, track])

  const safeDuration = duration > 0 ? duration : track?.durationSeconds ?? 0
  const backgroundStyle = coverColor
    ? { backgroundImage: `linear-gradient(180deg, ${coverColor} 0%, #121212 58%, #000000 100%)` }
    : undefined

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="mobile-player-title"
      style={backgroundStyle}
      className="mobile-player-dialog m-0 h-dvh w-screen max-h-none max-w-none flex-col justify-between bg-gradient-to-b from-graphite via-obsidian to-void-black p-6 text-pure-white open:flex"
    >
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close player"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-pure-white hover:bg-pure-white/10"
        >
          <ChevronDown className="h-6 w-6" />
        </button>
        <span className="truncate px-4 text-xs font-semibold tracking-wider text-pure-white/80 uppercase">
          {playlistName ?? 'Now Playing'}
        </span>
        <span className="w-10" aria-hidden="true" />
      </div>

      <div className="mx-auto flex w-full max-w-xs items-center justify-center">
        <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-[8px] bg-graphite shadow-lg">
          {track?.thumbnailUrl ? (
            <img src={track.thumbnailUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Music className="h-16 w-16 text-cloud-gray" aria-hidden="true" />
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-md space-y-5 pb-2">
        <div className="min-w-0">
          <h1 id="mobile-player-title" className="truncate text-xl font-bold text-pure-white">
            {track?.title ?? ''}
          </h1>
          <p className="truncate text-sm text-cloud-gray">
            {error ?? (track ? track.artist ?? 'Unknown artist' : '')}
          </p>
        </div>

        <PlayerSeekBar
          currentTime={currentTime}
          duration={safeDuration}
          bufferedRanges={bufferedRanges}
          disabled={!track}
          onSeek={onSeek}
        />

        <div className="flex items-center justify-center gap-8">
          <button
            type="button"
            onClick={onPrevious}
            disabled={!track}
            aria-label="Previous track"
            className="p-2 text-pure-white disabled:opacity-40"
          >
            <SkipBack className="h-7 w-7 fill-current" />
          </button>
          <button
            type="button"
            onClick={onTogglePlay}
            disabled={!track || isLoading}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-pure-white text-void-black transition-transform active:scale-95 disabled:opacity-40"
          >
            {isPlaying ? (
              <Pause className="h-7 w-7 fill-current" />
            ) : (
              <Play className="ml-0.5 h-7 w-7 fill-current" />
            )}
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!track}
            aria-label="Next track"
            className="p-2 text-pure-white disabled:opacity-40"
          >
            <SkipForward className="h-7 w-7 fill-current" />
          </button>
        </div>
      </div>
    </dialog>
  )
}
