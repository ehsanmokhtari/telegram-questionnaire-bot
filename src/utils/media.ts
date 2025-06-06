import type { MediaType } from "@prisma/client"
import type { Message } from "grammy/types"
import logger from "./logger"

export class MediaUtils {
  static getMediaFromMessage(message: Message): { fileId: string; fileName?: string; type: MediaType } | null {
    try {
      if (message.photo && message.photo.length > 0) {
        // Get the highest resolution photo
        const photo = message.photo[message.photo.length - 1]
        return {
          fileId: photo.file_id,
          type: "IMAGE" as MediaType,
        }
      }

      if (message.video) {
        return {
          fileId: message.video.file_id,
          fileName: message.video.file_name,
          type: "VIDEO" as MediaType,
        }
      }

      if (message.audio) {
        return {
          fileId: message.audio.file_id,
          fileName: message.audio.file_name || message.audio.title,
          type: "AUDIO" as MediaType,
        }
      }

      if (message.voice) {
        return {
          fileId: message.voice.file_id,
          type: "AUDIO" as MediaType,
        }
      }

      if (message.document) {
        return {
          fileId: message.document.file_id,
          fileName: message.document.file_name,
          type: "DOCUMENT" as MediaType,
        }
      }

      return null
    } catch (error) {
      logger.error("Error extracting media from message:", error)
      return null
    }
  }

  static async sendMedia(ctx: any, mediaType: MediaType, fileId: string, caption?: string) {
    try {
      const options = caption ? { caption } : {}

      switch (mediaType) {
        case "IMAGE":
          await ctx.replyWithPhoto(fileId, options)
          break
        case "VIDEO":
          await ctx.replyWithVideo(fileId, options)
          break
        case "AUDIO":
          await ctx.replyWithAudio(fileId, options)
          break
        case "DOCUMENT":
          await ctx.replyWithDocument(fileId, options)
          break
        default:
          logger.warn(`Unknown media type: ${mediaType}`)
      }
    } catch (error) {
      logger.error("Error sending media:", error)
      await ctx.reply("❌ Error sending media file.")
    }
  }

  static getMediaTypeIcon(mediaType: MediaType): string {
    switch (mediaType) {
      case "IMAGE":
        return "🖼️"
      case "VIDEO":
        return "🎥"
      case "AUDIO":
        return "🎵"
      case "DOCUMENT":
        return "📄"
      default:
        return "📎"
    }
  }

  static getQuestionTypeIcon(questionType: QuestionType): string {
    switch (questionType) {
      case "TEXT":
        return "📝"
      case "SINGLE_CHOICE":
        return "🔘"
      case "MULTIPLE_CHOICE":
        return "☑️"
      case "FILE_UPLOAD":
        return "📎"
      case "IMAGE_UPLOAD":
        return "🖼️"
      case "VIDEO_UPLOAD":
        return "🎥"
      case "AUDIO_UPLOAD":
        return "🎵"
      default:
        return "❓"
    }
  }
}

type QuestionType =
  | "TEXT"
  | "SINGLE_CHOICE"
  | "MULTIPLE_CHOICE"
  | "FILE_UPLOAD"
  | "IMAGE_UPLOAD"
  | "VIDEO_UPLOAD"
  | "AUDIO_UPLOAD"
