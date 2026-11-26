const URL_IN_TEXT_REGEX = /https?:\/\/[^\s]+/i

export function extractSharedUrl(search: string): string | null {
  const params = new URLSearchParams(search)
  const candidates = [params.get('url'), params.get('text'), params.get('title')]

  for (const candidate of candidates) {
    if (!candidate) continue
    const match = candidate.match(URL_IN_TEXT_REGEX)
    if (match) return match[0]
  }

  return null
}
