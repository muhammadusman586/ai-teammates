"use server"

import { auth } from "@clerk/nextjs/server"
import { DaytonaNotFoundError } from "@daytona/sdk"
import { and, eq, inArray } from "drizzle-orm"
import { refresh } from "next/cache"
import type { z } from "zod"

import { db } from "@/db"
import { bots, chatMembers, chats, insertBotSchema } from "@/db/schema"
import { daytona } from "@/lib/daytona"

export async function createBot(input: z.input<typeof insertBotSchema>) {
  const { userId } = await auth.protect()
  // Server Actions are public endpoints: re-validate what the client sent
  const values = insertBotSchema.parse(input)

  const sandbox = await daytona.create()

  // node-postgres has no db.batch (neon-http only); a transaction gives the same all-or-nothing write
  const created = await db
    .transaction(async (tx) => {
      const [bot] = await tx
        .insert(bots)
        .values({ ...values, userId, sandboxId: sandbox.id })
        .returning({ id: bots.id })
      const [chat] = await tx
        .insert(chats)
        .values({ userId, kind: "direct" })
        .returning({ id: chats.id })
      await tx.insert(chatMembers).values({ chatId: chat.id, botId: bot.id })

      return { botId: bot.id, chatId: chat.id }
    })
    .catch(async (error) => {
      // No bot row points at the sandbox, so nothing would ever delete it
      await sandbox.delete()
      throw error
    })

  // The sidebar's chat list is rendered by the layout, so re-render it to show the new chat
  refresh()
  return created
}

export async function updateBot(
  id: string,
  input: z.input<typeof insertBotSchema>
) {
  const { userId } = await auth.protect()
  const values = insertBotSchema.parse(input)

  // Scoped to the owner, so another user's bot id updates nothing
  const [bot] = await db
    .update(bots)
    .set(values)
    .where(and(eq(bots.id, id), eq(bots.userId, userId)))
    .returning({ id: bots.id })
  if (!bot) throw new Error("Bot not found")

  refresh()
}

export async function deleteBot(id: string) {
  const { userId } = await auth.protect()

  await db.transaction(async (tx) => {
    // A direct chat has no one left once its bot is gone, so it goes too
    await tx
      .delete(chats)
      .where(
        and(
          eq(chats.userId, userId),
          eq(chats.kind, "direct"),
          inArray(
            chats.id,
            tx
              .select({ id: chatMembers.chatId })
              .from(chatMembers)
              .where(eq(chatMembers.botId, id))
          )
        )
      )
    const [bot] = await tx
      .delete(bots)
      .where(and(eq(bots.id, id), eq(bots.userId, userId)))
      .returning({ sandboxId: bots.sandboxId })
    // Rolls back the chat delete too
    if (!bot) throw new Error("Bot not found")

    // Inside the transaction, so a failed sandbox delete keeps the bot and its sandboxId
    if (bot.sandboxId) {
      try {
        await daytona.delete(await daytona.get(bot.sandboxId))
      } catch (error) {
        if (!(error instanceof DaytonaNotFoundError)) throw error
      }
    }
  })
}
