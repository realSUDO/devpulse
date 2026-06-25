"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Terminal, Loader2 } from "lucide-react"

export default function SignInPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const res = await fetch("/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim() }),
    })

    if (res.ok) {
      router.push("/dashboard")
    } else {
      const data = await res.json() as { error: string }
      setError(data.error ?? "Something went wrong")
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8 gap-2">
          <Terminal className="size-8" />
          <h1 className="text-xl font-semibold tracking-tight">DevPulse</h1>
          <p className="font-mono text-xs text-muted-foreground">github profile analytics</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Sign in</CardTitle>
            <CardDescription className="font-mono text-xs">
              Enter your GitHub username to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="username" className="font-mono text-xs">
                  GitHub username
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm select-none">
                    @
                  </span>
                  <Input
                    id="username"
                    type="text"
                    placeholder="torvalds"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-7 font-mono"
                    required
                    disabled={loading}
                    autoComplete="off"
                    autoFocus
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs font-mono text-destructive">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Fetching profile…
                  </>
                ) : (
                  "View dashboard →"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="font-mono text-xs text-muted-foreground text-center mt-6">
          no account needed · just your github handle
        </p>
      </div>
    </div>
  )
}
