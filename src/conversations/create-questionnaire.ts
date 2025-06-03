import type { MyConversation } from "../types"
import { QuestionnaireService } from "../services/questionnaire.service"
import { QuestionType } from "@prisma/client"
import type { CreateQuestionData } from "../types"
import { InlineKeyboard } from "grammy"
import logger from "../utils/logger"

export async function createQuestionnaireConversation(conversation: MyConversation, ctx: any) {
  try {
    await ctx.reply("Let's create a new questionnaire! First, what's the title?")

    const title = await conversation.form.text()

    await ctx.reply('Great! Now, provide a description (or type "skip" to skip):')
    const descriptionInput = await conversation.form.text()
    const description = descriptionInput.toLowerCase() === "skip" ? undefined : descriptionInput

    const questions: CreateQuestionData[] = []
    let addingQuestions = true

    while (addingQuestions) {
      await ctx.reply(`Question ${questions.length + 1}: Enter the question text:`)
      const questionText = await conversation.form.text()

      // Ask for question type
      const typeKeyboard = new InlineKeyboard()
        .text("Text Input", "type_text")
        .row()
        .text("Single Choice", "type_single")
        .row()
        .text("Multiple Choice", "type_multiple")

      await ctx.reply("Select the question type:", { reply_markup: typeKeyboard })
      const typeCtx = await conversation.waitForCallbackQuery(/^type_/)
      await typeCtx.answerCallbackQuery()

      const typeMap: Record<string, QuestionType> = {
        type_text: QuestionType.TEXT,
        type_single: QuestionType.SINGLE_CHOICE,
        type_multiple: QuestionType.MULTIPLE_CHOICE,
      }

      const type = typeMap[typeCtx.callbackQuery.data]
      const question: CreateQuestionData = {
        text: questionText,
        type,
        isRequired: true,
      }

      // If choice question, ask for options
      if (type !== QuestionType.TEXT) {
        const options: string[] = []
        await ctx.reply('Enter options one by one. Type "done" when finished:')

        let addingOptions = true
        while (addingOptions) {
          await ctx.reply(`Option ${options.length + 1}:`)
          const option = await conversation.form.text()

          if (option.toLowerCase() === "done") {
            if (options.length < 2) {
              await ctx.reply("Please add at least 2 options.")
              continue
            }
            addingOptions = false
          } else {
            options.push(option)
          }
        }

        question.options = options
      }

      questions.push(question)

      // Ask if they want to add more questions
      const moreKeyboard = new InlineKeyboard().text("Add Another Question", "add_more").text("Finish", "finish")

      await ctx.reply("Do you want to add another question?", { reply_markup: moreKeyboard })
      const moreCtx = await conversation.waitForCallbackQuery(/^(add_more|finish)$/)
      await moreCtx.answerCallbackQuery()

      if (moreCtx.callbackQuery.data === "finish") {
        addingQuestions = false
      }
    }

    // Create the questionnaire
    const questionnaire = await QuestionnaireService.create(ctx.from!.id, {
      title,
      description,
      questions,
    })

    await ctx.reply(
      `✅ Questionnaire "${questionnaire.title}" created successfully!\n\n` +
        `ID: \`${questionnaire.id}\`\n` +
        `Questions: ${questions.length}\n\n` +
        `Use /send ${questionnaire.id} to share it!`,
      { parse_mode: "Markdown" },
    )
  } catch (error) {
    logger.error("Error in create questionnaire conversation:", error)
    await ctx.reply("❌ An error occurred while creating the questionnaire. Please try again.")
  }
}
