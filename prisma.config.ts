import { defineConfig } from "prisma/config"

// Load .env locally; on Vercel DATABASE_URL is injected as env var
try {
  // @ts-expect-error — dotenv may not have types but it ships with prisma
  await import("dotenv/config")
} catch {
  // not available or already loaded — fine
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
})
