import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"

interface Contribution {
  date: string
  count: number
  level: 0 | 1 | 2 | 3 | 4
}

interface ContribResponse {
  total: Record<string, number>
  contributions: Contribution[]
}

// GET /api/github/[username]/contributions
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { username } = await params

  try {
    const res = await fetch(
      `https://github-contributions-api.jogruber.de/v4/${username}?y=last`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) throw new Error(`Contributions API error: ${res.status}`)
    const data = await res.json() as ContribResponse
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
