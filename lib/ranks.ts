export const RANKS = [
  { name: "Iron 1", img: "3624-valorant-iron-1.png", threshold: 10, color: "#4f5154" },
  { name: "Iron 2", img: "7351-valorant-iron-2.png", threshold: 25, color: "#4f5154" },
  { name: "Iron 3", img: "1854-valorant-iron-3.png", threshold: 50, color: "#4f5154" },
  { name: "Bronze 1", img: "4159-valorant-bronze-1.png", threshold: 100, color: "#8b6539" },
  { name: "Bronze 2", img: "4376-valorant-bronze-2.png", threshold: 150, color: "#8b6539" },
  { name: "Bronze 3", img: "4590-valorant-bronze-3.png", threshold: 200, color: "#8b6539" },
  { name: "Silver 1", img: "6335-valorant-silver-1.png", threshold: 300, color: "#a5a9b0" },
  { name: "Silver 2", img: "8138-valorant-silver-2.png", threshold: 450, color: "#a5a9b0" },
  { name: "Silver 3", img: "3293-valorant-silver-3.png", threshold: 600, color: "#a5a9b0" },
  { name: "Gold 1", img: "5533-valorant-gold-1.png", threshold: 800, color: "#d2b350" },
  { name: "Gold 2", img: "2060-valorant-gold-2.png", threshold: 1000, color: "#d2b350" },
  { name: "Gold 3", img: "3293-valorant-gold-3.png", threshold: 1500, color: "#d2b350" },
  { name: "Platinum 1", img: "4590-valorant-platinum-1.png", threshold: 2000, color: "#259ba8" },
  { name: "Platinum 2", img: "3255-valorant-platinum-2.png", threshold: 3000, color: "#259ba8" },
  { name: "Platinum 3", img: "5816-valorant-platinum-3.png", threshold: 4000, color: "#259ba8" },
  { name: "Diamond 1", img: "4590-valorant-diamond-1.png", threshold: 5500, color: "#9c7df6" },
  { name: "Diamond 2", img: "3939-valorant-diamond-2.png", threshold: 7500, color: "#9c7df6" },
  { name: "Diamond 3", img: "6354-valorant-diamond-3.png", threshold: 10000, color: "#9c7df6" },
  { name: "Ascendant 1", img: "4590-valorant-ascendant-1.png", threshold: 15000, color: "#21b184" },
  { name: "Ascendant 2", img: "8376-valorant-ascendant-2.png", threshold: 20000, color: "#21b184" },
  { name: "Ascendant 3", img: "2309-valorant-ascendant-3.png", threshold: 25000, color: "#21b184" },
  { name: "Immortal 1", img: "1518-valorant-immortal-1.png", threshold: 35000, color: "#b93444" },
  { name: "Immortal 2", img: "1775-valorant-immortal-2.png", threshold: 50000, color: "#b93444" },
  { name: "Immortal 3", img: "5979-valorant-immortal-3.png", threshold: 75000, color: "#b93444" },
  { name: "RADIANT", img: "5979-valorant-radiant.png", threshold: Infinity, color: "#ffffaa" },
]

export function getRankInfo(user: any, repoData: any) {
  if (!user || !repoData) return { score: 0, rank: RANKS[0] }
  
  let score = 0;
  if (user.deepAnalysisStatus === "COMPLETED" && user.deepScore != null) {
    score = user.deepScore;
  } else {
    score = (repoData.totalStars * 10) + ((user.followers ?? 0) * 5) + ((repoData.totalForks ?? 0) * 2) + ((user.publicRepos ?? user.public_repos ?? 0) * 1);
  }
  
  const rank = RANKS.find(r => score <= r.threshold) || RANKS[RANKS.length - 1];
  return { score, rank };
}
