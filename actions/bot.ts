"use server"

import { auth } from "@clerk/nextjs/server"
import { and, eq, inArray } from "drizzle-orm"
import { refresh } from "next/cache"
import type { z } from "zod"

import { db } from "@/db"
import { bots, chatMembers, chats, insertBotSchema } from "@/db/schema"

export async function createBot(input: z.input<typeof insertBotSchema>) {
  const { userId } = await auth.protect()
  // Server Actions are public endpoints: re-validate what the client sent
  const values = insertBotSchema.parse(input)

  // node-postgres has no db.batch (neon-http only); a transaction gives the same all-or-nothing write
  const created = await db.transaction(async (tx) => {
    const [bot] = await tx
      .insert(bots)
      .values({ ...values, userId })
      .returning({ id: bots.id })
    const [chat] = await tx
      .insert(chats)
      .values({ userId, kind: "direct" })
      .returning({ id: chats.id })
    await tx.insert(chatMembers).values({ chatId: chat.id, botId: bot.id })

    return { botId: bot.id, chatId: chat.id }
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
      .returning({ id: bots.id })
    // Rolls back the chat delete too
    if (!bot) throw new Error("Bot not found")
  })
}
