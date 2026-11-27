import { Music, Pause, PictureInPicture2, Play, SkipBack, SkipForward } from 'lucide-react'
import type { RefObject } from 'react'
import type { Track } from '../../shared/types/api'
import { DesktopPipPlayer } from './DesktopPipPlayer'
import { MobileMiniPlayer } from './MobileMiniPlayer'
import { PlayerSeekBar } from './PlayerSeekBar'
import { VolumeControl } from './VolumeControl'
import type { BufferedRange } from './useAudioPlayer'
import { useDesktopPip } from './useDesktopPip'

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
  volume: number
  isMuted: boolean
  onTogglePlay: () => void
  onSeek: (seconds: number) => void
  onVolumeChange: (volume: number) => void
  onToggleMute: () => void
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
  volume,
  isMuted,
  onTogglePlay,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onNext,
  onPrevious,
  onOpenMobilePlayer,
}: AudioPlayerProps) {
  const safeDuration = duration > 0 ? duration : track?.durationSeconds ?? 0
  const playedPercent = safeDuration > 0 ? Math.min(100, (currentTime / safeDuration) * 100) : 0
  const { isPipSupported, isPipOpen, pipContainer, openPip, closePip } = useDesktopPip(Boolean(track))

  return (
    <>
      <audio ref={audioRef} preload="metadata" />

      <MobileMiniPlayer
        track={track}
        coverColor={coverColor}
        isPlaying={isPlaying}
        isLoading={isLoading}
        playedPercent={playedPercent}
        error={error}
        onTogglePlay={onTogglePlay}
        onOpenMobilePlayer={onOpenMobilePlayer}
      />

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

          <div className="flex flex-1 items-center justify-end gap-2">
            <VolumeControl
              volume={volume}
              isMuted={isMuted}
              onVolumeChange={onVolumeChange}
              onToggleMute={onToggleMute}
            />
            {isPipSupported && (
              <button
                type="button"
                onClick={() => (isPipOpen ? closePip() : void openPip())}
                disabled={!track}
                aria-label={isPipOpen ? 'Close floating mini-player' : 'Open floating mini-player'}
                title={isPipOpen ? 'Close floating mini-player' : 'Pop out floating mini-player'}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-40 ${
                  isPipOpen
                    ? 'bg-nusic-green/20 text-nusic-green'
                    : 'text-cloud-gray hover:bg-white/10 hover:text-pure-white'
                }`}
              >
                <PictureInPicture2 className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </footer>

      <DesktopPipPlayer
        container={pipContainer}
        track={track}
        coverColor={coverColor}
        isPlaying={isPlaying}
        isLoading={isLoading}
        playedPercent={playedPercent}
        onTogglePlay={onTogglePlay}
        onNext={onNext}
        onPrevious={onPrevious}
      />
    </>
  )
}
