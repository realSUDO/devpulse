"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  Star, GitFork, Users, BookOpen, MapPin, Building2, AtSign, Globe,
  Loader2, GitCommitHorizontal, GitPullRequest, AlertCircle,
  GitBranch, Zap, Crosshair,
} from "lucide-react"

interface GHUser {
  login: string; name: string | null; avatar_url: string; bio: string | null
  company: string | null; location: string | null; blog: string | null
  twitter_username: string | null; followers: number; following: number
  public_repos: number; created_at: string; html_url: string
}
interface Contribution { date: string; count: number; level: 0|1|2|3|4 }
interface Repo {
  id: number; name: string; description: string | null; language: string | null
  stargazers_count: number; forks_count: number; open_issues_count: number
  html_url: string; topics: string[]; pushed_at: string | null
}
interface ReposData {
  repos: Repo[]; languages: Record<string, number>
  totalStars: number; totalForks: number; ownRepoCount: number
}
interface ActivityItem { id: string; type: string; repo: string; description: string; date: string }

interface UserData {
  profile: GHUser | null
  repos: ReposData | null
  activity: ActivityItem[]
  profileLoading: boolean
  reposLoading: boolean
  activityLoading: boolean
  profileError: string
  reposError: string
  activityError: string
}

const LANG_COLORS: Record<string, string> = {
  TypeScript:"#3178c6",JavaScript:"#f1e05a",Python:"#3572A5",Rust:"#dea584",
  Go:"#00ADD8",Java:"#b07219","C++":"#f34b7d",C:"#555555",Ruby:"#701516",
  Swift:"#F05138",Kotlin:"#A97BFF",PHP:"#4F5D95",CSS:"#563d7c",HTML:"#e34c26",
  Shell:"#89e051",Dart:"#00B4AB",Scala:"#c22d40",Vue:"#41b883",Elixir:"#6e4a7e",
  R:"#198CE7","Jupyter Notebook":"#DA5B0B",Zig:"#F7A41D",Nix:"#7e7eff",
}
const lc = (l: string) => LANG_COLORS[l] ?? "#888"

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  if (s < 2592000) return `${Math.floor(s/86400)}d ago`
  return `${Math.floor(s/2592000)}mo ago`
}

function evIcon(type: string) {
  const cls = "size-3 text-muted-foreground shrink-0 mt-0.5"
  if (type === "PushEvent") return <GitCommitHorizontal className={cls} />
  if (type === "PullRequestEvent") return <GitPullRequest className={cls} />
  if (type === "IssuesEvent") return <AlertCircle className={cls} />
  if (type === "CreateEvent") return <GitBranch className={cls} />
  return <Zap className={cls} />
}

const ttStyle = { background:"var(--card)", border:"1px solid var(--border)", borderRadius:"8px", fontSize:11, fontFamily:"var(--font-mono)" }

const LEVEL_COLORS = ["bg-muted/60","bg-foreground/20","bg-foreground/40","bg-foreground/65","bg-foreground"]

function MiniHeatmap({ username }: { username: string }) {
  const [data, setData] = useState<Contribution[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/github/${username}/contributions`)
      .then(r => r.json())
      .then((d: { contributions?: Contribution[] }) => {
        if (d.contributions) setData(d.contributions)
      })
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [username])

  if (loading) return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono py-8">
      <Loader2 className="size-3 animate-spin"/> Loading…
    </div>
  )

  if (!data.length) return <p className="font-mono text-xs text-muted-foreground py-8 text-center">No data</p>

  const first = new Date(data[0]!.date)
  const startPad = first.getDay()
  const cells: (Contribution | null)[] = [...Array<null>(startPad).fill(null), ...data]
  const weeks: (Contribution | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      <div className="flex flex-col gap-px pt-5 shrink-0">
        {["","Mon","","Wed","","Fri",""].map((d,i) => (
          <div key={i} className="h-[10px] font-mono text-[8px] text-muted-foreground leading-none flex items-center">{d}</div>
        ))}
      </div>
      <div className="flex gap-px">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-px">
            {week.map((cell, di) => (
              <div key={di} className={`size-[10px] rounded-[2px] shrink-0 ${cell ? LEVEL_COLORS[cell.level] : "bg-transparent"}`} title={cell ? `${cell.date}: ${cell.count}` : ""}/>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function UserProfileCard({ user, repos }: { user: GHUser; repos: ReposData | null }) {
  const joinYear = new Date(user.created_at).getFullYear()
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Avatar size="lg" className="rounded-xl">
          <AvatarImage src={user.avatar_url} alt={user.login}/>
          <AvatarFallback className="rounded-xl text-xs">{user.login.slice(0,2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="font-semibold text-sm leading-tight tracking-tight truncate">{user.name??user.login}</p>
          <p className="font-mono text-xs text-muted-foreground">@{user.login}</p>
        </div>
      </div>
      {user.bio && <p className="text-[11px] text-muted-foreground leading-relaxed border-l-2 border-border pl-2.5 line-clamp-2">{user.bio}</p>}

      <div className="grid grid-cols-2 gap-1.5">
        {([
          {icon:<Users className="size-2.5"/>, label:"Followers", val:user.followers.toLocaleString()},
          {icon:<Users className="size-2.5"/>, label:"Following", val:user.following.toLocaleString()},
          {icon:<Star className="size-2.5"/>, label:"Stars", val:(repos?.totalStars??0).toLocaleString()},
          {icon:<BookOpen className="size-2.5"/>, label:"Repos", val:(repos?.ownRepoCount??user.public_repos).toLocaleString()},
        ] as const).map(s=>(
          <div key={s.label} className="rounded-lg bg-muted/50 border border-border/50 px-2.5 py-2">
            <div className="flex items-center gap-1 text-muted-foreground mb-0.5">{s.icon}<span className="font-mono text-[9px] uppercase tracking-wider">{s.label}</span></div>
            <p className="font-semibold text-base tracking-tight leading-none tabular-nums">{s.val}</p>
          </div>
        ))}
      </div>

      <div className="space-y-1 font-mono text-[10px] text-muted-foreground">
        {user.company && <p className="flex items-center gap-1.5"><Building2 className="size-2.5 shrink-0"/><span className="truncate">{user.company}</span></p>}
        {user.location && <p className="flex items-center gap-1.5"><MapPin className="size-2.5 shrink-0"/>{user.location}</p>}
        {user.blog && <a href={user.blog} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-foreground"><Globe className="size-2.5 shrink-0"/><span className="truncate">{user.blog.replace(/^https?:\/\//,"").replace(/\/$/,"")}</span></a>}
        {user.twitter_username && <p className="flex items-center gap-1.5"><AtSign className="size-2.5 shrink-0"/>@{user.twitter_username}</p>}
        <p className="flex items-center gap-1.5"><Star className="size-2.5 shrink-0"/>Member since {joinYear}</p>
      </div>
    </div>
  )
}

export default function ComparePage() {
  const router = useRouter()
  const [userA, setUserA] = useState("")
  const [userB, setUserB] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)

  const [left, setLeft] = useState<UserData>({
    profile:null,repos:null,activity:[],
    profileLoading:false,reposLoading:false,activityLoading:false,
    profileError:"",reposError:"",activityError:"",
  })
  const [right, setRight] = useState<UserData>({
    profile:null,repos:null,activity:[],
    profileLoading:false,reposLoading:false,activityLoading:false,
    profileError:"",reposError:"",activityError:"",
  })

  useEffect(() => {
    fetch("/api/auth/me").then(r => { if (!r.ok) router.push("/signin") }).finally(() => setAuthLoading(false))
  }, [router])

  async function fetchUser(username: string, side: "left" | "right") {
    const setter = side === "left" ? setLeft : setRight
    setter(p => ({...p, profileLoading:true, reposLoading:true, activityLoading:true, profileError:"", reposError:"", activityError:""}))

    const [pRes, rRes, aRes] = await Promise.all([
      fetch(`/api/github/${username}/profile`),
      fetch(`/api/github/${username}/repos`),
      fetch(`/api/github/${username}/activity`),
    ])

    if (pRes.ok) {
      const profile = await pRes.json() as GHUser
      setter(p => ({...p, profile, profileLoading:false}))
    } else {
      const err = await pRes.json() as { error?: string }
      setter(p => ({...p, profile:null, profileLoading:false, profileError: err.error ?? "Failed to load profile"}))
    }

    if (rRes.ok) {
      const repos = await rRes.json() as ReposData
      setter(p => ({...p, repos, reposLoading:false}))
    } else {
      setter(p => ({...p, repos:null, reposLoading:false, reposError: "Failed to load repos"}))
    }

    if (aRes.ok) {
      const d = await aRes.json() as { activity: ActivityItem[] }
      setter(p => ({...p, activity: d.activity, activityLoading:false}))
    } else {
      setter(p => ({...p, activity:[], activityLoading:false, activityError: "Failed to load activity"}))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userA.trim() || !userB.trim()) return
    setSubmitted(true)
    await Promise.all([
      fetchUser(userA.trim(), "left"),
      fetchUser(userB.trim(), "right"),
    ])
  }

  function reset() {
    setSubmitted(false)
    setLeft({profile:null,repos:null,activity:[],profileLoading:false,reposLoading:false,activityLoading:false,profileError:"",reposError:"",activityError:""})
    setRight({profile:null,repos:null,activity:[],profileLoading:false,reposLoading:false,activityLoading:false,profileError:"",reposError:"",activityError:""})
  }

  if (authLoading) return (
    <div className="flex min-h-svh items-center justify-center">
      <Loader2 className="size-4 animate-spin text-muted-foreground"/>
    </div>
  )

  if (!submitted) {
    return (
      <div className="flex min-h-svh items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8 gap-2">
            <Crosshair className="size-8" />
            <h1 className="text-xl font-semibold tracking-tight">Compare Developers</h1>
            <p className="font-mono text-xs text-muted-foreground">side-by-side github profile analysis</p>
          </div>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Enter two usernames</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-end">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="userA" className="font-mono text-xs">User A</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm select-none">@</span>
                      <Input id="userA" type="text" placeholder="torvalds" value={userA} onChange={e => setUserA(e.target.value)} className="pl-7 font-mono" required autoComplete="off" autoFocus/>
                    </div>
                  </div>
                  <div className="flex items-center pb-1.5">
                    <span className="text-muted-foreground font-mono text-xs">vs</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="userB" className="font-mono text-xs">User B</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm select-none">@</span>
                      <Input id="userB" type="text" placeholder="gaearon" value={userB} onChange={e => setUserB(e.target.value)} className="pl-7 font-mono" required autoComplete="off"/>
                    </div>
                  </div>
                </div>
                <Button type="submit" className="w-full gap-1.5">
                  <Crosshair className="size-3.5"/> Compare →
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="flex justify-center mt-6">
            <Button variant="ghost" size="sm" className="font-mono text-xs" onClick={() => router.push("/dashboard")}>
              ← Back to dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const leftLoading = left.profileLoading || left.reposLoading
  const rightLoading = right.profileLoading || right.reposLoading
  const bothLoaded = left.profile && right.profile && !leftLoading && !rightLoading

  const leftLangs = left.repos ? Object.entries(left.repos.languages).sort((a,b)=>b[1]-a[1]).slice(0,6) : []
  const rightLangs = right.repos ? Object.entries(right.repos.languages).sort((a,b)=>b[1]-a[1]).slice(0,6) : []
  const leftLangTotal = leftLangs.reduce((s,[,n])=>s+n,0)
  const rightLangTotal = rightLangs.reduce((s,[,n])=>s+n,0)

  const leftStarData = (left.repos?.repos??[]).slice(0,5).map(r=>({name: r.name.length>16 ? r.name.slice(0,16)+"…" : r.name, stars: r.stargazers_count}))
  const rightStarData = (right.repos?.repos??[]).slice(0,5).map(r=>({name: r.name.length>16 ? r.name.slice(0,16)+"…" : r.name, stars: r.stargazers_count}))

  return (
    <div className="min-h-svh bg-background">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">

        {/* Topbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-muted-foreground">devpulse/compare</span>
            {bothLoaded && (
              <div className="hidden sm:flex items-center gap-2 font-mono text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{left.profile!.login}</span>
                <span>vs</span>
                <span className="font-medium text-foreground">{right.profile!.login}</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="font-mono text-xs" onClick={reset}>
              ← New comparison
            </Button>
            <Button variant="ghost" size="sm" className="font-mono text-xs" onClick={() => router.push("/dashboard")}>
              Dashboard
            </Button>
          </div>
        </div>

        {/* Error state */}
        {(left.profileError || right.profileError) && (
          <Card className="border-destructive/30">
            <CardContent className="p-4 font-mono text-xs text-destructive">
              {left.profileError && <p>@{userA}: {left.profileError}</p>}
              {right.profileError && <p>@{userB}: {right.profileError}</p>}
            </CardContent>
          </Card>
        )}

        {leftLoading || rightLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="size-4 animate-spin text-muted-foreground"/>
              <p className="font-mono text-xs text-muted-foreground">Fetching profiles…</p>
            </div>
          </div>
        ) : bothLoaded ? (
          <>
            {/* ── Profile Stats ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2">{userA} · A</p>
                <Card className="shadow-sm">
                  <CardContent className="p-4">
                    <UserProfileCard user={left.profile!} repos={left.repos}/>
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-1">
                <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2">{userB} · B</p>
                <Card className="shadow-sm">
                  <CardContent className="p-4">
                    <UserProfileCard user={right.profile!} repos={right.repos}/>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Separator className="my-2"/>

            {/* ── Stars Comparison ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="shadow-sm">
                <CardHeader className="pb-1 pt-4 px-4">
                  <CardTitle className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.1em]">Stars · {userA}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  {leftStarData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={150}>
                      <BarChart data={leftStarData} layout="vertical" margin={{top:0,right:8,left:0,bottom:0}}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false}/>
                        <XAxis type="number" tick={{fontSize:9,fill:"var(--muted-foreground)",fontFamily:"var(--font-mono)"}} axisLine={false} tickLine={false}/>
                        <YAxis type="category" dataKey="name" tick={{fontSize:9,fill:"var(--muted-foreground)",fontFamily:"var(--font-mono)"}} axisLine={false} tickLine={false} width={120}/>
                        <Tooltip contentStyle={ttStyle} cursor={{fill:"var(--muted)/50"}}/>
                        <Bar dataKey="stars" fill="var(--foreground)" radius={[0,3,3,0]} barSize={11}/>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="font-mono text-xs text-muted-foreground py-8 text-center">No repos</p>}
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardHeader className="pb-1 pt-4 px-4">
                  <CardTitle className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.1em]">Stars · {userB}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  {rightStarData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={150}>
                      <BarChart data={rightStarData} layout="vertical" margin={{top:0,right:8,left:0,bottom:0}}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false}/>
                        <XAxis type="number" tick={{fontSize:9,fill:"var(--muted-foreground)",fontFamily:"var(--font-mono)"}} axisLine={false} tickLine={false}/>
                        <YAxis type="category" dataKey="name" tick={{fontSize:9,fill:"var(--muted-foreground)",fontFamily:"var(--font-mono)"}} axisLine={false} tickLine={false} width={120}/>
                        <Tooltip contentStyle={ttStyle} cursor={{fill:"var(--muted)/50"}}/>
                        <Bar dataKey="stars" fill="var(--foreground)" radius={[0,3,3,0]} barSize={11}/>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="font-mono text-xs text-muted-foreground py-8 text-center">No repos</p>}
                </CardContent>
              </Card>
            </div>

            {/* ── Language Distribution ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="shadow-sm">
                <CardHeader className="pb-1 pt-4 px-4">
                  <CardTitle className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.1em]">Languages · {userA}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2.5">
                  {leftLangs.length > 0 ? (<>
                    <div className="flex h-2 rounded-full overflow-hidden gap-px">
                      {leftLangs.map(([lang,count])=>(
                        <div key={lang} style={{width:`${(count/leftLangTotal)*100}%`,background:lc(lang)}} title={`${lang}: ${Math.round((count/leftLangTotal)*100)}%`}/>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-0.5">
                      {leftLangs.map(([lang,count])=>(
                        <div key={lang} className="flex items-center gap-1.5 min-w-0">
                          <span className="size-2 rounded-full shrink-0 ring-1 ring-black/10" style={{background:lc(lang)}}/>
                          <span className="font-mono text-[11px] truncate">{lang}</span>
                          <span className="font-mono text-[11px] text-muted-foreground ml-auto shrink-0">{Math.round((count/leftLangTotal)*100)}%</span>
                        </div>
                      ))}
                    </div>
                  </>) : <p className="font-mono text-xs text-muted-foreground py-4 text-center">No language data</p>}
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardHeader className="pb-1 pt-4 px-4">
                  <CardTitle className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.1em]">Languages · {userB}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2.5">
                  {rightLangs.length > 0 ? (<>
                    <div className="flex h-2 rounded-full overflow-hidden gap-px">
                      {rightLangs.map(([lang,count])=>(
                        <div key={lang} style={{width:`${(count/rightLangTotal)*100}%`,background:lc(lang)}} title={`${lang}: ${Math.round((count/rightLangTotal)*100)}%`}/>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-0.5">
                      {rightLangs.map(([lang,count])=>(
                        <div key={lang} className="flex items-center gap-1.5 min-w-0">
                          <span className="size-2 rounded-full shrink-0 ring-1 ring-black/10" style={{background:lc(lang)}}/>
                          <span className="font-mono text-[11px] truncate">{lang}</span>
                          <span className="font-mono text-[11px] text-muted-foreground ml-auto shrink-0">{Math.round((count/rightLangTotal)*100)}%</span>
                        </div>
                      ))}
                    </div>
                  </>) : <p className="font-mono text-xs text-muted-foreground py-4 text-center">No language data</p>}
                </CardContent>
              </Card>
            </div>

            {/* ── Top Repos ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="shadow-sm">
                <CardHeader className="pt-4 pb-2 px-4">
                  <CardTitle className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.1em]">Top Repos · {userA}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {(left.repos?.repos??[]).slice(0,5).map((repo,i)=>(
                    <div key={repo.id} className={`flex items-start justify-between gap-2 px-4 py-2 hover:bg-muted/50 transition-colors group ${i>0?"border-t border-border/60":""}`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {repo.language && <span className="size-1.5 rounded-full shrink-0 ring-1 ring-black/10" style={{background:lc(repo.language)}}/>}
                          <a href={repo.html_url} target="_blank" rel="noreferrer" className="font-mono text-[11px] font-medium group-hover:underline truncate">{repo.name}</a>
                        </div>
                        {repo.description && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1 pl-2.5">{repo.description}</p>}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono shrink-0">
                        <span className="flex items-center gap-0.5"><Star className="size-2.5"/>{repo.stargazers_count.toLocaleString()}</span>
                        <span className="flex items-center gap-0.5"><GitFork className="size-2.5"/>{repo.forks_count}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardHeader className="pt-4 pb-2 px-4">
                  <CardTitle className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.1em]">Top Repos · {userB}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {(right.repos?.repos??[]).slice(0,5).map((repo,i)=>(
                    <div key={repo.id} className={`flex items-start justify-between gap-2 px-4 py-2 hover:bg-muted/50 transition-colors group ${i>0?"border-t border-border/60":""}`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {repo.language && <span className="size-1.5 rounded-full shrink-0 ring-1 ring-black/10" style={{background:lc(repo.language)}}/>}
                          <a href={repo.html_url} target="_blank" rel="noreferrer" className="font-mono text-[11px] font-medium group-hover:underline truncate">{repo.name}</a>
                        </div>
                        {repo.description && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1 pl-2.5">{repo.description}</p>}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono shrink-0">
                        <span className="flex items-center gap-0.5"><Star className="size-2.5"/>{repo.stargazers_count.toLocaleString()}</span>
                        <span className="flex items-center gap-0.5"><GitFork className="size-2.5"/>{repo.forks_count}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* ── Activity ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="shadow-sm">
                <CardHeader className="pt-4 pb-2 px-4">
                  <CardTitle className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.1em]">Recent Activity · {userA}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {left.activity.slice(0,6).map((item,i)=>(
                    <div key={item.id} className={`flex items-start gap-2 px-4 py-2 hover:bg-muted/50 transition-colors ${i>0?"border-t border-border/60":""}`}>
                      {evIcon(item.type)}
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] leading-snug line-clamp-1">{item.description}</p>
                        <p className="font-mono text-[9px] text-muted-foreground mt-0.5 truncate">{item.repo.split("/").pop()} · {timeAgo(item.date)}</p>
                      </div>
                    </div>
                  ))}
                  {left.activity.length===0 && <p className="font-mono text-xs text-muted-foreground px-4 py-8 text-center">No public activity</p>}
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardHeader className="pt-4 pb-2 px-4">
                  <CardTitle className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.1em]">Recent Activity · {userB}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {right.activity.slice(0,6).map((item,i)=>(
                    <div key={item.id} className={`flex items-start gap-2 px-4 py-2 hover:bg-muted/50 transition-colors ${i>0?"border-t border-border/60":""}`}>
                      {evIcon(item.type)}
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] leading-snug line-clamp-1">{item.description}</p>
                        <p className="font-mono text-[9px] text-muted-foreground mt-0.5 truncate">{item.repo.split("/").pop()} · {timeAgo(item.date)}</p>
                      </div>
                    </div>
                  ))}
                  {right.activity.length===0 && <p className="font-mono text-xs text-muted-foreground px-4 py-8 text-center">No public activity</p>}
                </CardContent>
              </Card>
            </div>

            {/* ── Contribution Heatmaps ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="shadow-sm">
                <CardHeader className="pt-4 pb-2 px-4">
                  <CardTitle className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.1em]">Contributions · {userA}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <MiniHeatmap username={userA}/>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardHeader className="pt-4 pb-2 px-4">
                  <CardTitle className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.1em]">Contributions · {userB}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <MiniHeatmap username={userB}/>
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}

        <p className="font-mono text-[10px] text-muted-foreground/40 text-center pb-2">
          press <kbd className="font-mono">d</kbd> to toggle dark mode
        </p>
      </div>
    </div>
  )
}
