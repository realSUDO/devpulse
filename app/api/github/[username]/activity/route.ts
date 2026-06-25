import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { github } from "@/lib/github"

const ghHeaders: Record<string, string> = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
}

async function getCommitRange(repo: string, before: string, head: string) {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/compare/${before}...${head}`,
      { headers: ghHeaders, next: { revalidate: 300 } }
    )
    if (!res.ok) return { count: 1, message: "" }
    const data = await res.json() as {
      total_commits: number
      commits: { commit: { message: string } }[]
    }
    return {
      count: data.total_commits ?? 1,
      message: data.commits?.[0]?.commit?.message?.split("\n")[0] ?? "",
    }
  } catch {
    return { count: 1, message: "" }
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { username } = await params

  try {
    const events = await github.getEvents(username)

    // Resolve PushEvent commit info in parallel (cap at first 5 push events to avoid rate limits)
    const pushEvents = events.filter(e => e.type === "PushEvent").slice(0, 5)
    const pushInfoMap = new Map<string, { count: number; message: string }>()

    await Promise.allSettled(
      pushEvents.map(async (e) => {
        const p = e.payload as { before?: string; head?: string }
        if (p.before && p.head && p.before !== "0000000000000000000000000000000000000000") {
          const info = await getCommitRange(e.repo.name, p.before, p.head)
          pushInfoMap.set(e.id, info)
        } else {
          pushInfoMap.set(e.id, { count: 1, message: "" })
        }
      })
    )

    const activity = events.slice(0, 20).map((e) => {
      let description = ""
      const payload = e.payload

      switch (e.type) {
        case "PushEvent": {
          const info = pushInfoMap.get(e.id) ?? { count: 1, message: "" }
          const branch = ((payload.ref as string | undefined) ?? "").replace("refs/heads/", "")
          description = `Pushed ${info.count} commit${info.count !== 1 ? "s" : ""} to ${branch}${info.message ? `: ${info.message}` : ""}`
          break
        }
        case "PullRequestEvent":
          description = `${String(payload.action)} PR: ${(payload.pull_request as { title?: string } | undefined)?.title ?? ""}`
          break
        case "IssuesEvent":
          description = `${String(payload.action)} issue: ${(payload.issue as { title?: string } | undefined)?.title ?? ""}`
          break
        case "WatchEvent":
          description = `Starred ${e.repo.name}`
          break
        case "ForkEvent":
          description = `Forked ${e.repo.name}`
          break
        case "CreateEvent":
          description = `Created ${String(payload.ref_type)}${payload.ref ? ` "${String(payload.ref)}"` : ""} in ${e.repo.name}`
          break
        case "DeleteEvent":
          description = `Deleted ${String(payload.ref_type)} in ${e.repo.name}`
          break
        case "IssueCommentEvent":
          description = `Commented on issue in ${e.repo.name}`
          break
        case "PullRequestReviewEvent":
          description = `Reviewed PR in ${e.repo.name}`
          break
        case "ReleaseEvent":
          description = `Released ${(payload.release as { tag_name?: string } | undefined)?.tag_name ?? ""} in ${e.repo.name}`
          break
        default:
          description = e.type.replace("Event", "") + ` in ${e.repo.name}`
      }

      return { id: e.id, type: e.type, repo: e.repo.name, description, date: e.created_at }
    })

    return NextResponse.json({ activity })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
