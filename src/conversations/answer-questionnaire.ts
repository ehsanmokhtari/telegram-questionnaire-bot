import type { MyConversation } from "../types"
import { QuestionnaireService } from "../services/questionnaire.service"
import { ResponseService } from "../services/response.service"
import { QuestionType } from "@prisma/client"
import { InlineKeyboard } from "grammy"
import { MediaUtils } from "../utils/media"
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
      const requiredText = question.isRequired ? "✅ Required" : "⭕ Optional"
      const questionMessage = `*Question ${index + 1}/${questionnaire.questions.length}* (${requiredText})\n\n${question.text}`

      // Show media if attached to question
      if (question.mediaType && question.mediaFileId) {
        await MediaUtils.sendMedia(ctx, question.mediaType, question.mediaFileId, questionMessage)
      } else {
        await ctx.reply(questionMessage, { parse_mode: "Markdown" })
      }

      if (question.type === QuestionType.TEXT) {
        if (question.isRequired) {
          const answer = await conversation.form.text()
          await ResponseService.saveAnswer(response.id, question.id, {
            textValue: answer,
          })
        } else {
          const skipKeyboard = new InlineKeyboard().text("⏭️ Skip", "skip_question")
          await ctx.reply("Enter your text answer or skip:", { reply_markup: skipKeyboard })

          const answerCtx = await conversation.waitFor([":text", "callback_query:skip_question"])

          if (answerCtx.callbackQuery?.data === "skip_question") {
            await answerCtx.answerCallbackQuery("Question skipped")
            continue
          } else if (answerCtx.message?.text) {
            await ResponseService.saveAnswer(response.id, question.id, {
              textValue: answerCtx.message.text,
            })
          }
        }
      } else if (question.type === QuestionType.SINGLE_CHOICE) {
        const keyboard = new InlineKeyboard()
        question.options.forEach((option) => {
          keyboard.text(option.text, `opt_${option.id}`).row()
        })

        if (!question.isRequired) {
          keyboard.text("⏭️ Skip", "skip_question")
        }

        await ctx.reply("Select one option:", { reply_markup: keyboard })
        const optionCtx = await conversation.waitForCallbackQuery(/^(opt_|skip_question)/)
        await optionCtx.answerCallbackQuery()

        if (optionCtx.callbackQuery.data === "skip_question") {
          continue
        }

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
          if (!question.isRequired) {
            keyboard.text("⏭️ Skip", "skip_question").row()
          }
        }

        updateKeyboard()
        const message = await ctx.reply("Select multiple options:", { reply_markup: keyboard })

        let selecting = true
        while (selecting) {
          const multiCtx = await conversation.waitForCallbackQuery(/^(multi_|skip_question)/)
          await multiCtx.answerCallbackQuery()

          if (multiCtx.callbackQuery.data === "skip_question") {
            selecting = false
            continue
          } else if (multiCtx.callbackQuery.data === "multi_done") {
            if (selectedOptions.length === 0 && question.isRequired) {
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

        if (selectedOptions.length > 0) {
          await ResponseService.saveAnswer(response.id, question.id, {
            optionIds: selectedOptions,
          })
        }
      } else if (
        [
          QuestionType.FILE_UPLOAD,
          QuestionType.IMAGE_UPLOAD,
          QuestionType.VIDEO_UPLOAD,
          QuestionType.AUDIO_UPLOAD,
        ].includes(question.type)
      ) {
        const mediaTypeMap = {
          [QuestionType.FILE_UPLOAD]: "document",
          [QuestionType.IMAGE_UPLOAD]: "image",
          [QuestionType.VIDEO_UPLOAD]: "video",
          [QuestionType.AUDIO_UPLOAD]: "audio",
        }

        const expectedType = mediaTypeMap[question.type]
        const promptMessage = `Please send a ${expectedType}:`

        if (!question.isRequired) {
          const skipKeyboard = new InlineKeyboard().text("⏭️ Skip", "skip_question")
          await ctx.reply(promptMessage, { reply_markup: skipKeyboard })

          const mediaCtx = await conversation.waitFor([":media", "callback_query:skip_question"])

          if (mediaCtx.callbackQuery?.data === "skip_question") {
            await mediaCtx.answerCallbackQuery("Question skipped")
            continue
          } else if (mediaCtx.message) {
            const mediaInfo = MediaUtils.getMediaFromMessage(mediaCtx.message)
            if (mediaInfo) {
              await ResponseService.saveAnswer(response.id, question.id, {
                mediaType: mediaInfo.type,
                mediaFileId: mediaInfo.fileId,
                mediaFileName: mediaInfo.fileName,
              })
              await ctx.reply(`✅ ${MediaUtils.getMediaTypeIcon(mediaInfo.type)} File received!`)
            } else {
              await ctx.reply("❌ Invalid file type. Please try again.")
              continue
            }
          }
        } else {
          await ctx.reply(promptMessage)
          const mediaMessage = await conversation.waitFor(":media")

          const mediaInfo = MediaUtils.getMediaFromMessage(mediaMessage.message)
          if (mediaInfo) {
            await ResponseService.saveAnswer(response.id, question.id, {
              mediaType: mediaInfo.type,
              mediaFileId: mediaInfo.fileId,
              mediaFileName: mediaInfo.fileName,
            })
            await ctx.reply(`✅ ${MediaUtils.getMediaTypeIcon(mediaInfo.type)} File received!`)
          } else {
            await ctx.reply("❌ Invalid file type. Please try again.")
            continue
          }
        }
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
