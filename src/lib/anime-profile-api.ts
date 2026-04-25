import { onePunchManSeason1EquivalenceCount } from "@/lib/anime-watch-math"

export type AnimeProfileSource = "mal" | "anilist"

export type AnimeProfileResult = {
  source: AnimeProfileSource
  username: string
  profileUrl: string
  avatarUrl: string | null
  /** Anime entries on list (excl. plan-only / PLANNING). */
  entries: number
  episodesWatched: number
  /** Site-reported watch time as hours (MAL: days_watched × 24; AniList: minutes/60). */
  totalHours: number
  /** Site-reported watch time as 24h-days (MAL: days_watched; AniList: minutes/1440). */
  totalDays: number
  equivalenceCount: number
}

type JikanUserFullResponse = {
  data?: {
    username: string
    url: string
    images?: { jpg?: { image_url?: string | null } }
    statistics?: {
      anime?: {
        total_entries?: number
        plan_to_watch?: number
        days_watched?: number
        episodes_watched?: number
      }
    }
  }
  status?: number
  message?: string
}

const ANILIST_ENDPOINT = "https://graphql.anilist.co"

const ANILIST_QUERY = `
query UserAnimeStats($name: String) {
  User(name: $name) {
    id
    name
    siteUrl
    statistics {
      anime {
        minutesWatched
        episodesWatched
        count
        statuses {
          status
          count
        }
      }
    }
    avatar {
      large
      medium
    }
  }
}
`

type AniListResponse = {
  data?: {
    User: {
      id: number
      name: string
      siteUrl: string
      statistics: {
        anime: {
          minutesWatched: number
          episodesWatched: number
          count: number
          statuses?: { status: string; count: number }[] | null
        }
      }
      avatar: {
        large?: string | null
        medium?: string | null
      }
    } | null
  }
  errors?: { message: string }[]
}

/** MAL "days watched" are 24-hour units of watch time. */
function malMinutesFromDaysWatched(daysWatched: number): number {
  return daysWatched * 24 * 60
}

export async function fetchMalAnimeProfile(
  username: string
): Promise<AnimeProfileResult> {
  const trimmed = username.trim()
  if (!trimmed) {
    throw new Error("Enter a MyAnimeList username.")
  }

  const res = await fetch(
    `https://api.jikan.moe/v4/users/${encodeURIComponent(trimmed)}/full`
  )

  const json = (await res.json()) as JikanUserFullResponse

  if (!res.ok || !json.data) {
    const msg =
      json.message ??
      (res.status === 404
        ? "User not found on MyAnimeList."
        : `MyAnimeList request failed (${res.status}).`)
    throw new Error(msg)
  }

  const anime = json.data.statistics?.anime
  const totalEntries = anime?.total_entries ?? 0
  const planToWatch = anime?.plan_to_watch ?? 0
  const entries = Math.max(0, totalEntries - planToWatch)
  const episodesWatched = anime?.episodes_watched ?? 0
  const daysWatched = anime?.days_watched ?? 0
  const avatar = json.data.images?.jpg?.image_url ?? null

  const totalMinutes = malMinutesFromDaysWatched(daysWatched)

  return {
    source: "mal",
    username: json.data.username,
    profileUrl: json.data.url,
    avatarUrl: avatar,
    entries,
    episodesWatched,
    totalHours: daysWatched * 24,
    totalDays: daysWatched,
    equivalenceCount: onePunchManSeason1EquivalenceCount(totalMinutes),
  }
}

export async function fetchAniListAnimeProfile(
  name: string
): Promise<AnimeProfileResult> {
  const trimmed = name.trim()
  if (!trimmed) {
    throw new Error("Enter an AniList username.")
  }

  const res = await fetch(ANILIST_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: ANILIST_QUERY,
      variables: { name: trimmed },
    }),
  })

  const json = (await res.json()) as AniListResponse

  if (!res.ok) {
    throw new Error(`AniList request failed (${res.status}).`)
  }

  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message ?? "AniList query failed.")
  }

  const user = json.data?.User
  if (!user) {
    throw new Error("User not found on AniList.")
  }

  const anime = user.statistics.anime
  const avatar = user.avatar.large ?? user.avatar.medium ?? null
  const planning =
    anime.statuses?.find((s) => s.status === "PLANNING")?.count ?? 0
  const entries = Math.max(0, anime.count - planning)
  const minutesWatched = anime.minutesWatched ?? 0

  return {
    source: "anilist",
    username: user.name,
    profileUrl: user.siteUrl,
    avatarUrl: avatar,
    entries,
    episodesWatched: anime.episodesWatched,
    totalHours: minutesWatched / 60,
    totalDays: minutesWatched / (24 * 60),
    equivalenceCount: onePunchManSeason1EquivalenceCount(minutesWatched),
  }
}
