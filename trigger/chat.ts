import { openai } from "@ai-sdk/openai"
import { chat } from "@trigger.dev/sdk/ai"
import { stepCountIs } from "ai"
import { eq } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/db"
import { chats } from "@/db/schema"

import { computer, computerTools } from "./computer"

// No `storage` set: the platform's default transcript storage keeps each conversation, keyed by chatId
export const chatAgent = chat.agent({
  id: "chat",
  // Sent per message by the composer's bot picker; absent in direct chats.
  // Optional as a whole: boot parses startSession's metadata, which startChatSession never sets
  clientDataSchema: z.object({ botId: z.string().optional() }).optional(),
  // On the config too, so each tool's toModelOutput (screenshots as images) survives later turns
  tools: computerTools,
  // chat.local must be initialized in onBoot; onTurnStart points it at the turn's bot
  onBoot: () => computer.init({ sandboxId: null }),
  // Per turn, not per run: in a group chat each message can go to a different bot
  onTurnStart: async ({ chatId, clientData }) => {
    const found = await db.query.chats.findFirst({
      where: eq(chats.id, chatId),
      columns: { kind: true, name: true },
      with: {
        members: {
          orderBy: (members, { asc }) => [asc(members.joinedAt)],
          with: { bot: true },
        },
      },
    })
    if (!found) throw new Error(`Chat ${chatId} not found`)
    // botId comes from the browser: only a member of this chat may answer
    const bot = clientData?.botId
      ? found.members.find((m) => m.botId === clientData.botId)?.bot
      : found.members[0]?.bot
    if (!bot) throw new Error(`No such bot in chat ${chatId}`)
    computer.sandboxId = bot.sandboxId

    const others = found.members
      .filter((m) => m.botId !== bot.id)
      .map((m) => m.bot.name)

    chat.prompt.set(
      [
        `You are ${bot.name}, an AI teammate.`,
        `Your job: ${bot.job}`,
        bot.instructions && `How to go about it:\n${bot.instructions}`,
        found.kind === "group"
          ? `You are in a group chat called "${found.name}" with the person who created you and other AI teammates: ${others.join(", ")}. The person picks who answers each message, and they picked you. Earlier assistant replies may be from your teammates. Stay in your role and help them with your job.`
          : `You are talking with the person who created you, in a one-on-one chat. Stay in your role and help them with your job.`,
        `You have your own computer: an isolated Linux sandbox (Daytona${bot.sandboxId ? `, id ${bot.sandboxId}` : ""}). It belongs only to you, is separate from the person's machine, and its files persist between conversations.`,
        `Use your tools to work on that computer: run commands, read and write files, and drive its desktop (1024x768) with the mouse and keyboard. Mouse coordinates are pixels in your screenshots. Look at the screen with viewScreen before you click, and again afterwards to check the result. Only say you did something if a tool actually did it.`,
      ]
        .filter(Boolean)
        .join("\n\n")
    )
  },
  // streamText from the run argument, not from "ai", so the managed options apply
  run: async ({ messages, tools, signal, streamText }) =>
    streamText({
      model: openai("gpt-6.1-sol"),
      messages,
      tools,
      // The default is one step; computer use needs a look-act-look loop
      stopWhen: stepCountIs(50),
      abortSignal: signal,
    }),
})
