import "server-only"

import { auth } from "@clerk/nextjs/server"

import { db } from "@/db"

export type ChatListItem = Awaited<ReturnType<typeof getChats>>[number]

export async function getChats() {
  const { userId } = await auth.protect()

  return db.query.chats.findMany({
    where: (chats, { eq }) => eq(chats.userId, userId),
    orderBy: (chats, { desc }) => [desc(chats.lastMessageAt)],
    columns: {
      id: true,
      kind: true,
      name: true,
      lastMessagePreview: true,
      lastMessageAt: true,
    },
    with: {
      members: {
        orderBy: (members, { asc }) => [asc(members.joinedAt)],
        columns: {},
        with: { bot: { columns: { name: true, avatar: true } } },
      },
    },
  })
}

export type BotListItem = Awaited<ReturnType<typeof getBots>>[number]

export async function getBots() {
  const { userId } = await auth.protect()

  return db.query.bots.findMany({
    where: (bots, { eq }) => eq(bots.userId, userId),
    orderBy: (bots, { asc }) => [asc(bots.createdAt)],
    columns: { id: true, name: true, avatar: true },
  })
}
