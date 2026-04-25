import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

/** GitHub Pages: user/org site repo is served at /; project repos use /{repo}/. */
function githubPagesBaseFromEnv(): string {
  const name = process.env.GITHUB_REPOSITORY?.split("/")?.[1]
  const owner = process.env.GITHUB_REPOSITORY_OWNER
  if (name && owner && name === `${owner}.github.io`) return "/"
  if (name) return `/${name}/`
  return "/"
}

const base =
  process.env.GITHUB_PAGES_BASE ??
  (process.env.CI ? githubPagesBaseFromEnv() : "/")

// https://vite.dev/config/
export default defineConfig({
  base,
  server: { port: 7775 },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
