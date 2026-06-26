import { inngest } from "./client"
import { github } from "@/lib/github"
import { prisma } from "@/lib/prisma"

export const analyzeUserCodebase = inngest.createFunction(
  { 
    id: "analyze-user-codebase",
    triggers: [{ event: "app/analyze.codebase" }]
  },
  async ({ event, step }) => {
    const { username } = event.data

    // 1. Mark as processing
    await step.run("mark-processing", async () => {
      await prisma.user.update({
        where: { username: username },
        data: { deepAnalysisStatus: "PENDING" },
      })
    })

    // 2. Fetch user's original repos
    const ghRepos = await step.run("fetch-repos", async () => {
      const repos = await github.getRepos(username)
      return repos.filter((r) => !r.fork)
    })

    // Sort by stars descending to pick top and bottom
    const sorted = [...ghRepos].sort((a, b) => b.stargazers_count - a.stargazers_count)
    
    // Pick top 3 and bottom 3
    const topRepos = sorted.slice(0, 3)
    const bottomRepos = sorted.slice(-3).filter(r => !topRepos.find(tr => tr.id === r.id)) // Avoid overlap if user has < 6 repos
    
    const selectedRepos = [...topRepos, ...bottomRepos]

    const ownRepos = ghRepos.filter(r => !r.fork)
    const totalStars = ownRepos.reduce((s, r) => s + r.stargazers_count, 0)
    const totalForks = ownRepos.reduce((s, r) => s + r.forks_count, 0)

    let contextString = ""
    let deepScoreBase = (totalStars * 10) + (totalForks * 2)

    // 3. For each selected repo, fetch Tree, Commits, and maybe 1 core file
    for (const repo of selectedRepos) {
      await step.run(`process-repo-${repo.name}`, async () => {
        contextString += `\n\n=== Repo: ${repo.name} ===\n`
        contextString += `Language: ${repo.language} | Stars: ${repo.stargazers_count} | Issues: ${repo.open_issues_count}\n`
        
        try {
          // Fetch tree structure
          const tree = await github.getTree(repo.full_name, "HEAD", true)
          const filePaths = tree.tree.filter(t => t.type === "blob").map(t => t.path)
          
          // Heuristics for deepScore based on project structure
          if (filePaths.some(p => p.includes("docker-compose"))) deepScoreBase += 100
          if (filePaths.some(p => p.includes(".github/workflows"))) deepScoreBase += 150
          if (filePaths.some(p => p.includes("Makefile"))) deepScoreBase += 50
          if (filePaths.length > 50) deepScoreBase += 200

          contextString += `\nFiles (sampled):\n`
          contextString += filePaths.slice(0, 40).join("\n") + (filePaths.length > 40 ? "\n...and more" : "") + "\n"

          // Fetch recent commits
          const commits = await github.getCommits(repo.full_name, 10)
          contextString += `\nRecent Commits:\n`
          for (const c of commits) {
            contextString += `- ${c.commit.author.name}: ${c.commit.message.split("\n")[0]}\n`
          }

          // Sample one core file if possible
          const coreFile = filePaths.find(p => p.match(/^(src\/)?(main|index|app)\.(ts|js|rs|go|py|tsx|jsx)$/i))
          if (coreFile) {
            try {
              const content = await github.getFileContent(repo.full_name, coreFile)
              const sliced = content.split("\n").slice(0, 100).join("\n")
              contextString += `\nFile snippet (${coreFile}):\n\`\`\`\n${sliced}\n\`\`\`\n`
            } catch (e) {
              // ignore fetch errors for specific files
            }
          }
        } catch (err) {
          contextString += `(Error fetching deep details: ${err})\n`
        }
      })
    }

    // 4. Finalize and save to DB
    await step.run("save-results", async () => {
      // Get base user stats to add to deepScore
      const user = await prisma.user.findUnique({ where: { username: username } })
      if (!user) return

      const finalDeepScore = deepScoreBase + (user.followers * 5) + (user.publicRepos * 1)

      await prisma.user.update({
        where: { username: username },
        data: {
          deepAnalysisStatus: "COMPLETED",
          deepScore: finalDeepScore,
          deepContext: contextString.slice(0, 15000), // Safety truncation
        },
      })

      // Wipe old AI cache so next generation uses the fresh deep context
      await prisma.aISummary.deleteMany({
        where: { userId: user.id }
      })

      console.log(`Deep analysis completed for ${username}! New Score: ${finalDeepScore}`)
    })

    return { success: true }
  }
)
