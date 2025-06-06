import type { MyConversation } from "../types"
import { QuestionnaireService } from "../services/questionnaire.service"
import { QuestionType } from "@prisma/client"
import type { CreateQuestionData } from "../types"
import { InlineKeyboard } from "grammy"
import { MediaUtils } from "../utils/media"
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
        .text("📝 Text Input", "type_text")
        .row()
        .text("🔘 Single Choice", "type_single")
        .row()
        .text("☑️ Multiple Choice", "type_multiple")
        .row()
        .text("📎 File Upload", "type_file")
        .row()
        .text("🖼️ Image Upload", "type_image")
        .row()
        .text("🎥 Video Upload", "type_video")
        .row()
        .text("🎵 Audio Upload", "type_audio")

      await ctx.reply("Select the question type:", { reply_markup: typeKeyboard })
      const typeCtx = await conversation.waitForCallbackQuery(/^type_/)
      await typeCtx.answerCallbackQuery()

      const typeMap: Record<string, QuestionType> = {
        type_text: QuestionType.TEXT,
        type_single: QuestionType.SINGLE_CHOICE,
        type_multiple: QuestionType.MULTIPLE_CHOICE,
        type_file: QuestionType.FILE_UPLOAD,
        type_image: QuestionType.IMAGE_UPLOAD,
        type_video: QuestionType.VIDEO_UPLOAD,
        type_audio: QuestionType.AUDIO_UPLOAD,
      }

      const type = typeMap[typeCtx.callbackQuery.data]
      const question: CreateQuestionData = {
        text: questionText,
        type,
      }

      // Ask if question is required
      const requiredKeyboard = new InlineKeyboard()
        .text("✅ Required", "required_yes")
        .text("⭕ Optional", "required_no")

      await ctx.reply("Is this question required?", { reply_markup: requiredKeyboard })
      const requiredCtx = await conversation.waitForCallbackQuery(/^required_/)
      await requiredCtx.answerCallbackQuery()

      question.isRequired = requiredCtx.callbackQuery.data === "required_yes"

      // Ask for media attachment to question
      const mediaKeyboard = new InlineKeyboard().text("📎 Add Media", "media_yes").text("⏭️ Skip", "media_no")

      await ctx.reply("Do you want to add an image, video, audio, or document to this question?", {
        reply_markup: mediaKeyboard,
      })
      const mediaCtx = await conversation.waitForCallbackQuery(/^media_/)
      await mediaCtx.answerCallbackQuery()

      if (mediaCtx.callbackQuery.data === "media_yes") {
        await ctx.reply("Please send the media file (image, video, audio, or document):")
        const mediaMessage = await conversation.waitFor(":media")

        const mediaInfo = MediaUtils.getMediaFromMessage(mediaMessage.message)
        if (mediaInfo) {
          question.mediaType = mediaInfo.type
          question.mediaFileId = mediaInfo.fileId
          question.mediaFileName = mediaInfo.fileName
          await ctx.reply(
            `✅ Media attached: ${MediaUtils.getMediaTypeIcon(mediaInfo.type)} ${mediaInfo.fileName || "File"}`,
          )
        } else {
          await ctx.reply("❌ No valid media found. Continuing without media.")
        }
      }

      // If choice question, ask for options
      if (type === QuestionType.SINGLE_CHOICE || type === QuestionType.MULTIPLE_CHOICE) {
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
      const moreKeyboard = new InlineKeyboard().text("➕ Add Another Question", "add_more").text("✅ Finish", "finish")

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

    let summary = `✅ Questionnaire "${questionnaire.title}" created successfully!\n\n`
    summary += `ID: \`${questionnaire.id}\`\n`
    summary += `Questions: ${questions.length}\n\n`
    summary += `Question Summary:\n`

    questions.forEach((q, index) => {
      const icon = MediaUtils.getQuestionTypeIcon(q.type)
      const required = q.isRequired ? "✅" : "⭕"
      const media = q.mediaType ? ` ${MediaUtils.getMediaTypeIcon(q.mediaType)}` : ""
      summary += `${index + 1}. ${icon} ${q.text.substring(0, 30)}... ${required}${media}\n`
    })

    summary += `\nUse /send ${questionnaire.id} to share it!`

    await ctx.reply(summary, { parse_mode: "Markdown" })
  } catch (error) {
    logger.error("Error in create questionnaire conversation:", error)
    await ctx.reply("❌ An error occurred while creating the questionnaire. Please try again.")
  }
}
