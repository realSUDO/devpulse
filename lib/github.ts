const GITHUB_BASE = "https://api.github.com"

const headers: Record<string, string> = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
}
if (process.env.GITHUB_TOKEN) {
  headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
}

async function ghFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${GITHUB_BASE}${path}`, {
    headers,
    next: { revalidate: 300 }, // 5 min cache
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { message?: string }).message ?? `GitHub API error: ${res.status}`)
  }
  return res.json() as Promise<T>
}

export interface GHUser {
  id: number
  login: string
  name: string | null
  avatar_url: string
  bio: string | null
  company: string | null
  location: string | null
  blog: string | null
  email: string | null
  twitter_username: string | null
  followers: number
  following: number
  public_repos: number
  public_gists: number
  created_at: string
  html_url: string
}

export interface GHRepo {
  id: number
  name: string
  full_name: string
  description: string | null
  language: string | null
  stargazers_count: number
  forks_count: number
  watchers_count: number
  open_issues_count: number
  fork: boolean
  archived: boolean
  html_url: string
  topics: string[]
  pushed_at: string | null
  created_at: string
  size: number
}

export interface GHEvent {
  id: string
  type: string
  repo: { name: string }
  payload: Record<string, unknown>
  created_at: string
}

export interface GHLanguages {
  [lang: string]: number
}

export interface GHTreeNode {
  path: string
  mode: string
  type: "blob" | "tree" | "commit"
  size?: number
  sha: string
  url: string
}

export interface GHTree {
  sha: string
  url: string
  tree: GHTreeNode[]
  truncated: boolean
}

export interface GHCommit {
  sha: string
  commit: {
    message: string
    author: { name: string; date: string }
  }
}

export const github = {
  getUser: (username: string) => ghFetch<GHUser>(`/users/${username}`),

  getRepos: (username: string) =>
    ghFetch<GHRepo[]>(
      `/users/${username}/repos?per_page=100&sort=pushed&type=owner`
    ),

  getEvents: (username: string) =>
    ghFetch<GHEvent[]>(`/users/${username}/events/public?per_page=30`),

  getRepoLanguages: (fullName: string) =>
    ghFetch<GHLanguages>(`/repos/${fullName}/languages`),

  getTree: (fullName: string, sha = "HEAD", recursive = false) =>
    ghFetch<GHTree>(`/repos/${fullName}/git/trees/${sha}${recursive ? "?recursive=1" : ""}`),

  getCommits: (fullName: string, perPage = 20) =>
    ghFetch<GHCommit[]>(`/repos/${fullName}/commits?per_page=${perPage}`),

  getFileContent: async (fullName: string, path: string) => {
    const res = await fetch(`https://raw.githubusercontent.com/${fullName}/HEAD/${path}`)
    if (!res.ok) throw new Error(`Failed to fetch file: ${res.status}`)
    return res.text()
  },
}
