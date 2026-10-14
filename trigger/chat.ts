import { openai } from "@ai-sdk/openai"
import { chat } from "@trigger.dev/sdk/ai"
import {
  type InferUITools,
  stepCountIs,
  type UIDataTypes,
  type UIMessage,
} from "ai"
import { eq } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/db"
import { chats } from "@/db/schema"

import { computer, computerTools } from "./computer"
import { currentBot, instructionsFor, team, teamTools } from "./team"

const tools = { ...computerTools, ...teamTools }
const directChatTools = Object.keys(computerTools) as (keyof typeof tools)[]

// metadata.botId: which bot wrote an assistant message, so a group chat can show its face
export type ChatUiMessage = UIMessage<
  { botId?: string },
  UIDataTypes,
  InferUITools<typeof tools>
>

// No `storage` set: the platform's default transcript storage keeps each conversation, keyed by chatId
export const chatAgent = chat.agent({
  id: "chat",
  // Sent per message by the composer's bot picker; absent in direct chats.
  // Optional as a whole: boot parses startSession's metadata, which startChatSession never sets
  clientDataSchema: z.object({ botId: z.string().optional() }).optional(),
  // On the config too, so each tool's toModelOutput (screenshots as images) survives later turns
  tools,
  // chat.local must be initialized in onBoot; onTurnStart points it at the turn's bot
  onBoot: () => {
    computer.init({ sandboxId: null })
    team.init({
      kind: "direct",
      name: null,
      members: [],
      botId: "",
      handedOffFrom: null,
    })
  },
  // Per turn, not per run: in a group chat each message can go to a different bot
  onTurnStart: async ({ chatId, clientData }) => {
    const found = await db.query.chats.findFirst({
      where: eq(chats.id, chatId),
      columns: { kind: true, name: true },
      with: {
        members: {
          orderBy: (members, { asc }) => [asc(members.joinedAt)],
          with: {
            bot: {
              columns: {
                id: true,
                name: true,
                job: true,
                instructions: true,
                sandboxId: true,
              },
            },
          },
        },
      },
    })
    if (!found) throw new Error(`Chat ${chatId} not found`)
    // botId comes from the browser: only a member of this chat may answer
    const bot = clientData?.botId
      ? found.members.find((m) => m.botId === clientData.botId)?.bot
      : found.members[0]?.bot
    if (!bot) throw new Error(`No such bot in chat ${chatId}`)

    team.kind = found.kind
    team.name = found.name
    team.members = found.members.map((m) => m.bot)
    team.botId = bot.id
    team.handedOffFrom = null
    computer.sandboxId = bot.sandboxId
    // Read at the end of the stream too, so a handed-off reply is stamped with the teammate who wrote it
    chat.setUIMessageStreamOptions({
      messageMetadata: ({ part }) =>
        part.type === "start" || part.type === "finish"
          ? { botId: team.botId }
          : undefined,
    })
    chat.prompt.set(instructionsFor(bot))
  },
  // streamText from the run argument, not from "ai", so the managed options apply
  run: async ({ messages, tools, signal, streamText }) => {
    const firstBotId = team.botId
    return streamText({
      model: openai("gpt-6.1-sol"),
      messages,
      tools,
      activeTools: team.kind === "group" ? undefined : directChatTools,
      // After a handoff, the remaining steps run as the teammate, with their prompt
      prepareStep: () =>
        team.botId === firstBotId
          ? undefined
          : { system: instructionsFor(currentBot()) },
      // The default is one step; computer use needs a look-act-look loop
      stopWhen: stepCountIs(50),
      abortSignal: signal,
    })
  },
})
