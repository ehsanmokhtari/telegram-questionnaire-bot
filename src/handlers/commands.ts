import type { MyContext } from "../types"
import { UserService } from "../services/user.service"
import { QuestionnaireService } from "../services/questionnaire.service"
import { ResponseService } from "../services/response.service"
import { InlineKeyboard } from "grammy"
import logger from "../utils/logger"
import { MediaUtils } from "../utils/media"
import { QuestionType } from "@prisma/client"

export async function handleStart(ctx: MyContext) {
  try {
    const user = ctx.from!
    await UserService.findOrCreate(user.id, {
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
    })

    await ctx.reply(
      "👋 Welcome to the Questionnaire Bot!\n\n" +
        "Available commands:\n" +
        "/new - Create a new questionnaire\n" +
        "/list - List all questionnaires\n" +
        "/my - List your questionnaires\n" +
        "/send <id> - Send a questionnaire\n" +
        "/answer <id> - Answer a questionnaire\n" +
        "/results <id> - View results\n" +
        "/help - Show this help message",
    )
  } catch (error) {
    logger.error("Error in start command:", error)
    await ctx.reply("❌ An error occurred. Please try again.")
  }
}

export async function handleNew(ctx: MyContext) {
  try {
    await ctx.conversation.enter("createQuestionnaire")
  } catch (error) {
    logger.error("Error in new command:", error)
    await ctx.reply("❌ An error occurred. Please try again.")
  }
}

export async function handleList(ctx: MyContext) {
  try {
    const questionnaires = await QuestionnaireService.findAll()

    if (questionnaires.length === 0) {
      await ctx.reply("No questionnaires available.")
      return
    }

    let message = "📋 *Available Questionnaires:*\n\n"
    questionnaires.forEach((q, index) => {
      message += `${index + 1}. *${q.title}*\n`
      message += `   ID: \`${q.id}\`\n`
      message += `   Created: ${q.createdAt.toLocaleDateString()}\n\n`
    })

    await ctx.reply(message, { parse_mode: "Markdown" })
  } catch (error) {
    logger.error("Error in list command:", error)
    await ctx.reply("❌ An error occurred. Please try again.")
  }
}

export async function handleMy(ctx: MyContext) {
  try {
    const questionnaires = await QuestionnaireService.findByCreator(ctx.from!.id)

    if (questionnaires.length === 0) {
      await ctx.reply("You haven't created any questionnaires yet. Use /new to create one!")
      return
    }

    let message = "📋 *Your Questionnaires:*\n\n"
    questionnaires.forEach((q, index) => {
      message += `${index + 1}. *${q.title}*\n`
      message += `   ID: \`${q.id}\`\n`
      message += `   Status: ${q.isActive ? "✅ Active" : "❌ Inactive"}\n`
      message += `   Created: ${q.createdAt.toLocaleDateString()}\n\n`
    })

    await ctx.reply(message, { parse_mode: "Markdown" })
  } catch (error) {
    logger.error("Error in my command:", error)
    await ctx.reply("❌ An error occurred. Please try again.")
  }
}

export async function handleSend(ctx: MyContext) {
  try {
    const args = ctx.message?.text?.split(" ")
    if (!args || args.length < 2) {
      await ctx.reply("Usage: /send <questionnaire_id>")
      return
    }

    const questionnaireId = args[1]
    const questionnaire = await QuestionnaireService.findById(questionnaireId)

    if (!questionnaire) {
      await ctx.reply("❌ Questionnaire not found.")
      return
    }

    const keyboard = new InlineKeyboard().text("📝 Answer Now", `answer_${questionnaireId}`)

    await ctx.reply(
      `📋 *${questionnaire.title}*\n\n` +
        `${questionnaire.description || "No description"}\n\n` +
        `Questions: ${questionnaire.questions.length}\n\n` +
        `Click the button below to start answering!`,
      {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      },
    )
  } catch (error) {
    logger.error("Error in send command:", error)
    await ctx.reply("❌ An error occurred. Please try again.")
  }
}

export async function handleAnswer(ctx: MyContext) {
  try {
    const args = ctx.message?.text?.split(" ")
    if (!args || args.length < 2) {
      await ctx.reply("Usage: /answer <questionnaire_id>")
      return
    }

    const questionnaireId = args[1]
    ctx.session.currentQuestionnaireId = questionnaireId
    await ctx.conversation.enter("answerQuestionnaire")
  } catch (error) {
    logger.error("Error in answer command:", error)
    await ctx.reply("❌ An error occurred. Please try again.")
  }
}

export async function handleResults(ctx: MyContext) {
  try {
    const args = ctx.message?.text?.split(" ")
    if (!args || args.length < 2) {
      await ctx.reply("Usage: /results <questionnaire_id>")
      return
    }

    const questionnaireId = args[1]
    const results = await ResponseService.getResults(questionnaireId)

    if (!results.questionnaire) {
      await ctx.reply("❌ Questionnaire not found.")
      return
    }

    // Check if user is admin or creator
    const isAdmin = await UserService.isAdmin(ctx.from!.id)
    const isCreator = results.questionnaire.creatorId === BigInt(ctx.from!.id)

    if (!isAdmin && !isCreator) {
      await ctx.reply("❌ You don't have permission to view these results.")
      return
    }

    let message = `📊 *Results for "${results.questionnaire.title}"*\n\n`
    message += `Total responses: ${results.responses.length}\n`
    message += `Completed: ${results.responses.filter((r) => r.completedAt).length}\n\n`

    // Aggregate results by question
    for (const question of results.questionnaire.questions) {
      const icon = MediaUtils.getQuestionTypeIcon(question.type)
      const required = question.isRequired ? "✅" : "⭕"
      const media = question.mediaType ? ` ${MediaUtils.getMediaTypeIcon(question.mediaType)}` : ""

      message += `*${icon} ${question.text}* ${required}${media}\n`

      if (question.type === "TEXT") {
        const answers = results.responses
          .flatMap((r) => r.answers)
          .filter((a) => a.questionId === question.id && a.textValue)
          .slice(0, 5)

        if (answers.length > 0) {
          message += "Sample responses:\n"
          answers.forEach((a) => {
            message += `• ${a.textValue}\n`
          })
        } else {
          message += "No responses yet\n"
        }
      } else if (
        [
          QuestionType.FILE_UPLOAD,
          QuestionType.IMAGE_UPLOAD,
          QuestionType.VIDEO_UPLOAD,
          QuestionType.AUDIO_UPLOAD,
        ].includes(question.type)
      ) {
        const mediaAnswers = results.responses
          .flatMap((r) => r.answers)
          .filter((a) => a.questionId === question.id && a.mediaFileId)

        message += `Media files received: ${mediaAnswers.length}\n`
        mediaAnswers.slice(0, 3).forEach((a) => {
          const mediaIcon = a.mediaType ? MediaUtils.getMediaTypeIcon(a.mediaType) : "📎"
          message += `• ${mediaIcon} ${a.mediaFileName || "File"}\n`
        })
        if (mediaAnswers.length > 3) {
          message += `... and ${mediaAnswers.length - 3} more\n`
        }
      } else {
        // Count option selections
        const optionCounts = new Map<string, number>()
        question.options.forEach((opt) => optionCounts.set(opt.id, 0))

        results.responses.forEach((response) => {
          const answer = response.answers.find((a) => a.questionId === question.id)
          if (answer) {
            answer.optionIds.forEach((optId) => {
              optionCounts.set(optId, (optionCounts.get(optId) || 0) + 1)
            })
          }
        })

        question.options.forEach((option) => {
          const count = optionCounts.get(option.id) || 0
          const percentage = results.responses.length > 0 ? Math.round((count / results.responses.length) * 100) : 0
          message += `• ${option.text}: ${count} (${percentage}%)\n`
        })
      }

      message += "\n"
    }

    // Split message if too long
    if (message.length > 4000) {
      const chunks = message.match(/.{1,4000}/g) || []
      for (const chunk of chunks) {
        await ctx.reply(chunk, { parse_mode: "Markdown" })
      }
    } else {
      await ctx.reply(message, { parse_mode: "Markdown" })
    }
  } catch (error) {
    logger.error("Error in results command:", error)
    await ctx.reply("❌ An error occurred. Please try again.")
  }
}

export async function handleHelp(ctx: MyContext) {
  await ctx.reply(
    "📚 *Questionnaire Bot Help*\n\n" +
      "*Commands:*\n" +
      "/new - Create a new questionnaire\n" +
      "/list - List all active questionnaires\n" +
      "/my - List your created questionnaires\n" +
      "/send <id> - Send a questionnaire to current chat\n" +
      "/answer <id> - Answer a questionnaire\n" +
      "/results <id> - View questionnaire results (creator/admin only)\n" +
      "/help - Show this help message\n\n" +
      "*Question Types:*\n" +
      "• Text Input - Free text response\n" +
      "• Single Choice - Select one option\n" +
      "• Multiple Choice - Select multiple options\n\n" +
      "*Tips:*\n" +
      "• Copy questionnaire IDs to share them\n" +
      "• Use inline buttons for easier interaction\n" +
      "• Creators can view results of their questionnaires",
    { parse_mode: "Markdown" },
  )
}
