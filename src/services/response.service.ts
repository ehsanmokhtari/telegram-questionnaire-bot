import type { Response, Answer, MediaType } from "@prisma/client"
import prisma from "../database/prisma"
import logger from "../utils/logger"

export class ResponseService {
  static async createOrGet(questionnaireId: string, userId: number): Promise<Response> {
    try {
      return await prisma.response.upsert({
        where: {
          questionnaireId_userId: {
            questionnaireId,
            userId: BigInt(userId),
          },
        },
        create: {
          questionnaireId,
          userId: BigInt(userId),
        },
        update: {},
      })
    } catch (error) {
      logger.error("Error creating response:", error)
      throw error
    }
  }

  static async saveAnswer(
    responseId: string,
    questionId: string,
    data: {
      textValue?: string
      optionIds?: string[]
      mediaType?: MediaType
      mediaFileId?: string
      mediaFileName?: string
    },
  ): Promise<Answer> {
    try {
      return await prisma.answer.upsert({
        where: {
          responseId_questionId: {
            responseId,
            questionId,
          },
        },
        create: {
          responseId,
          questionId,
          textValue: data.textValue,
          optionIds: data.optionIds || [],
          mediaType: data.mediaType,
          mediaFileId: data.mediaFileId,
          mediaFileName: data.mediaFileName,
        },
        update: {
          textValue: data.textValue,
          optionIds: data.optionIds || [],
          mediaType: data.mediaType,
          mediaFileId: data.mediaFileId,
          mediaFileName: data.mediaFileName,
        },
      })
    } catch (error) {
      logger.error("Error saving answer:", error)
      throw error
    }
  }

  static async complete(responseId: string): Promise<Response> {
    return await prisma.response.update({
      where: { id: responseId },
      data: { completedAt: new Date() },
    })
  }

  static async getResults(questionnaireId: string) {
    const responses = await prisma.response.findMany({
      where: { questionnaireId },
      include: {
        user: true,
        answers: {
          include: {
            question: {
              include: { options: true },
            },
          },
        },
      },
    })

    const questionnaire = await prisma.questionnaire.findUnique({
      where: { id: questionnaireId },
      include: {
        questions: {
          include: { options: true },
          orderBy: { order: "asc" },
        },
      },
    })

    return { questionnaire, responses }
  }

  static async getUserResponses(userId: number) {
    return await prisma.response.findMany({
      where: { userId: BigInt(userId) },
      include: {
        questionnaire: true,
      },
      orderBy: { createdAt: "desc" },
    })
  }
}
