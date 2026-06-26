import Groq from "groq-sdk"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })
const MODEL = "llama-3.3-70b-versatile"

type RepoInput = { name: string; stars: number; description: string | null; language: string | null }

interface ProfileInput {
  name: string | null
  username: string
  bio: string | null
  followers: number
  following: number
  publicRepos: number
  topLanguages: string[]
  topRepos: RepoInput[]
  totalStars: number
  deepContext?: string | null
}

export async function generateSummary(profile: ProfileInput): Promise<string> {
  const repoRows = profile.topRepos.slice(0, 6)
    .map(r => `| \`${r.name}\` | ${r.language ?? "—"} | ${r.stars.toLocaleString()} |`)
    .join("\n")

  const prompt = `Write a GitHub developer profile analysis. Be direct and specific. No fluff, no vague praise, no formal language. Write like a senior dev explaining something to a coworker.

${profile.deepContext ? `We have deeply analyzed their actual codebase, commit history, and file structures. Here is the deep context:\n\n${profile.deepContext}\n\nUSE THIS DEEP CONTEXT to generate incredibly specific and accurate insights.` : ""}

Developer: ${profile.name ?? profile.username} (@${profile.username})
Bio: ${profile.bio ?? "(none)"}
${profile.followers} followers · ${profile.publicRepos} repos · ${profile.totalStars} total stars
Languages: ${profile.topLanguages.join(", ")}

Top repos:
| Repository | Language | Stars |
|------------|----------|-------|
${repoRows}

Structure:
- 2 short paragraphs: what this dev builds, and what their GitHub pattern says about how they work
- Then the repo table (formatted cleanly)

Rules:
- Reference their actual repo names and languages
- No "it seems", "one might", "it is worth noting", no British vocabulary
- Plain conversational English
- No generic lines like "passionate developer" or "strong foundation"

Example of what I want:

---
@avelino is primarily a Go developer. The \`awesome-go\` list is the obvious star here, but the surrounding repos show someone who actually codes in Go daily — there are small focused utilities that clearly came from real problems, not tutorial exercises.

The pattern is breadth over depth. Lots of repos, most of them small and purposeful. The star-to-follower ratio is high, which usually means the work is useful but the person isn't playing the social media game. That's a good sign.

| Repository | Language | Stars |
|------------|----------|-------|
| \`awesome-go\` | Go | 140,000 |
| \`vim-bootstrap\` | JavaScript | 5,200 |
---

Now write for @${profile.username}.`

  const res = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    max_tokens: 500,
    temperature: 0.6,
  })
  return res.choices[0]?.message?.content?.trim() ?? ""
}

export async function generateRoast(profile: {
  username: string
  bio: string | null
  followers: number
  publicRepos: number
  topLanguages: string[]
  totalStars: number
  deepContext?: string | null
}): Promise<string> {
  const prompt = `You are a dry, sharp British senior engineer. Roast this developer's GitHub profile.

${profile.deepContext ? `We have deeply analyzed their actual codebase, commit history, and file structures. Here is the deep context:\n\n${profile.deepContext}\n\nUSE THIS DEEP CONTEXT to generate incredibly specific, brutally accurate, and code-based roasts. Mock their specific bad commit messages, point out their abandoned/bottom repos, and call out their structural choices (e.g., having a Dockerfile but no CI/CD).` : ""}

@${profile.username}
Bio: "${profile.bio ?? "(no bio)"}"
${profile.followers} followers · ${profile.publicRepos} repos · ${profile.totalStars} stars
Languages: ${profile.topLanguages.join(", ")}

Part 1 — The British Roast:
Write 3–4 sentences of dry, cutting British wit. Reference their actual stats, language choices, and bio specifically. No generic jokes.

Then write exactly this line as a header:
---
**Didn't quite follow that? Here's the version for someone who needs the subtlety beaten out of it:**

Part 2 — The Blunt Version:
Write the same roast again but in the most direct, zero-finesse language possible. State the exact same points but strip out all the wit — just say it plainly and rudely, like you've completely given up on being clever.

Example output:

---
One suspects that @devguy discovered ${profile.topLanguages[0] ?? "JavaScript"} at an impressionable age and has since made it his life's work to avoid confronting anything more demanding. The ${profile.publicRepos} repositories imply productivity; the ${profile.totalStars} stars imply that the output has been received with the enthusiasm typically reserved for a dentist's waiting room. The bio — "${profile.bio ?? "absent, like the self-awareness"}" — reads as though it was composed in a hurry and never revisited, which, on reflection, may be the most accurate thing about the whole profile.

---
**Didn't quite follow that? Here's the version for someone who needs the subtlety beaten out of it:**

You've been coding in ${profile.topLanguages[0] ?? "JavaScript"} for years and you've got nothing to show for it. ${profile.publicRepos} repos. ${profile.totalStars} total stars. That means basically nobody uses your stuff. Your bio is lazy and says nothing about you. You're not impressive.

---

Now write the roast for @${profile.username}. Make both parts specific to their actual data.`

  const res = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    max_tokens: 450,
    temperature: 0.92,
  })
  return res.choices[0]?.message?.content?.trim() ?? ""
}

export async function generateAdvice(profile: {
  username: string
  topLanguages: string[]
  topRepos: RepoInput[]
  publicRepos: number
  followers: number
  totalStars: number
  deepContext?: string | null
}): Promise<string> {
  const repoRows = profile.topRepos.slice(0, 6)
    .map(r => `| \`${r.name}\` | ${r.language ?? "?"} | ${r.stars} |`)
    .join("\n")

  const prompt = `Give specific, practical career and engineering advice for this developer. Be direct. No motivational language, no vague tips.

${profile.deepContext ? `We have deeply analyzed their actual codebase, commit history, and file structures. Here is the deep context:\n\n${profile.deepContext}\n\nUSE THIS DEEP CONTEXT to give extremely practical code-level and architectural advice based on their real habits and commit messages.` : ""}

@${profile.username} · ${profile.publicRepos} repos · ${profile.followers} followers · ${profile.totalStars} stars
Languages: ${profile.topLanguages.join(", ")}

| Repository | Language | Stars |
|------------|----------|-------|
${repoRows}

Structure:
1. One paragraph: what they're doing well — name specific repos and why
2. One paragraph: the most important thing to fix or improve — tie it to what you actually see
3. A table with 3 next steps: Action | Why It Matters | Priority (High/Medium/Low)

Rules:
- No "it's worth noting", "one might consider", "it's clear that"
- Reference the actual repos and languages
- Plain, direct English — like advice from a senior dev in a 1:1

Example:

---
The TypeScript work in \`api-gateway\` is solid. The module boundaries are clear and you can tell it's been through some production pain — that's exactly the kind of experience that matters. \`auth-lib\` having test coverage when most solo projects don't is a good signal.

The READMEs are thin across the board. That's the biggest thing holding this work back. \`api-gateway\` looks like something people would actually use, but someone landing on it from a search has no idea what it does in 10 seconds. Fix that first.

| Action | Why It Matters | Priority |
|--------|----------------|----------|
| Rewrite the README for \`api-gateway\` | It's the first thing anyone sees; bad docs kill adoption | High |
| Write one technical post about your auth approach | Devs search for this stuff; it builds rep fast | High |
| Open a PR to a popular TypeScript library | Gets your name in front of maintainers | Medium |
---

Now write advice for @${profile.username}.`

  const res = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    max_tokens: 550,
    temperature: 0.55,
  })
  return res.choices[0]?.message?.content?.trim() ?? ""
}

export async function generateComparison(
  userA: { username: string; topLanguages: string[]; publicRepos: number; totalStars: number; followers: number; totalCommits: number; deepScore: number; rank: string; percentiles: Record<string, string>; deepContext?: string | null },
  userB: { username: string; topLanguages: string[]; publicRepos: number; totalStars: number; followers: number; totalCommits: number; deepScore: number; rank: string; percentiles: Record<string, string>; deepContext?: string | null }
): Promise<string> {
  const prompt = `You are a ruthless but fair senior engineer judging a developer showdown. Compare these two developers and declare a winner based heavily on their DevPulse Rank, Code Quality, and Percentiles.

User A (@${userA.username}):
${userA.publicRepos} repos, ${userA.totalStars} stars, ${userA.followers} followers, ${userA.totalCommits} commits
DevPulse Rank: ${userA.rank}
Percentiles: Stars (${userA.percentiles.stars}%), Commits (${userA.percentiles.commits}%), Followers (${userA.percentiles.followers}%), Code Quality (${userA.percentiles.quality}%), Impact (${userA.percentiles.impact}%)
Top Languages: ${userA.topLanguages.join(", ")}
${userA.deepContext ? `Deep Context:\n${userA.deepContext.slice(0, 5000)}` : ""}

User B (@${userB.username}):
${userB.publicRepos} repos, ${userB.totalStars} stars, ${userB.followers} followers, ${userB.totalCommits} commits
DevPulse Rank: ${userB.rank}
Percentiles: Stars (${userB.percentiles.stars}%), Commits (${userB.percentiles.commits}%), Followers (${userB.percentiles.followers}%), Code Quality (${userB.percentiles.quality}%), Impact (${userB.percentiles.impact}%)
Top Languages: ${userB.topLanguages.join(", ")}
${userB.deepContext ? `Deep Context:\n${userB.deepContext.slice(0, 5000)}` : ""}

Write a Markdown response with the following exact structure:

[WINNER]: <username of winner>

[A sharp, witty 2-sentence summary declaring a clear winner and why. No ties allowed. Do NOT include a heading like "The Verdict", just write the paragraph.]

| Category | @${userA.username} | @${userB.username} | Winner |
|----------|-------------------|-------------------|--------|
| Stars | ... | ... | ... |
| Commits | ... | ... | ... |
| Followers | ... | ... | ... |
| Code Quality | ... | ... | ... |
| Impact | ... | ... | ... |

[One short paragraph roasting the loser based on their stats or deep context. Do NOT include a heading like "The Roast", just write the paragraph.]

IMPORTANT RULES:
- If you see "API rate limit exceeded" or similar errors in the Deep Context, IGNORE IT. Do NOT mention API limits or errors.
- Keep the table cell contents EXTREMELY BRIEF—max 2 to 4 words per cell!
- Do not use generic words like "Low" or "High", but also avoid overly obscure slang. Use clear, descriptive 2-4 word phrases (e.g., "Solid Architecture", "Needs Work", "Strong Presence", "Barely Active", "Impressive Impact").
- The 'Winner' column MUST logically match whoever has the better descriptive phrase/percentile for that specific row. Do NOT declare someone the winner of a row if their performance is worse!
- DO NOT explicitly use the phrase "Deep Score". Talk about "Code Quality" or "Architecture" instead.`

  const res = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    max_tokens: 600,
    temperature: 0.7,
  })
  return res.choices[0]?.message?.content?.trim() ?? ""
}
