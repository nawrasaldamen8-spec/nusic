import { useState, type FormEvent } from 'react'
import { useAuth } from './AuthContext'

export function LoginForm() {
  const { login } = useAuth()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!identifier.trim() || !password) {
      setError('Username or email and password are required.')
      return
    }

    setIsSubmitting(true)
    try {
      await login({ identifier: identifier.trim(), password })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-void-black px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-[6px] bg-obsidian p-6 shadow-lg"
      >
        <h1 className="mb-6 text-2xl font-bold text-pure-white">Log in to nusic</h1>

        <div className="space-y-4">
          <div>
            <label htmlFor="identifier" className="mb-1.5 block text-xs font-semibold text-cloud-gray">
              Username or email
            </label>
            <input
              id="identifier"
              type="text"
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full rounded-[4px] border border-ash-gray bg-graphite px-3 py-2 text-sm text-pure-white focus:border-pure-white focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs font-semibold text-cloud-gray">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-[4px] border border-ash-gray bg-graphite px-3 py-2 text-sm text-pure-white focus:border-pure-white focus:outline-none"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-nusic-green px-8 py-3 text-sm font-bold text-void-black disabled:opacity-60"
          >
            {isSubmitting ? 'Signing in...' : 'Log in'}
          </button>
        </div>
      </form>
    </main>
  )
}
