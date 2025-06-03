import { PrismaClient } from "@prisma/client"
import logger from "../utils/logger"

const prisma = new PrismaClient({
  log: [
    { level: "query", emit: "event" },
    { level: "error", emit: "event" },
    { level: "warn", emit: "event" },
  ],
})

prisma.$on("query", (e) => {
  logger.debug("Query:", e.query)
})

prisma.$on("error", (e) => {
  logger.error("Database error:", e)
})

prisma.$on("warn", (e) => {
  logger.warn("Database warning:", e)
})

export default prisma
