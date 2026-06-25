import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { github } from "@/lib/github"

export async function POST(req: NextRequest) {
  try {
    const { username } = await req.json() as { username: string }

    if (!username || !/^[a-zA-Z0-9-]+$/.test(username)) {
      return NextResponse.json({ error: "Invalid GitHub username" }, { status: 400 })
    }

    // Fetch real GitHub profile
    const ghUser = await github.getUser(username.toLowerCase())

    // Upsert user in DB
    const user = await prisma.user.upsert({
      where: { githubId: ghUser.id },
      update: {
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

    // Create session (7 days)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const session = await prisma.session.create({
      data: { userId: user.id, expiresAt },
    })

    const cookieStore = await cookies()
    cookieStore.set("session_token", session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
    })

    return NextResponse.json({ username: user.username, name: user.name, avatarUrl: user.avatarUrl })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    const status = message.includes("Not Found") ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE() {
  const cookieStore = await cookies()
  const token = cookieStore.get("session_token")?.value
  if (token) {
    await prisma.session.deleteMany({ where: { token } }).catch(() => null)
    cookieStore.delete("session_token")
  }
  return NextResponse.json({ ok: true })
}
