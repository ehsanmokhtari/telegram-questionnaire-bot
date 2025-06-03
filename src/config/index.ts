import dotenv from "dotenv"

dotenv.config()

export const config = {
  botToken: process.env.BOT_TOKEN!,
  databaseUrl: process.env.DATABASE_URL!,
  nodeEnv: process.env.NODE_ENV || "development",
  adminIds: process.env.ADMIN_IDS?.split(",").map((id) => Number.parseInt(id.trim())) || [],
} as const

if (!config.botToken) {
  throw new Error("BOT_TOKEN is required")
}

if (!config.databaseUrl) {
  throw new Error("DATABASE_URL is required")
}
