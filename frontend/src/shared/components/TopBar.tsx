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
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 bg-void-black px-4">
      <span className="text-lg font-bold tracking-tight text-pure-white">nusic</span>

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
          className="w-full rounded-full bg-graphite py-2 pr-4 pl-10 text-sm text-pure-white placeholder:text-pure-white/40 focus:outline-2 focus:outline-pure-white/30"
        />
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden text-sm font-semibold text-cloud-gray sm:inline">{username}</span>
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center gap-1.5 rounded-full border border-pure-white/25 px-4 py-1.5 text-sm font-semibold text-pure-white hover:border-pure-white/50"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Log out</span>
        </button>
      </div>
    </header>
  )
}
