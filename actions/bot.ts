"use server"

import { auth } from "@clerk/nextjs/server"
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
