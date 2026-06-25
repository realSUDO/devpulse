import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { generateSummary, generateRoast, generateAdvice } from "@/lib/ai"
import { prisma } from "@/lib/prisma"
import { github } from "@/lib/github"

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { username, type, fresh } = await req.json() as {
    username: string
    type: "summary" | "roast" | "advice"
    fresh?: boolean
  }

  if (!["summary", "roast", "advice"].includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 })
  }

  try {
    // Ensure user exists in DB — sync if missing
    let user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      include: {
        repos: { orderBy: { stars: "desc" }, take: 10 },
        aiSummaries: { where: { type }, orderBy: { createdAt: "desc" }, take: 1 },
      },
    })

    if (!user) {
      const ghUser = await github.getUser(username)
      const created = await prisma.user.upsert({
        where: { githubId: ghUser.id },
        update: { lastSynced: new Date() },
        create: {
          githubId: ghUser.id,
          username: ghUser.login,
          name: ghUser.name,
          avatarUrl: ghUser.avatar_url,
          bio: ghUser.bio,
          company: ghUser.company,
          location: ghUser.location,
          blog: ghUser.blog,
          email: ghUser.email,
          twitterUsername: ghUser.twitter_username,
          followers: ghUser.followers,
          following: ghUser.following,
          publicRepos: ghUser.public_repos,
          publicGists: ghUser.public_gists,
        },
      })
      // Re-fetch with includes
      user = await prisma.user.findUnique({
        where: { id: created.id },
        include: {
          repos: { orderBy: { stars: "desc" }, take: 10 },
          aiSummaries: { where: { type }, orderBy: { createdAt: "desc" }, take: 1 },
        },
      })
    }

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    // Return cached (1h) unless fresh requested
    if (!fresh && user.aiSummaries.length > 0) {
      const cached = user.aiSummaries[0]!
      if (Date.now() - cached.createdAt.getTime() < 60 * 60 * 1000) {
        return NextResponse.json({ content: cached.content, cached: true, model: cached.model })
      }
    }

    // Build language breakdown from live GitHub data
    const ghRepos = await github.getRepos(username)
    const langMap: Record<string, number> = {}
    for (const r of ghRepos) {
      if (r.language && !r.fork) langMap[r.language] = (langMap[r.language] ?? 0) + 1
    }
    const topLanguages = Object.entries(langMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([l]) => l)

    // Use DB repos if available, else fall back to live data
    const topRepos = user.repos.length > 0
      ? user.repos.slice(0, 6).map((r) => ({ name: r.name, stars: r.stars, description: r.description, language: r.language }))
      : ghRepos
          .filter((r) => !r.fork)
          .sort((a, b) => b.stargazers_count - a.stargazers_count)
          .slice(0, 6)
          .map((r) => ({ name: r.name, stars: r.stargazers_count, description: r.description, language: r.language }))

    const totalStars = ghRepos.filter((r) => !r.fork).reduce((s, r) => s + r.stargazers_count, 0)

    const model = "llama-3.3-70b-versatile"
    let content = ""

    if (type === "summary") {
      content = await generateSummary({
        name: user.name,
        username: user.username,
        bio: user.bio,
        followers: user.followers,
        following: user.following,
        publicRepos: user.publicRepos,
        topLanguages,
        topRepos,
        totalStars,
      })
    } else if (type === "roast") {
      content = await generateRoast({
        username: user.username,
        bio: user.bio,
        followers: user.followers,
        publicRepos: user.publicRepos,
        topLanguages,
        totalStars,
      })
    } else {
      content = await generateAdvice({
        username: user.username,
        topLanguages,
        topRepos,
        publicRepos: user.publicRepos,
        followers: user.followers,
        totalStars,
      })
    }

    await prisma.aISummary.create({ data: { userId: user.id, type, model, content } })

    return NextResponse.json({ content, cached: false, model })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
