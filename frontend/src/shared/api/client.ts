const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''

let authToken: string | null = null
let unauthorizedHandler: (() => void) | null = null

export function configureApiClient(token: string | null, onUnauthorized: () => void): void {
  authToken = token
  unauthorizedHandler = onUnauthorized
}

export class ApiRequestError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {
      error?: string
      title?: string
      errors?: Record<string, string[]>
    }
    if (body.error) return body.error
    if (body.errors) {
      const firstError = Object.values(body.errors).flat()[0]
      if (firstError) return firstError
    }
    if (body.title) return body.title
  } catch {
    // Non-JSON response body
  }
  return `Request failed (${response.status})`
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (authToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${authToken}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })

  if (response.status === 401) {
    unauthorizedHandler?.()
    throw new ApiRequestError('Unauthorized', 401)
  }

  if (!response.ok) {
    const message = await parseErrorMessage(response)
    throw new ApiRequestError(message, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
