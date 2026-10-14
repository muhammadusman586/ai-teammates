import { chat } from "@trigger.dev/sdk/ai"
import { tool } from "ai"
import { z } from "zod"

import type { bots } from "@/db/schema"

import { computer } from "./computer"

type Bot = Pick<
  typeof bots.$inferSelect,
  "id" | "name" | "job" | "instructions" | "sandboxId"
>

// Set in onTurnStart from the chat's members; handoff moves botId to a teammate mid-turn
export const team = chat.local<{
  kind: "direct" | "group"
  name: string | null
  members: Bot[]
  botId: string
  handedOffFrom: string | null
}>({ id: "team" })

export const currentBot = () => {
  const bot = team.members.find((m) => m.id === team.botId)
  if (!bot) throw new Error(`Bot ${team.botId} is not in this chat`)
  return bot
}

export const teamTools = {
  handoff: tool({
    description:
      "Hand the person's message to a teammate in this group chat whose job fits it better. They answer it right after you, in your place. Write nothing else when you call this.",
    inputSchema: z.object({
      botId: z
        .string()
        .describe("The teammate's id, from the list in your instructions."),
      reason: z
        .string()
        .describe("One short sentence on why they fit this message better."),
    }),
    execute: async ({ botId, reason }) => {
      const from = currentBot()
      const to = team.members.find((m) => m.id === botId)
      if (team.kind !== "group")
        throw new Error("Handoff only works in group chats.")
      if (!to || to.id === from.id)
        throw new Error("No such teammate in this chat.")
      // One handoff per message, so two bots can't pass it back and forth
      if (team.handedOffFrom)
        throw new Error(
          "This message was already handed off. Answer it yourself."
        )

      team.botId = to.id
      team.handedOffFrom = from.name
      computer.sandboxId = to.sandboxId
      return { from: from.name, to: to.name, botId: to.id, reason }
    },
  }),
}

export function instructionsFor(bot: Bot) {
  const teammates = team.members.filter((m) => m.id !== bot.id)
  const isGroup = team.kind === "group"

  return [
    `You are ${bot.name}, an AI teammate.`,
    `Your job: ${bot.job}`,
    bot.instructions && `How to go about it:\n${bot.instructions}`,

    isGroup
      ? [
          `## Where you are`,
          `You are in a group chat called "${team.name}" with the person who created you and these AI teammates:`,
          teammates.map((m) => `- ${m.name} (id ${m.id}): ${m.job}`).join("\n"),
          `The person picks which of you answers each message, and this one is yours. Earlier assistant messages in the conversation may have been written by your teammates, not by you: build on them, but don't repeat them or take credit for them. Speak only for yourself, never as a teammate.`,
        ].join("\n\n")
      : `You are talking with the person who created you, in a one-on-one chat. Stay in your role and help them with your job.`,

    isGroup &&
      (team.handedOffFrom
        ? `## Handoff\n${team.handedOffFrom} handed this message to you because it fits your job better. Answer it yourself; it can't be handed off again.`
        : `## Handing off\nIf the message clearly fits a teammate's job better than yours, call the handoff tool with their id and a one-sentence reason instead of answering, and write nothing else: they answer right after you. Hand off only when a teammate is clearly the better fit. If you can help, answer yourself.`),

    `## Your computer`,
    `You have your own computer: an isolated Linux sandbox (Daytona${bot.sandboxId ? `, id ${bot.sandboxId}` : ""}). It belongs only to you, is separate from the person's machine${isGroup ? " and from your teammates' computers" : ""}, and its files persist between conversations.`,
    `Your tools work on that computer:
- bash runs a command; readFile, writeFile and listFiles work with files.
- viewScreen shows you the desktop (1024x768); mouseClick, mouseMove, mouseScroll, keyboardType and keyboardPress drive it. Mouse coordinates are pixels in your screenshots.
- showScreen puts a screenshot in the chat for the person. Use it only when they ask to see your screen.
Look at the screen with viewScreen before you click, and again afterwards to check the result. Only say you did something if a tool actually did it.`,
  ]
    .filter(Boolean)
    .join("\n\n")
}
