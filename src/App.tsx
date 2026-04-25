import { Navigate, Route, Routes } from "react-router-dom"

import { AnimeProfileLookup } from "@/components/anime-profile-lookup"

export function App() {
  return (
    <div className="flex min-h-svh flex-col p-6">
      <Routes>
        <Route path="/" element={<AnimeProfileLookup />} />
        <Route path="/myanimelist/:username" element={<AnimeProfileLookup />} />
        <Route path="/anilist/:username" element={<AnimeProfileLookup />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <p className="text-muted-foreground mt-auto pt-8 text-center text-xs">
        Press <kbd className="rounded border px-1 py-0.5 font-mono">d</kbd> to
        toggle dark mode
      </p>
    </div>
  )
}

export default App
