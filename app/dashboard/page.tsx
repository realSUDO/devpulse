"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Star, GitFork, Users, BookOpen, MapPin, Building2, AtSign, Globe,
  Loader2, RefreshCw, Zap, Lightbulb, Flame, ExternalLink, Crosshair,
  GitCommitHorizontal, GitPullRequest, AlertCircle, GitBranch, CalendarDays,
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

// ── Contribution Heatmap ──
const LEVEL_COLORS = [
  "bg-muted/60",
  "bg-foreground/20",
  "bg-foreground/40",
  "bg-foreground/65",
  "bg-foreground",
]

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
const DAYS   = ["","Mon","","Wed","","Fri",""]

function ContributionHeatmap({ username }: { username: string }) {
  const [data, setData] = useState<Contribution[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/github/${username}/contributions`)
      .then(r => r.json())
      .then((d: { contributions?: Contribution[]; total?: Record<string,number> }) => {
        if (d.contributions) {
          setData(d.contributions)
          setTotal(d.total?.lastYear ?? Object.values(d.total ?? {}).reduce((a,b)=>a+b,0))
        }
      })
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [username])

  if (loading) return (
    <Card className="col-span-full shadow-sm">
      <CardContent className="px-5 py-4 flex items-center gap-2 text-xs text-muted-foreground font-mono">
        <Loader2 className="size-3 animate-spin"/> Loading contributions…
      </CardContent>
    </Card>
  )

  if (!data.length) return null

  // Build week columns: align by day-of-week (0=Sun)
  // Pad start so first day lands on correct weekday column
  const first = new Date(data[0]!.date)
  const startPad = first.getDay() // 0=Sun
  const cells: (Contribution | null)[] = [
    ...Array<null>(startPad).fill(null),
    ...data,
  ]
  // chunk into weeks
  const weeks: (Contribution | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }

  // Month labels: find first week where month changes
  const monthLabels: { week: number; label: string }[] = []
  let lastMonth = -1
  weeks.forEach((week, wi) => {
    const first = week.find(c => c !== null)
    if (first) {
      const m = new Date(first.date).getMonth()
      if (m !== lastMonth) { monthLabels.push({ week: wi, label: MONTHS[m]! }); lastMonth = m }
    }
  })

  return (
    <Card className="col-span-full shadow-sm">
      <CardHeader className="pt-4 pb-2 px-5 flex-row items-center justify-between">
        <CardTitle className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.1em]">
          Contribution Activity
        </CardTitle>
        <span className="font-mono text-xs text-muted-foreground">
          {total.toLocaleString()} contributions in the last year
        </span>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className="flex gap-3 overflow-x-auto pb-1">
          {/* Day labels */}
          <div className="flex flex-col gap-px pt-5 shrink-0">
            {DAYS.map((d, i) => (
              <div key={i} className="h-[11px] font-mono text-[9px] text-muted-foreground leading-none flex items-center">{d}</div>
            ))}
          </div>
          {/* Grid */}
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            {/* Month labels */}
            <div className="flex gap-px mb-1">
              {weeks.map((_, wi) => {
                const lbl = monthLabels.find(m => m.week === wi)
                return (
                  <div key={wi} className="w-[11px] shrink-0">
                    {lbl && <span className="font-mono text-[9px] text-muted-foreground whitespace-nowrap">{lbl.label}</span>}
                  </div>
                )
              })}
            </div>
            {/* Cells grid: rows = days of week, cols = weeks */}
            <div className="flex gap-px">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-px">
                  {week.map((cell, di) => (
                    <div
                      key={di}
                      className={`size-[11px] rounded-[2px] shrink-0 ${cell ? LEVEL_COLORS[cell.level] : "bg-transparent"}`}
                      title={cell ? `${cell.date}: ${cell.count} contribution${cell.count!==1?"s":""}` : ""}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-1.5 mt-2 font-mono text-[10px] text-muted-foreground">
          <span>Less</span>
          {LEVEL_COLORS.map((c,i) => <div key={i} className={`size-[11px] rounded-[2px] ${c}`}/>)}
          <span>More</span>
        </div>
      </CardContent>
    </Card>
  )
}


function MD({ src }: { src: string }) {
  return (
    <div className="ai-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({children}) => <p>{children}</p>,
          h1: ({children}) => <h1>{children}</h1>,
          h2: ({children}) => <h2>{children}</h2>,
          h3: ({children}) => <h3>{children}</h3>,
          ul: ({children}) => <ul>{children}</ul>,
          ol: ({children}) => <ol>{children}</ol>,
          li: ({children}) => <li>{children}</li>,
          strong: ({children}) => <strong>{children}</strong>,
          em: ({children}) => <em>{children}</em>,
          code: ({children}) => <code>{children}</code>,
          a: ({href,children}) => <a href={href} target="_blank" rel="noreferrer">{children}</a>,
          blockquote: ({children}) => <blockquote>{children}</blockquote>,
          table: ({children}) => <div className="table-wrap"><table>{children}</table></div>,
          thead: ({children}) => <thead>{children}</thead>,
          tbody: ({children}) => <tbody>{children}</tbody>,
          tr: ({children}) => <tr>{children}</tr>,
          th: ({children}) => <th>{children}</th>,
          td: ({children}) => <td>{children}</td>,
          hr: () => <hr/>,
        }}
      >{src}</ReactMarkdown>
    </div>
  )
}

// ── AI Panel ──
function AIPanel({ username }: { username: string }) {
  const [tab, setTab] = useState("summary")
  const [data, setData] = useState<Record<string, {content:string;loading:boolean;error:string}>>({
    summary:{content:"",loading:false,error:""},
    advice:{content:"",loading:false,error:""},
    roast:{content:"",loading:false,error:""},
  })
  const fired = useRef(false)

  async function gen(type: string, fresh = false) {
    setData(p => ({...p,[type]:{content:"",loading:true,error:""}}))
    try {
      const r = await fetch("/api/ai/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username,type,fresh})})
      const j = await r.json() as {content?:string;error?:string}
      if (!r.ok) throw new Error(j.error)
      setData(p => ({...p,[type]:{content:j.content??"",loading:false,error:""}}))
    } catch(e) {
      setData(p => ({...p,[type]:{content:"",loading:false,error:e instanceof Error?e.message:"Error"}}))
    }
  }

  useEffect(() => {
    if (fired.current) return; fired.current=true; void gen("summary")
  }, [username]) // eslint-disable-line

  const tabs = [
    {key:"summary",label:"Profile",icon:<Zap className="size-3"/>},
    {key:"advice",label:"Advice",icon:<Lightbulb className="size-3"/>},
    {key:"roast",label:"Roast",icon:<Flame className="size-3"/>},
  ]

  return (
    <Card className="col-span-full border-border/60">
      <CardHeader className="pb-2 flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-xs font-mono text-muted-foreground uppercase tracking-widest">AI Insights</CardTitle>
          <p className="font-mono text-[10px] text-muted-foreground/50 mt-0.5">llama-3.3-70b · Groq</p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={()=>gen(tab,true)} disabled={data[tab]?.loading} title="Regenerate">
          <RefreshCw className={`size-3 ${data[tab]?.loading?"animate-spin":""}`}/>
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={v=>{setTab(v);if(!data[v]?.content&&!data[v]?.loading)gen(v)}}>
          <TabsList className="mb-5 h-8 gap-0.5">
            {tabs.map(t=>(
              <TabsTrigger key={t.key} value={t.key} className="font-mono text-xs gap-1.5 h-6 px-3">
                {t.icon}{t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map(t=>(
            <TabsContent key={t.key} value={t.key} className="mt-0">
              {data[t.key]?.loading ? (
                <div className="flex items-center gap-2.5 text-xs text-muted-foreground font-mono py-8">
                  <Loader2 className="size-3.5 animate-spin"/> Composing analysis…
                </div>
              ) : data[t.key]?.error ? (
                <p className="text-xs text-destructive font-mono py-2">{data[t.key]?.error}</p>
              ) : data[t.key]?.content ? (
                <MD src={data[t.key]!.content}/>
              ) : (
                <Button variant="outline" size="sm" className="font-mono text-xs mt-1" onClick={()=>gen(t.key)}>
                  Generate {t.label}
                </Button>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}

// ── Main ──
export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<GHUser | null>(null)
  const [repoData, setRepoData] = useState<ReposData | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function load() {
      const me = await fetch("/api/auth/me")
      if (!me.ok) { router.push("/signin"); return }
      const { username } = await me.json() as { username: string }
      const [p, r, a] = await Promise.all([
        fetch(`/api/github/${username}/profile`),
        fetch(`/api/github/${username}/repos`),
        fetch(`/api/github/${username}/activity`),
      ])
      if (p.status === 401) { router.push("/signin"); return }
      if (p.ok) setUser(await p.json() as GHUser)
      if (r.ok) setRepoData(await r.json() as ReposData)
      if (a.ok) { const d = await a.json() as {activity:ActivityItem[]}; setActivity(d.activity) }
      setLoading(false)
    }
    load().catch(e => { setError(String(e)); setLoading(false) })
  }, [router])

  async function signOut() {
    await fetch("/api/auth/signin", { method: "DELETE" })
    router.push("/signin")
  }

  if (loading) return (
    <div className="flex min-h-svh items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="size-4 animate-spin text-muted-foreground"/>
        <p className="font-mono text-xs text-muted-foreground">Loading…</p>
      </div>
    </div>
  )

  if (error || !user) return (
    <div className="flex min-h-svh items-center justify-center">
      <div className="text-center space-y-3">
        <p className="font-mono text-xs text-destructive">{error || "Failed to load"}</p>
        <Button variant="outline" size="sm" onClick={() => router.push("/signin")}>← Back</Button>
      </div>
    </div>
  )

  const joinYear = new Date(user.created_at).getFullYear()
  const langs = repoData ? Object.entries(repoData.languages).sort((a,b)=>b[1]-a[1]).slice(0,8) : []
  const langTotal = langs.reduce((s,[,n])=>s+n,0)
  const starData = (repoData?.repos??[]).slice(0,8).map(r=>({
    name: r.name.length>20 ? r.name.slice(0,20)+"…" : r.name,
    stars: r.stargazers_count,
  }))

  return (
    <div className="min-h-svh bg-background">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">

        {/* Topbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-muted-foreground">
              devpulse<span className="text-foreground font-medium">/{user.login}</span>
            </span>
            <Link href="/compare" className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors hidden sm:inline-flex items-center gap-1">
              <Crosshair className="size-3"/> Compare
            </Link>
          </div>
          <Popover>
            <PopoverTrigger className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
              <Avatar size="default">
                <AvatarImage src={user.avatar_url} alt={user.login}/>
                <AvatarFallback>{user.login.slice(0,2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="end" sideOffset={8} className="w-56 p-0 overflow-hidden">
              <div className="p-3.5 flex items-center gap-3">
                <Avatar size="default">
                  <AvatarImage src={user.avatar_url} alt={user.login}/>
                  <AvatarFallback>{user.login.slice(0,2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{user.name??user.login}</p>
                  <p className="font-mono text-xs text-muted-foreground">@{user.login}</p>
                </div>
              </div>
              <Separator/>
              <div className="p-3 space-y-1.5 font-mono text-xs text-muted-foreground">
                {user.location && <div className="flex items-center gap-1.5"><MapPin className="size-3 shrink-0"/>{user.location}</div>}
                {user.blog && <div className="flex items-center gap-1.5"><Globe className="size-3 shrink-0"/><a href={user.blog} target="_blank" rel="noreferrer" className="hover:text-foreground truncate">{user.blog.replace(/^https?:\/\//,"")}</a></div>}
                {user.twitter_username && <div className="flex items-center gap-1.5"><AtSign className="size-3 shrink-0"/>@{user.twitter_username}</div>}
                <div className="flex items-center gap-1.5"><CalendarDays className="size-3 shrink-0"/>Since {joinYear}</div>
              </div>
              <Separator/>
              <div className="p-2.5 flex gap-2">
                <a href={user.html_url} target="_blank" rel="noreferrer" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full font-mono text-xs gap-1">
                    <ExternalLink className="size-3"/>GitHub
                  </Button>
                </a>
                <Button variant="ghost" size="sm" className="flex-1 font-mono text-xs" onClick={signOut}>Sign out</Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-12 gap-3">

          {/* ① Profile card — 3 cols, spans 2 rows */}
          <Card className="col-span-12 sm:col-span-3 sm:row-span-2 shadow-sm ring-1 ring-border/40">
            <CardContent className="p-5 flex flex-col gap-4 h-full">
              <div className="flex flex-col gap-2.5">
                <Avatar size="lg" className="size-14 rounded-xl">
                  <AvatarImage src={user.avatar_url} alt={user.login}/>
                  <AvatarFallback className="rounded-xl text-base">{user.login.slice(0,2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-base leading-tight tracking-tight">{user.name??user.login}</p>
                  <p className="font-mono text-xs text-muted-foreground mt-0.5">@{user.login}</p>
                </div>
                {user.bio && <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-border pl-3">{user.bio}</p>}
              </div>

              <Separator/>

              <div className="grid grid-cols-2 gap-2">
                {([
                  {icon:<Users className="size-3"/>, label:"Followers", val:user.followers.toLocaleString()},
                  {icon:<Users className="size-3"/>, label:"Following", val:user.following.toLocaleString()},
                  {icon:<Star className="size-3"/>, label:"Stars", val:(repoData?.totalStars??0).toLocaleString()},
                  {icon:<BookOpen className="size-3"/>, label:"Repos", val:(repoData?.ownRepoCount??user.public_repos).toLocaleString()},
                ] as const).map(s=>(
                  <div key={s.label} className="rounded-lg bg-muted/50 border border-border/50 px-3 py-2.5">
                    <div className="flex items-center gap-1 text-muted-foreground mb-1">{s.icon}<span className="font-mono text-[10px] uppercase tracking-wider">{s.label}</span></div>
                    <p className="font-semibold text-xl tracking-tight leading-none tabular-nums">{s.val}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5 mt-auto pt-1">
                {user.company && <p className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground"><Building2 className="size-3 shrink-0"/><span className="truncate">{user.company}</span></p>}
                {user.location && <p className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground"><MapPin className="size-3 shrink-0"/>{user.location}</p>}
                {user.blog && <a href={user.blog} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground hover:text-foreground transition-colors"><Globe className="size-3 shrink-0"/><span className="truncate">{user.blog.replace(/^https?:\/\//,"").replace(/\/$/,"")}</span></a>}
                <p className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground"><CalendarDays className="size-3 shrink-0"/>Member since {joinYear}</p>
              </div>
            </CardContent>
          </Card>

          {/* ② Stars chart — 9 cols */}
          <Card className="col-span-12 sm:col-span-9 shadow-sm">
            <CardHeader className="pb-1 pt-4 px-5">
              <CardTitle className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.1em]">Stars by Repository</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              {starData.length > 0 ? (
                <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={starData} layout="vertical" margin={{top:0,right:12,left:0,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false}/>
                    <XAxis type="number" tick={{fontSize:10,fill:"var(--muted-foreground)",fontFamily:"var(--font-mono)"}} axisLine={false} tickLine={false}/>
                    <YAxis type="category" dataKey="name" tick={{fontSize:10,fill:"var(--muted-foreground)",fontFamily:"var(--font-mono)"}} axisLine={false} tickLine={false} width={145}/>
                    <Tooltip contentStyle={ttStyle} cursor={{fill:"var(--muted)/50"}}/>
                    <Bar dataKey="stars" name="Stars" fill="var(--foreground)" radius={[0,3,3,0]} barSize={13}/>
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="font-mono text-xs text-muted-foreground py-12 text-center">No repositories found</p>}
            </CardContent>
          </Card>

          {/* ③ Language distribution — 9 cols */}
          <Card className="col-span-12 sm:col-span-9 shadow-sm">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.1em]">Language Distribution</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4 space-y-3">
              {langs.length > 0 ? (<>
                <div className="flex h-2.5 rounded-full overflow-hidden gap-px">
                  {langs.map(([lang,count])=>(
                    <div key={lang} style={{width:`${(count/langTotal)*100}%`,background:lc(lang)}} title={`${lang}: ${Math.round((count/langTotal)*100)}%`}/>
                  ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 pt-1">
                  {langs.map(([lang,count])=>(
                    <div key={lang} className="flex items-center gap-2 min-w-0">
                      <span className="size-2 rounded-full shrink-0 ring-1 ring-black/10" style={{background:lc(lang)}}/>
                      <span className="font-mono text-xs truncate">{lang}</span>
                      <span className="font-mono text-xs text-muted-foreground ml-auto shrink-0">{Math.round((count/langTotal)*100)}%</span>
                    </div>
                  ))}
                </div>
              </>) : <p className="font-mono text-xs text-muted-foreground py-4 text-center">No language data</p>}
            </CardContent>
          </Card>

          {/* ④ Top repos — 6 cols */}
          <Card className="col-span-12 sm:col-span-6 shadow-sm">
            <CardHeader className="pt-4 pb-2 px-5">
              <CardTitle className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.1em]">Top Repositories</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {(repoData?.repos??[]).slice(0,7).map((repo,i)=>(
                <div key={repo.id} className={`flex items-start justify-between gap-3 px-5 py-2.5 hover:bg-muted/50 transition-colors group ${i>0?"border-t border-border/60":""}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {repo.language && <span className="size-2 rounded-full shrink-0 ring-1 ring-black/10" style={{background:lc(repo.language)}}/>}
                      <a href={repo.html_url} target="_blank" rel="noreferrer" className="font-mono text-xs font-medium group-hover:underline truncate">{repo.name}</a>
                    </div>
                    {repo.description && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1 pl-3.5">{repo.description}</p>}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono shrink-0">
                    <span className="flex items-center gap-0.5"><Star className="size-3"/>{repo.stargazers_count.toLocaleString()}</span>
                    <span className="flex items-center gap-0.5"><GitFork className="size-3"/>{repo.forks_count}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* ⑤ Activity feed — 6 cols */}
          <Card className="col-span-12 sm:col-span-6 shadow-sm">
            <CardHeader className="pt-4 pb-2 px-5">
              <CardTitle className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.1em]">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {activity.slice(0,9).map((item,i)=>(
                <div key={item.id} className={`flex items-start gap-2.5 px-5 py-2.5 hover:bg-muted/50 transition-colors ${i>0?"border-t border-border/60":""}`}>
                  {evIcon(item.type)}
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] leading-snug line-clamp-1">{item.description}</p>
                    <p className="font-mono text-[10px] text-muted-foreground mt-0.5 truncate">
                      {item.repo.split("/").pop()} · {timeAgo(item.date)}
                    </p>
                  </div>
                </div>
              ))}
              {activity.length===0 && <p className="font-mono text-xs text-muted-foreground px-5 py-10 text-center">No public activity</p>}
            </CardContent>
          </Card>

          {/* ⑥ Contribution heatmap — full width */}
          <ContributionHeatmap username={user.login}/>

          {/* ⑦ AI Insights — full width */}
          <AIPanel username={user.login}/>

        </div>

        <p className="font-mono text-[10px] text-muted-foreground/40 text-center pb-2">
          press <kbd className="font-mono">d</kbd> to toggle dark mode
        </p>
      </div>
    </div>
  )
}
