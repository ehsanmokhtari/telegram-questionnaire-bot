import type { MyContext } from "../types"
import { UserService } from "../services/user.service"

export async function authMiddleware(ctx: MyContext, next: () => Promise<void>) {
  if (ctx.from) {
    await UserService.findOrCreate(ctx.from.id, {
      username: ctx.from.username,
      firstName: ctx.from.first_name,
      lastName: ctx.from.last_name,
    })
  }
  await next()
}
