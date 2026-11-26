import { formatTime } from './playerUtils'
import type { BufferedRange } from './useAudioPlayer'

interface PlayerSeekBarProps {
  currentTime: number
  duration: number
  bufferedRanges: BufferedRange[]
  disabled: boolean
  onSeek: (seconds: number) => void
  className?: string
}

export function PlayerSeekBar({
  currentTime,
  duration,
  bufferedRanges,
  disabled,
  onSeek,
  className = '',
}: PlayerSeekBarProps) {
  const playedPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0

  return (
    <div className={`flex w-full items-center gap-2 ${className}`}>
      <span className="w-10 text-right text-[11px] text-cloud-gray tabular-nums">
        {formatTime(currentTime)}
      </span>
      <div className="relative flex h-4 flex-1 items-center">
        <div className="relative h-1 w-full overflow-hidden rounded-full bg-ash-gray">
          {duration > 0 &&
            bufferedRanges.map((range, index) => {
              const left = (range.start / duration) * 100
              const width = ((range.end - range.start) / duration) * 100
              return (
                <div
                  key={index}
                  className="absolute inset-y-0 bg-steel-mist"
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
              )
            })}
          <div
            className="absolute inset-y-0 left-0 bg-nusic-green"
            style={{ width: `${playedPercent}%` }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.5}
          value={Math.min(currentTime, duration || 100)}
          disabled={disabled || duration <= 0}
          onChange={(e) => onSeek(Number(e.target.value))}
          aria-label="Seek"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
      <span className="w-10 text-[11px] text-cloud-gray tabular-nums">
        {formatTime(duration)}
      </span>
    </div>
  )
}
