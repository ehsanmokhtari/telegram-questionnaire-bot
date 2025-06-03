import type { Conversation, ConversationFlavor } from "@grammyjs/conversations"
import type { Context as BaseContext, SessionFlavor } from "grammy"
import type { QuestionType } from "@prisma/client"

export interface SessionData {
  currentQuestionnaireId?: string
  currentResponseId?: string
  step?: number
}

export type MyContext = BaseContext & SessionFlavor<SessionData> & ConversationFlavor
export type MyConversation = Conversation<MyContext>

export interface CreateQuestionnaireData {
  title: string
  description?: string
  questions: CreateQuestionData[]
}

export interface CreateQuestionData {
  text: string
  type: QuestionType
  options?: string[]
  isRequired?: boolean
}

export interface QuestionnaireWithDetails {
  id: string
  title: string
  description: string | null
  questions: {
    id: string
    text: string
    type: QuestionType
    order: number
    isRequired: boolean
    options: {
      id: string
      text: string
      order: number
    }[]
  }[]
}
