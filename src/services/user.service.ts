import type { User } from "@prisma/client"
import prisma from "../database/prisma"
import { config } from "../config"
import logger from "../utils/logger"

export class UserService {
  static async findOrCreate(
    id: number,
    data: {
      username?: string
      firstName: string
      lastName?: string
    },
  ): Promise<User> {
    try {
      const isAdmin = config.adminIds.includes(id)

      return await prisma.user.upsert({
        where: { id: BigInt(id) },
        update: {
          username: data.username,
          firstName: data.firstName,
          lastName: data.lastName,
        },
        create: {
          id: BigInt(id),
          username: data.username,
          firstName: data.firstName,
          lastName: data.lastName,
          isAdmin,
        },
      })
    } catch (error) {
      logger.error("Error in findOrCreate user:", error)
      throw error
    }
  }

  static async isAdmin(userId: number): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: BigInt(userId) },
      select: { isAdmin: true },
    })
    return user?.isAdmin || false
  }
}
