import { Bot, session } from "grammy"
import { conversations, createConversation } from "@grammyjs/conversations"
import { config } from "./config"
import type { MyContext, SessionData } from "./types"
import logger from "./utils/logger"
import { authMiddleware } from "./middleware/auth"
import { errorMiddleware } from "./middleware/error"
import {
  handleStart,
  handleNew,
  handleList,
  handleMy,
  handleSend,
  handleAnswer,
  handleResults,
  handleHelp,
} from "./handlers/commands"
import { createQuestionnaireConversation } from "./conversations/create-questionnaire"
import { answerQuestionnaireConversation } from "./conversations/answer-questionnaire"

// Initialize bot
const bot = new Bot<MyContext>(config.botToken)

// Session middleware
bot.use(
  session({
    initial: (): SessionData => ({}),
  }),
)

// Conversations middleware
bot.use(conversations())

// Register conversations
bot.use(createConversation(createQuestionnaireConversation, "createQuestionnaire"))
bot.use(
  createConversation(async (conversation, ctx) => {
    const questionnaireId = ctx.session.currentQuestionnaireId
    if (questionnaireId) {
      await answerQuestionnaireConversation(conversation, ctx, questionnaireId)
    }
  }, "answerQuestionnaire"),
)

// Middleware
bot.use(authMiddleware)
bot.use(errorMiddleware)

// Command handlers
bot.command("start", handleStart)
bot.command("new", handleNew)
bot.command("list", handleList)
bot.command("my", handleMy)
bot.command("send", handleSend)
bot.command("answer", handleAnswer)
bot.command("results", handleResults)
bot.command("help", handleHelp)

// Callback query handler for answer buttons
bot.callbackQuery(/^answer_/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const questionnaireId = ctx.callbackQuery.data.replace("answer_", "")
  ctx.session.currentQuestionnaireId = questionnaireId
  await ctx.conversation.enter("answerQuestionnaire")
})

// Start bot
bot.start({
  onStart: () => {
    logger.info("Bot started successfully")
  },
})

// Graceful shutdown
process.once("SIGINT", () => bot.stop())
process.once("SIGTERM", () => bot.stop())
