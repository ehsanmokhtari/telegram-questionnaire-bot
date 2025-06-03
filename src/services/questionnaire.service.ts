import type { Questionnaire } from "@prisma/client"
import prisma from "../database/prisma"
import type { CreateQuestionnaireData, QuestionnaireWithDetails } from "../types"
import logger from "../utils/logger"

export class QuestionnaireService {
  static async create(creatorId: number, data: CreateQuestionnaireData): Promise<Questionnaire> {
    try {
      return await prisma.questionnaire.create({
        data: {
          title: data.title,
          description: data.description,
          creatorId: BigInt(creatorId),
          questions: {
            create: data.questions.map((q, index) => ({
              text: q.text,
              type: q.type,
              order: index,
              isRequired: q.isRequired ?? true,
              options: q.options
                ? {
                    create: q.options.map((opt, optIndex) => ({
                      text: opt,
                      order: optIndex,
                    })),
                  }
                : undefined,
            })),
          },
        },
        include: {
          questions: {
            include: { options: true },
            orderBy: { order: "asc" },
          },
        },
      })
    } catch (error) {
      logger.error("Error creating questionnaire:", error)
      throw error
    }
  }

  static async findById(id: string): Promise<QuestionnaireWithDetails | null> {
    const questionnaire = await prisma.questionnaire.findUnique({
      where: { id },
      include: {
        questions: {
          include: { options: { orderBy: { order: "asc" } } },
          orderBy: { order: "asc" },
        },
      },
    })

    return questionnaire
  }

  static async findByCreator(creatorId: number): Promise<Questionnaire[]> {
    return await prisma.questionnaire.findMany({
      where: { creatorId: BigInt(creatorId) },
      orderBy: { createdAt: "desc" },
    })
  }

  static async findAll(): Promise<Questionnaire[]> {
    return await prisma.questionnaire.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    })
  }

  static async toggleActive(id: string): Promise<Questionnaire> {
    const questionnaire = await prisma.questionnaire.findUnique({
      where: { id },
    })

    if (!questionnaire) {
      throw new Error("Questionnaire not found")
    }

    return await prisma.questionnaire.update({
      where: { id },
      data: { isActive: !questionnaire.isActive },
    })
  }
}
