import type { MyConversation } from "../types"
import { QuestionnaireService } from "../services/questionnaire.service"
import { ResponseService } from "../services/response.service"
import { QuestionType } from "@prisma/client"
import { InlineKeyboard } from "grammy"
import logger from "../utils/logger"

export async function answerQuestionnaireConversation(conversation: MyConversation, ctx: any, questionnaireId: string) {
  try {
    const questionnaire = await QuestionnaireService.findById(questionnaireId)

    if (!questionnaire) {
      await ctx.reply("❌ Questionnaire not found.")
      return
    }

    if (!questionnaire.questions.length) {
      await ctx.reply("❌ This questionnaire has no questions.")
      return
    }

    // Create or get response
    const response = await ResponseService.createOrGet(questionnaireId, ctx.from!.id)

    await ctx.reply(
      `📋 *${questionnaire.title}*\n\n` +
        `${questionnaire.description || "No description"}\n\n` +
        `Questions: ${questionnaire.questions.length}`,
      { parse_mode: "Markdown" },
    )

    // Answer each question
    for (const [index, question] of questionnaire.questions.entries()) {
      await ctx.reply(`*Question ${index + 1}/${questionnaire.questions.length}*\n\n${question.text}`, {
        parse_mode: "Markdown",
      })

      if (question.type === QuestionType.TEXT) {
        const answer = await conversation.form.text()
        await ResponseService.saveAnswer(response.id, question.id, {
          textValue: answer,
        })
      } else if (question.type === QuestionType.SINGLE_CHOICE) {
        const keyboard = new InlineKeyboard()
        question.options.forEach((option) => {
          keyboard.text(option.text, `opt_${option.id}`).row()
        })

        await ctx.reply("Select one option:", { reply_markup: keyboard })
        const optionCtx = await conversation.waitForCallbackQuery(/^opt_/)
        await optionCtx.answerCallbackQuery()

        const selectedOptionId = optionCtx.callbackQuery.data.replace("opt_", "")
        const selectedOption = question.options.find((o) => o.id === selectedOptionId)

        await ctx.reply(`You selected: ${selectedOption?.text}`)
        await ResponseService.saveAnswer(response.id, question.id, {
          optionIds: [selectedOptionId],
        })
      } else if (question.type === QuestionType.MULTIPLE_CHOICE) {
        const selectedOptions: string[] = []
        const keyboard = new InlineKeyboard()

        const updateKeyboard = () => {
          keyboard.raw = []
          question.options.forEach((option) => {
            const isSelected = selectedOptions.includes(option.id)
            keyboard.text(`${isSelected ? "✅ " : ""}${option.text}`, `multi_${option.id}`).row()
          })
          keyboard.text("✓ Done", "multi_done").row()
        }

        updateKeyboard()
        const message = await ctx.reply("Select multiple options:", { reply_markup: keyboard })

        let selecting = true
        while (selecting) {
          const multiCtx = await conversation.waitForCallbackQuery(/^multi_/)
          await multiCtx.answerCallbackQuery()

          if (multiCtx.callbackQuery.data === "multi_done") {
            if (selectedOptions.length === 0) {
              await ctx.reply("Please select at least one option.")
              continue
            }
            selecting = false
          } else {
            const optionId = multiCtx.callbackQuery.data.replace("multi_", "")
            if (selectedOptions.includes(optionId)) {
              selectedOptions.splice(selectedOptions.indexOf(optionId), 1)
            } else {
              selectedOptions.push(optionId)
            }

            updateKeyboard()
            await ctx.api.editMessageReplyMarkup(ctx.chat!.id, message.message_id, { reply_markup: keyboard })
          }
        }

        await ResponseService.saveAnswer(response.id, question.id, {
          optionIds: selectedOptions,
        })
      }
    }

    // Mark response as complete
    await ResponseService.complete(response.id)

    await ctx.reply("✅ Thank you for completing the questionnaire!\n\n" + "Your responses have been saved.")
  } catch (error) {
    logger.error("Error in answer questionnaire conversation:", error)
    await ctx.reply("❌ An error occurred while answering the questionnaire. Please try again.")
  }
}
