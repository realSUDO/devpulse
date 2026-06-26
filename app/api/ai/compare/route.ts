import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateComparison } from "@/lib/ai"
import { github } from "@/lib/github"
import { getRankInfo } from "@/lib/ranks"

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const { userA, userB } = await req.json()
    if (!userA || !userB) {
      return NextResponse.json({ error: "Missing usernames" }, { status: 400 })
    }

    // Fetch DB records for deepContext (case-insensitive)
    const [dbUserA, dbUserB] = await Promise.all([
      prisma.user.findFirst({ where: { username: { equals: userA, mode: 'insensitive' } } }),
      prisma.user.findFirst({ where: { username: { equals: userB, mode: 'insensitive' } } })
    ])

    // Fetch repos for basic stats
    const [reposA, reposB, contribA, contribB] = await Promise.all([
      github.getRepos(userA).catch(() => []),
      github.getRepos(userB).catch(() => []),
      fetch(`https://github-contributions-api.jogruber.de/v4/${userA}?y=last`).then(r=>r.json()).catch(()=>({total:{lastYear:0}})),
      fetch(`https://github-contributions-api.jogruber.de/v4/${userB}?y=last`).then(r=>r.json()).catch(()=>({total:{lastYear:0}}))
    ])

    const formatUser = (username: string, dbUser: any, repos: any[], contrib: any) => {
      const totalStars = repos.reduce((sum: number, r: any) => sum + r.stargazers_count, 0)
      const totalForks = repos.reduce((sum: number, r: any) => sum + r.forks_count, 0)
      const langs = repos.map((r: any) => r.language).filter(Boolean) as string[]
      const langCounts = langs.reduce((acc, l) => { acc[l] = (acc[l] || 0) + 1; return acc }, {} as Record<string, number>)
      const topLanguages = Object.entries(langCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0])

      const commits = contrib?.total?.lastYear || ((dbUser?.publicRepos || 0) * 15)
      const followers = dbUser?.followers || 0
      const deepScore = dbUser?.deepScore || 0

      const pStars = Math.min(99.9, Math.max(0, (Math.log10(Math.max(1, totalStars)) / 4.5) * 100))
      const pCommits = Math.min(99.9, Math.max(0, (Math.log10(Math.max(1, commits)) / 4) * 100))
      const pFollowers = Math.min(99.9, Math.max(0, (Math.log10(Math.max(1, followers)) / 4) * 100))
      const pQuality = deepScore 
        ? Math.min(99.9, Math.max(0, (Math.log10(Math.max(1, deepScore)) / 5) * 100))
        : Math.min(99.9, Math.max(0, (Math.log10(Math.max(1, (totalStars * 2) / Math.max(1, dbUser?.publicRepos || 1))) / 2.5) * 100 + 15))
      const impactVal = (followers * 10) + (totalForks * 5)
      const pImpact = Math.min(99.9, Math.max(0, (Math.log10(Math.max(1, impactVal)) / 5) * 100))

      const rankInfo = getRankInfo(dbUser, { totalStars, totalForks })

      return {
        username,
        topLanguages,
        publicRepos: repos.length,
        totalStars,
        followers,
        deepScore,
        totalCommits: commits,
        percentiles: {
          stars: pStars.toFixed(1),
          commits: pCommits.toFixed(1),
          followers: pFollowers.toFixed(1),
          quality: pQuality.toFixed(1),
          impact: pImpact.toFixed(1)
        },
        rank: rankInfo.rank.name,
        deepContext: dbUser?.deepContext
      }
    }

    const payloadA = formatUser(userA, dbUserA, reposA, contribA)
    const payloadB = formatUser(userB, dbUserB, reposB, contribB)

    let markdown = await generateComparison(payloadA, payloadB)
    
    // Parse [WINNER]: username
    let winner = null
    const winnerMatch = markdown.match(/\[WINNER\]:\s*(.+)/i)
    if (winnerMatch) {
      winner = winnerMatch[1].trim()
      // Remove the winner line from the markdown
      markdown = markdown.replace(/\[WINNER\]:\s*.+\n*/i, "").trim()
    }

    return NextResponse.json({ markdown, winner })

  } catch (error) {
    console.error("AI Compare Error:", error)
    return NextResponse.json({ error: "Failed to generate comparison" }, { status: 500 })
  }
}
