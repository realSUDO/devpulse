import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { github, type GHRepo } from "@/lib/github"
import { prisma } from "@/lib/prisma"

// GET /api/github/[username]/repos
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { username } = await params

  try {
    const repos = await github.getRepos(username)

    // Find user in DB to associate repos
    const user = await prisma.user.findUnique({ where: { username: username } })
    if (user) {
      // Upsert top 20 repos into DB
      const top20 = repos
        .filter((r: GHRepo) => !r.fork)
        .sort((a: GHRepo, b: GHRepo) => b.stargazers_count - a.stargazers_count)
        .slice(0, 20)

      await Promise.allSettled(
        top20.map((r: GHRepo) =>
          prisma.repo.upsert({
            where: { githubId: r.id },
            update: {
              stars: r.stargazers_count,
              forks: r.forks_count,
              openIssues: r.open_issues_count,
              pushedAt: r.pushed_at ? new Date(r.pushed_at) : null,
              topics: r.topics ?? [],
            },
            create: {
              githubId: r.id,
              name: r.name,
              fullName: r.full_name,
              description: r.description,
              language: r.language,
              stars: r.stargazers_count,
              forks: r.forks_count,
              watchers: r.watchers_count,
              openIssues: r.open_issues_count,
              isFork: r.fork,
              isArchived: r.archived,
              url: r.html_url,
              topics: r.topics ?? [],
              pushedAt: r.pushed_at ? new Date(r.pushed_at) : null,
              userId: user.id,
            },
          })
        )
      )
    }

    // Compute language breakdown from all repos
    const langMap: Record<string, number> = {}
    for (const repo of repos) {
      if (repo.language && !repo.fork) {
        langMap[repo.language] = (langMap[repo.language] ?? 0) + 1
      }
    }

    const ownRepos = repos.filter((r: GHRepo) => !r.fork)
    const totalStars = ownRepos.reduce((s: number, r: GHRepo) => s + r.stargazers_count, 0)
    const totalForks = ownRepos.reduce((s: number, r: GHRepo) => s + r.forks_count, 0)

    return NextResponse.json({
      repos: repos
        .filter((r: GHRepo) => !r.fork)
        .sort((a: GHRepo, b: GHRepo) => b.stargazers_count - a.stargazers_count)
        .slice(0, 10),
      languages: langMap,
      totalStars,
      totalForks,
      ownRepoCount: ownRepos.length,
      forkedCount: repos.length - ownRepos.length,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
