"use server"

import { auth } from "@clerk/nextjs/server"
import { auth as triggerAuth } from "@trigger.dev/sdk"
import { chat, defaultStorage } from "@trigger.dev/sdk/ai"
import { and, eq } from "drizzle-orm"

import { db } from "@/db"
import { chats } from "@/db/schema"
import type { chatAgent } from "@/trigger/chat"

// chatId comes from the browser: signed in is not the same as owning this chat
async function assertChatOwner(chatId: string) {
  const { userId } = await auth.protect()
  const chat = await db.query.chats.findFirst({
    where: and(eq(chats.id, chatId), eq(chats.userId, userId)),
    columns: { id: true },
  })
  if (!chat) throw new Error("Chat not found")
}

const start = chat.createStartSessionAction<typeof chatAgent>("chat")
const load = chat.createLoadTranscriptAction(defaultStorage)

// Only chatId is taken from the client, so it can't set trigger config, metadata or tags
export async function startChatSession({ chatId }: { chatId: string }) {
  await assertChatOwner(chatId)
  return start({ chatId })
}

export async function mintChatAccessToken(chatId: string) {
  await assertChatOwner(chatId)
  return triggerAuth.createPublicToken({
    scopes: { read: { sessions: chatId }, write: { sessions: chatId } },
    expirationTime: "1h",
  })
}

export async function loadTranscript({ chatId }: { chatId: string }) {
  await assertChatOwner(chatId)
  return load({ chatId })
}
