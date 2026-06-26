import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { github } from "@/lib/github"
import { prisma } from "@/lib/prisma"
import { inngest } from "@/lib/inngest/client"

// GET /api/github/[username]/profile
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { username } = await params

  try {
    const ghUser = await github.getUser(username)

    // Sync to DB
    const user = await prisma.user.upsert({
      where: { githubId: ghUser.id },
      update: {
        followers: ghUser.followers,
        following: ghUser.following,
        publicRepos: ghUser.public_repos,
        publicGists: ghUser.public_gists,
        bio: ghUser.bio,
        name: ghUser.name,
        company: ghUser.company,
        location: ghUser.location,
        twitterUsername: ghUser.twitter_username,
        lastSynced: new Date(),
      },
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

    if (user.deepAnalysisStatus === "NONE") {
      try {
        await inngest.send({
          name: "app/analyze.codebase",
          data: { username: ghUser.login },
        })
      } catch (err) {
        console.error("Failed to trigger inngest job:", err)
      }
    }

    return NextResponse.json({ ...ghUser, dbId: user.id, lastSynced: user.lastSynced, deepAnalysisStatus: user.deepAnalysisStatus, deepScore: user.deepScore })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
