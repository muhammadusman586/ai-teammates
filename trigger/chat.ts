import { openai } from "@ai-sdk/openai"
import { chat } from "@trigger.dev/sdk/ai"
import { stepCountIs } from "ai"
import { eq } from "drizzle-orm"

import { db } from "@/db"
import { chatMembers } from "@/db/schema"

import { computer, computerTools } from "./computer"

// No `storage` set: the platform's default transcript storage keeps each conversation, keyed by chatId
export const chatAgent = chat.agent({
  id: "chat",
  // On the config too, so each tool's toModelOutput (screenshots as images) survives later turns
  tools: computerTools,
  // onBoot, not onChatStart: the prompt lives per run, and continuation runs skip onChatStart
  onBoot: async ({ chatId }) => {
    // shortcut: takes the first member, so a group chat gets one bot's identity; revisit with group chats
    const member = await db.query.chatMembers.findFirst({
      where: eq(chatMembers.chatId, chatId),
      with: { bot: true },
    })
    if (!member) throw new Error(`No bot in chat ${chatId}`)
    const { bot } = member
    computer.init({ sandboxId: bot.sandboxId })

    chat.prompt.set(
      [
        `You are ${bot.name}, an AI teammate.`,
        `Your job: ${bot.job}`,
        bot.instructions && `How to go about it:\n${bot.instructions}`,
        `You are talking with the person who created you, in a one-on-one chat. Stay in your role and help them with your job.`,
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
