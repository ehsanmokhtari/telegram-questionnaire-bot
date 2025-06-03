import type { MyContext } from "../types"
import logger from "../utils/logger"

export async function errorMiddleware(ctx: MyContext, next: () => Promise<void>) {
  try {
    await next()
  } catch (error) {
    logger.error("Bot error:", error)

    try {
      await ctx.reply(
        "❌ An unexpected error occurred. Please try again later.\n" +
          "If the problem persists, contact the administrator.",
      )
    } catch (replyError) {
      logger.error("Failed to send error message:", replyError)
    }
  }
}
