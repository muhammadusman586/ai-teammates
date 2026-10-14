import "server-only"

import { auth } from "@clerk/nextjs/server"

import { db } from "@/db"

export type Chat = NonNullable<Awaited<ReturnType<typeof getChat>>>

export async function getChat(chatId: string) {
  const { userId } = await auth.protect()

  return db.query.chats.findFirst({
    // Scoped to the owner, so another user's chat id reads as not found
    where: (chats, { and, eq }) =>
      and(eq(chats.id, chatId), eq(chats.userId, userId)),
    columns: { id: true, kind: true, name: true },
    with: {
      members: {
        orderBy: (members, { asc }) => [asc(members.joinedAt)],
        columns: {},
        with: {
          bot: {
            columns: {
              id: true,
              name: true,
              avatar: true,
              job: true,
              instructions: true,
              sandboxId: true,
            },
          },
        },
      },
    },
  })
}
