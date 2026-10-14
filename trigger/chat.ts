import { openai } from "@ai-sdk/openai"
import { chat } from "@trigger.dev/sdk/ai"

// No `storage` set: the platform's default transcript storage keeps each conversation, keyed by chatId
export const chatAgent = chat.agent({
  id: "chat",
  // streamText from the run argument, not from "ai", so the managed options apply
  run: async ({ messages, signal, streamText }) =>
    streamText({
      model: openai("gpt-6.1-sol"),
      messages,
      abortSignal: signal,
    }),
})
