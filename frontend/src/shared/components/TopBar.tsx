import { LogOut, Search } from 'lucide-react'

interface TopBarProps {
  username: string
  searchQuery: string
  onSearchChange: (value: string) => void
  onLogout: () => void
}

export function TopBar({
  username,
  searchQuery,
  onSearchChange,
  onLogout,
}: TopBarProps) {
  return (
    <header className="glass-panel relative z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-x-0 border-t-0 px-4">
      <div className="flex shrink-0 items-center gap-2">
        <img src="/icons/icon-192.png" alt="" className="h-7 w-7 rounded-full object-cover" />
        <span className="text-lg font-bold tracking-tight text-nusic-green">nusic</span>
      </div>

      <div className="relative max-w-md flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-cloud-gray" />
        <input
          id="track-filter"
          name="trackFilter"
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filter tracks"
          aria-label="Filter tracks"
          className="w-full rounded-full border border-white/10 bg-[var(--glass-elevated)] py-2 pr-4 pl-10 text-sm text-pure-white placeholder:text-pure-white/40 focus:border-white/30 focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden text-sm font-semibold text-cloud-gray sm:inline">{username}</span>
        <button
          type="button"
          onClick={onLogout}
          className="glass-pill-btn inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold text-pure-white"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Log out</span>
        </button>
      </div>
    </header>
  )
}
