export function AmbientOrbs() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div className="ambient-orb-1 absolute -top-24 -left-20 h-80 w-80 rounded-full bg-ambient-orb/55" />
      <div className="ambient-orb-2 absolute top-1/3 -right-24 h-96 w-96 rounded-full bg-nusic-green/20" />
      <div className="ambient-orb-3 absolute -bottom-24 left-1/3 h-80 w-80 rounded-full bg-ambient-orb/45" />
    </div>
  )
}
