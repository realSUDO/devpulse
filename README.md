# DevPulse

**Your GitHub profile, deeply analyzed.**

Enter any GitHub username and get an interactive dashboard with real stats, language breakdown, activity feed, contribution heatmap, and AI-powered insights via Llama 3.3. No OAuth, no account — just a username.

## Features

- **Profile Overview** — Avatar, bio, follower/repo stats, location, company, blog, member-since year
- **Stars by Repository** — Horizontal bar chart of your top 8 repos by stars
- **Language Distribution** — Gradient breakdown bar with per-language grid (colors match GitHub's)
- **Top Repositories** — Sorted by stars with descriptions, language dots, star/fork counts
- **Recent Activity Feed** — Push, PR, Issue, Fork, Watch, Create events with human-readable descriptions
- **Contribution Heatmap** — GitHub-style calendar heatmap from public contribution data
- **AI Insights** (Llama 3.3 via Groq):
  - **Profile Summary** — Analysis of work style, strengths, and patterns
  - **Career Advice** — Actionable tooling and skill recommendations with priority table
  - **Roast** — Humorous British-style critique with a blunt rephrasing
- **Dark Mode** — Toggle with the `d` key (persistent via `next-themes`)

## Tech Stack

| | |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS v4, shadcn/ui v4 |
| **Charts** | Recharts |
| **Database** | PostgreSQL via Prisma ORM |
| **AI** | Groq SDK (llama-3.3-70b-versatile) |
| **Icons** | lucide-react |
| **Markdown** | react-markdown + remark-gfm |

## Getting Started

### Prerequisites

- Node.js (with pnpm installed)
- PostgreSQL database
- Groq API key (for AI features)
- GitHub personal access token (optional, for higher API rate limits)

### Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/devpulse
GROQ_API_KEY=gsk_...
GITHUB_TOKEN=ghp_...           # optional, for higher API rate limits
```

### Setup

```bash
pnpm install
pnpm prisma migrate deploy
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and enter a GitHub username.

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start development server |
| `pnpm build` | Migrate database + production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm format` | Format code with Prettier |
| `pnpm typecheck` | Run TypeScript type checking |

## Architecture

```
app/
├── page.tsx             Landing page
├── signin/page.tsx      GitHub username entry
├── dashboard/page.tsx   Main dashboard (profile, charts, repos, activity, heatmap, AI)
└── api/
    ├── auth/            Session management (signin, me)
    ├── ai/generate      AI insight generation with DB caching
    └── github/[user]    GitHub data fetching (profile, repos, activity, contributions)
```

Data flows: GitHub REST API → server-side caching → PostgreSQL → rendered client-side. AI responses are cached per user for 1 hour; GitHub API responses use `next.revalidate` at 5 minutes.
