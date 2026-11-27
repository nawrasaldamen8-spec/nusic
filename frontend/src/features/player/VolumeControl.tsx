import { Volume1, Volume2, VolumeX } from 'lucide-react'

interface VolumeControlProps {
  volume: number
  isMuted: boolean
  onVolumeChange: (volume: number) => void
  onToggleMute: () => void
  className?: string
}

export function VolumeControl({
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
  className = '',
}: VolumeControlProps) {
  const effectiveVolume = isMuted ? 0 : volume
  const percent = Math.round(effectiveVolume * 100)

  const Icon = effectiveVolume === 0 ? VolumeX : effectiveVolume < 0.5 ? Volume1 : Volume2

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={onToggleMute}
        aria-label={isMuted || effectiveVolume === 0 ? 'Unmute' : 'Mute'}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-cloud-gray transition-colors hover:bg-white/10 hover:text-pure-white"
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={effectiveVolume}
        onChange={(e) => onVolumeChange(Number(e.target.value))}
        aria-label="Volume"
        aria-valuetext={`${percent}%`}
        style={{ ['--slider-progress' as string]: `${percent}%` }}
        className="volume-slider w-24 flex-1 cursor-pointer"
      />
    </div>
  )
}
