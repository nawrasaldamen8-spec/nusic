import { Music, Pause, Pencil, Play, Trash2 } from 'lucide-react'
import type { Track } from '../../shared/types/api'

interface TrackListProps {
  tracks: Track[]
  currentTrackId: string | null
  isPlaying: boolean
  onPlayTrack: (track: Track) => void
  onOpenMobilePlayer: () => void
  onEditMatch: (track: Track) => void
  onDeleteTrack: (trackId: string) => Promise<void>
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds < 0) return '--:--'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function TrackList({
  tracks,
  currentTrackId,
  isPlaying,
  onPlayTrack,
  onOpenMobilePlayer,
  onEditMatch,
  onDeleteTrack,
}: TrackListProps) {
  if (tracks.length === 0) {
    return (
      <div className="rounded-[6px] bg-obsidian p-6 text-sm text-cloud-gray shadow-lg">
        No tracks in this playlist.
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {tracks.map((track) => {
        const isActive = track.id === currentTrackId
        return (
          <li
            key={track.id}
            className="flex items-center gap-3 rounded-[6px] bg-obsidian p-3 shadow-lg hover:bg-graphite/70"
          >
            <button
              type="button"
              onClick={() => onPlayTrack(track)}
              aria-label={isActive && isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
              className={`relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[6px] bg-graphite ${
                isActive ? 'ring-2 ring-nusic-green' : ''
              }`}
            >
              {track.thumbnailUrl ? (
                <img src={track.thumbnailUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Music className="h-5 w-5 text-cloud-gray" />
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-void-black/45 text-pure-white">
                {isActive && isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </span>
            </button>

            <button
              type="button"
              onClick={() => (isActive ? onOpenMobilePlayer() : onPlayTrack(track))}
              className="min-w-0 flex-1 text-left"
            >
              <p className={`truncate text-sm font-semibold ${isActive ? 'text-nusic-green' : 'text-pure-white'}`}>
                {track.title}
              </p>
              <p className="truncate text-xs text-cloud-gray">
                {track.artist ?? 'Unknown artist'}
              </p>
            </button>

            <span className="hidden rounded-full bg-graphite px-2.5 py-0.5 text-[11px] font-semibold uppercase text-cloud-gray sm:inline">
              {track.sourceType}
            </span>

            <span className="w-12 text-right text-xs text-cloud-gray tabular-nums">
              {formatDuration(track.durationSeconds)}
            </span>

            <button
              type="button"
              onClick={() => onEditMatch(track)}
              aria-label={`Edit match for ${track.title}`}
              className="rounded-full p-2 text-cloud-gray hover:bg-graphite hover:text-pure-white"
            >
              <Pencil className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => void onDeleteTrack(track.id)}
              aria-label={`Delete ${track.title}`}
              className="rounded-full p-2 text-cloud-gray hover:bg-graphite hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
