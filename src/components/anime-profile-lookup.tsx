import { useCallback, useEffect, useState } from "react"
import { matchPath, useLocation, useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  fetchAniListAnimeProfile,
  fetchMalAnimeProfile,
  type AnimeProfileResult,
  type AnimeProfileSource,
} from "@/lib/anime-profile-api"
import {
  readProfileResultCache,
  writeProfileResultCache,
} from "@/lib/profile-result-cache"

const sourceLabel: Record<AnimeProfileSource, string> = {
  mal: "MyAnimeList",
  anilist: "AniList",
}

const STORAGE_KEY_MAL = "anicount.username.mal"
const STORAGE_KEY_ANILIST = "anicount.username.anilist"
const STORAGE_ACTIVE_SOURCE = "anicount.activeSource"

const pathMal = "/myanimelist/:username"
const pathAnilist = "/anilist/:username"
const GITHUB_REPO = "https://github.com/purplem0n/anicount"

function readUsernameCache(key: string): string {
  try {
    return localStorage.getItem(key) ?? ""
  } catch {
    return ""
  }
}

function writeUsernameCache(key: string, value: string) {
  try {
    if (value) {
      localStorage.setItem(key, value)
    } else {
      localStorage.removeItem(key)
    }
  } catch {
    /* ignore quota / private mode */
  }
}

function readActiveSource(): AnimeProfileSource {
  try {
    return localStorage.getItem(STORAGE_ACTIVE_SOURCE) === "anilist"
      ? "anilist"
      : "mal"
  } catch {
    return "mal"
  }
}

function writeActiveSource(next: AnimeProfileSource) {
  try {
    localStorage.setItem(STORAGE_ACTIVE_SOURCE, next)
  } catch {
    /* ignore */
  }
}

function formatInt(n: number) {
  return Math.round(n).toLocaleString()
}

function formatHours(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })
}

function formatDays(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

export function AnimeProfileLookup() {
  const navigate = useNavigate()
  const location = useLocation()
  const [source, setSource] = useState<AnimeProfileSource>(() =>
    readActiveSource()
  )
  const [malUsername, setMalUsername] = useState(() =>
    readUsernameCache(STORAGE_KEY_MAL)
  )
  const [anilistUsername, setAnilistUsername] = useState(() =>
    readUsernameCache(STORAGE_KEY_ANILIST)
  )
  const [malProfile, setMalProfile] = useState<AnimeProfileResult | null>(() => {
    const u = readUsernameCache(STORAGE_KEY_MAL).trim()
    return u ? readProfileResultCache("mal", u) : null
  })
  const [anilistProfile, setAnilistProfile] =
    useState<AnimeProfileResult | null>(() => {
      const u = readUsernameCache(STORAGE_KEY_ANILIST).trim()
      return u ? readProfileResultCache("anilist", u) : null
    })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadProfileFor = useCallback(
    async (src: AnimeProfileSource, name: string): Promise<boolean> => {
      const trimmed = name.trim()
      if (!trimmed) return false

      setError(null)
      const cached = readProfileResultCache(src, trimmed)
      if (cached) {
        if (src === "mal") setMalProfile(cached)
        else setAnilistProfile(cached)
        return true
      }

      setLoading(true)
      if (src === "mal") setMalProfile(null)
      else setAnilistProfile(null)
      try {
        const result =
          src === "mal"
            ? await fetchMalAnimeProfile(trimmed)
            : await fetchAniListAnimeProfile(trimmed)
        if (src === "mal") setMalProfile(result)
        else setAnilistProfile(result)
        writeProfileResultCache(src, trimmed, result)
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.")
        return false
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    writeUsernameCache(STORAGE_KEY_MAL, malUsername)
  }, [malUsername])

  useEffect(() => {
    writeUsernameCache(STORAGE_KEY_ANILIST, anilistUsername)
  }, [anilistUsername])

  useEffect(() => {
    writeActiveSource(source)
  }, [source])

  /* When the username or profile URL changes, keep cache previews and form state aligned. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const u = malUsername.trim()
    setMalProfile(u ? readProfileResultCache("mal", u) : null)
  }, [malUsername])

  useEffect(() => {
    const u = anilistUsername.trim()
    setAnilistProfile(u ? readProfileResultCache("anilist", u) : null)
  }, [anilistUsername])

  useEffect(() => {
    const p = location.pathname
    const mMal = matchPath({ path: pathMal, end: true }, p)
    if (mMal?.params?.username) {
      const u = decodeURIComponent(mMal.params.username)
      setSource("mal")
      setMalUsername(u)
      void loadProfileFor("mal", u)
      return
    }
    const mAli = matchPath({ path: pathAnilist, end: true }, p)
    if (mAli?.params?.username) {
      const u = decodeURIComponent(mAli.params.username)
      setSource("anilist")
      setAnilistUsername(u)
      void loadProfileFor("anilist", u)
    }
  }, [location.pathname, loadProfileFor])
  /* eslint-enable react-hooks/set-state-in-effect */

  const activeUsername =
    source === "mal" ? malUsername : anilistUsername
  const profile = source === "mal" ? malProfile : anilistProfile

  async function loadProfile() {
    const name = activeUsername.trim()
    if (!name) return
    const ok = await loadProfileFor(source, name)
    if (ok) {
      const segment = source === "mal" ? "myanimelist" : "anilist"
      navigate(`/${segment}/${encodeURIComponent(name)}`, { replace: false })
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <div className="flex w-full min-w-0 items-center justify-between gap-3">
        <h1 className="font-heading min-w-0 text-2xl font-semibold tracking-tight">
          <span className="leading-none">
            Ani
            <span className="text-primary dark:text-chart-2">count</span>
          </span>
        </h1>
        <Button variant="ghost" size="icon" asChild>
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View anicount on GitHub"
            className="shrink-0"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="size-5"
              aria-hidden
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              void loadProfile()
            }}
          >
            <div className="flex min-w-0 flex-row flex-wrap items-center gap-3">
              <Tabs
                value={source}
                onValueChange={(v) => {
                  const next = v as AnimeProfileSource
                  setSource(next)
                  setError(null)
                  const uname =
                    next === "mal" ? malUsername.trim() : anilistUsername.trim()
                  if (uname) {
                    const segment = next === "mal" ? "myanimelist" : "anilist"
                    navigate(`/${segment}/${encodeURIComponent(uname)}`, {
                      replace: true,
                    })
                  } else {
                    navigate("/", { replace: true })
                  }
                }}
                className="w-auto shrink-0"
              >
                <TabsList>
                  <TabsTrigger value="mal">MyAnimeList</TabsTrigger>
                  <TabsTrigger value="anilist">AniList</TabsTrigger>
                </TabsList>
                <TabsContent value="mal" className="hidden" />
                <TabsContent value="anilist" className="hidden" />
              </Tabs>
              <Input
                name="profile-username"
                className="min-w-0 flex-1"
                placeholder="Username"
                value={activeUsername}
                onChange={(e) => {
                  const v = e.target.value
                  if (source === "mal") {
                    setMalUsername(v)
                  } else {
                    setAnilistUsername(v)
                  }
                }}
                autoComplete="username"
                disabled={loading}
                aria-label={
                  source === "mal"
                    ? "MyAnimeList username"
                    : "AniList username"
                }
              />
            </div>

            {error ? (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={loading || !activeUsername.trim()}
            >
              {loading ? "Loading…" : "Load profile"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {profile ? (
        <Card>
          <CardHeader className="flex flex-row items-start gap-4">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt=""
                className="size-14 shrink-0 rounded-full ring-1 ring-foreground/10"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate">{profile.username}</CardTitle>
              <CardDescription>
                {sourceLabel[profile.source]} ·{" "}
                <a
                  href={profile.profileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline-offset-4 hover:underline dark:text-sidebar-primary"
                >
                  Open profile
                </a>
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Stat
                label="Entries watched (excl. plan-only)"
                value={formatInt(profile.entries)}
              />
              <Stat
                label="Episodes watched"
                value={formatInt(profile.episodesWatched)}
              />
              <Stat
                label="Total hours"
                value={formatHours(profile.totalHours)}
              />
              <Stat label="Total days" value={formatDays(profile.totalDays)} />
            </div>
            <EquivalenceBlurb count={profile.equivalenceCount} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2.5">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="font-heading text-base font-medium tabular-nums">
        {value}
      </div>
    </div>
  )
}

function degenKickerLine(count: number): string {
  if (count < 8) {
    return "Every legend started somewhere—the backlog is already taking notes."
  }
  if (count < 40) {
    return "Solid hobby hours. The watchlist is nervous and it should be."
  }
  if (count < 150) {
    return "That’s not a phase, that’s a lifestyle with a spreadsheet."
  }
  if (count < 600) {
    return "At this altitude, ‘I’ll only watch one episode’ is officially a myth."
  }
  if (count < 2500) {
    return "Statistically, you’ve outlasted several shows’ entire production committees."
  }
  return "Numbers this loud don’t fit in a normal sleep schedule—and that’s the point."
}

function EquivalenceBlurb({ count }: { count: number }) {
  const formatted = count.toLocaleString()
  if (count <= 0) {
    return (
      <div
        className="border-border/80 bg-muted/30 text-muted-foreground rounded-xl border px-4 py-3 text-sm"
        role="region"
        aria-label="Watch time comparison"
      >
        No watch time to measure yet—load a profile with stats to see the
        comparison.
      </div>
    )
  }

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.15] via-card to-chart-2/[0.12] p-[1px] shadow-sm dark:from-primary/25 dark:via-card dark:to-chart-1/20"
      role="region"
      aria-label="Watch time comparison: One Punch Man and cour equivalent"
    >
      <div className="space-y-4 rounded-[calc(var(--radius-xl)-1px)] bg-card/95 p-5 backdrop-blur-[2px] dark:bg-card/90">
        <div className="flex items-start justify-between gap-3">
          <p className="text-primary font-heading text-[0.65rem] font-semibold tracking-[0.22em] uppercase dark:text-chart-1">
            Degen flex
          </p>
        </div>

        <div>
          <p className="text-primary font-heading text-4xl font-bold tabular-nums tracking-tight sm:text-5xl dark:text-chart-1">
            {formatted}×
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            full cour runs (12 ep × 24 min basis)
          </p>
        </div>

        <div className="text-muted-foreground space-y-3 text-sm leading-relaxed">
          <p>
            In plain terms, this is equivalent to watching{" "}
            <span className="text-foreground font-semibold">
              One Punch Man
            </span>{" "}
            season one from start to end{" "}
            <span className="text-foreground font-semibold tabular-nums">
              {formatted}
            </span>{" "}
            times straight—pick your jaw off the floor.
          </p>
          <p className="text-foreground/95 border-t border-border/70 pt-3 text-sm leading-snug">
            {degenKickerLine(count)}
          </p>
        </div>
      </div>
    </div>
  )
}
