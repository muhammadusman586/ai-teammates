import "server-only"

import { auth } from "@clerk/nextjs/server"

import { db } from "@/db"

export type ChatListItem = Awaited<ReturnType<typeof getChats>>[number]

export async function getChats() {
  const { userId } = await auth.protect()

  return db.query.chats.findMany({
    where: (chats, { eq }) => eq(chats.userId, userId),
    orderBy: (chats, { desc }) => [desc(chats.lastMessageAt)],
    columns: { id: true, lastMessagePreview: true, lastMessageAt: true },
    with: {
      // Group chats aren't handled yet, so the first bot to join stands in for the chat
      members: {
        orderBy: (members, { asc }) => [asc(members.joinedAt)],
        limit: 1,
        columns: {},
        with: { bot: { columns: { name: true, avatar: true } } },
      },
    },
  })
}
