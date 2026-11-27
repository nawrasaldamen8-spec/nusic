import { useCallback, useEffect, useState, type RefObject } from 'react'
import { loadStoredVolume, saveStoredVolume } from './playerUtils'

export function useVolume(audioRef: RefObject<HTMLAudioElement | null>) {
  const [volume, setVolumeState] = useState<number>(() => loadStoredVolume())
  const [isMuted, setIsMuted] = useState<boolean>(() => loadStoredVolume() === 0)

  const setVolume = useCallback((nextVolume: number) => {
    const clamped = Math.min(1, Math.max(0, nextVolume))
    setVolumeState(clamped)
    setIsMuted(clamped === 0)
    saveStoredVolume(clamped)
  }, [])

  const toggleMute = useCallback(() => {
    const nextMuted = !isMuted
    setIsMuted(nextMuted)
    if (!nextMuted && volume === 0) {
      setVolumeState(0.5)
      saveStoredVolume(0.5)
    }
  }, [isMuted, volume])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = isMuted ? 0 : volume
    audio.muted = isMuted
  }, [audioRef, isMuted, volume])

  return { volume, isMuted, setVolume, toggleMute }
}
