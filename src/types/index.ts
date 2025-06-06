import type { Conversation, ConversationFlavor } from "@grammyjs/conversations"
import type { Context as BaseContext, SessionFlavor } from "grammy"
import type { QuestionType, MediaType } from "@prisma/client"

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
  mediaType?: MediaType
  mediaFileId?: string
  mediaFileName?: string
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
    mediaType: MediaType | null
    mediaFileId: string | null
    mediaFileName: string | null
    options: {
      id: string
      text: string
      order: number
    }[]
  }[]
}

export interface MediaFile {
  fileId: string
  fileName?: string
  type: MediaType
}
