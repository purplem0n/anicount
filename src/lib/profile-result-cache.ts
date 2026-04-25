import type { AnimeProfileResult, AnimeProfileSource } from "@/lib/anime-profile-api"

const CACHE_VERSION = 1 as const

const keyPrefix = `anicount.profile.v${CACHE_VERSION}`

type Stored = {
  v: typeof CACHE_VERSION
  result: AnimeProfileResult
}

function storageKey(source: AnimeProfileSource, usernameTrimmed: string) {
  return `${keyPrefix}:${source}:${encodeURIComponent(usernameTrimmed)}`
}

function isAnimeProfileResult(value: unknown): value is AnimeProfileResult {
  if (!value || typeof value !== "object") return false
  const o = value as Record<string, unknown>
  return (
    (o.source === "mal" || o.source === "anilist") &&
    typeof o.username === "string" &&
    typeof o.profileUrl === "string" &&
    typeof o.entries === "number" &&
    typeof o.episodesWatched === "number" &&
    typeof o.totalHours === "number" &&
    typeof o.totalDays === "number" &&
    typeof o.equivalenceCount === "number"
  )
}

export function readProfileResultCache(
  source: AnimeProfileSource,
  usernameTrimmed: string
): AnimeProfileResult | null {
  if (!usernameTrimmed) return null
  try {
    const raw = localStorage.getItem(storageKey(source, usernameTrimmed))
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object") return null
    const o = parsed as Partial<Stored>
    if (o.v !== CACHE_VERSION || !o.result) return null
    if (!isAnimeProfileResult(o.result)) return null
    if (o.result.source !== source) return null
    return o.result
  } catch {
    return null
  }
}

export function writeProfileResultCache(
  source: AnimeProfileSource,
  usernameTrimmed: string,
  result: AnimeProfileResult
) {
  if (!usernameTrimmed) return
  try {
    const payload: Stored = {
      v: CACHE_VERSION,
      result,
    }
    localStorage.setItem(
      storageKey(source, usernameTrimmed),
      JSON.stringify(payload)
    )
  } catch {
    /* quota / private mode */
  }
}
