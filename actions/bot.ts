"use server"

import { auth } from "@clerk/nextjs/server"
import type { z } from "zod"

import { db } from "@/db"
import { bots, insertBotSchema } from "@/db/schema"

export async function createBot(input: z.input<typeof insertBotSchema>) {
  const { userId } = await auth.protect()
  // Server Actions are public endpoints: re-validate what the client sent
  const values = insertBotSchema.parse(input)

  const [bot] = await db
    .insert(bots)
    .values({ ...values, userId })
    .returning({ id: bots.id })

  return bot
}
