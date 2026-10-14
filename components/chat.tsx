"use client"

import { useChat } from "@ai-sdk/react"
import {
  useLoadTranscript,
  useTriggerChatTransport,
} from "@trigger.dev/sdk/chat/react"
import { isToolUIPart, type UIMessage } from "ai"
import { useState } from "react"

import {
  loadTranscript,
  mintChatAccessToken,
  startChatSession,
} from "@/actions/chat"
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import { ChatAvatar } from "@/components/chat-avatar"
import { Image } from "@/components/ai-elements/image"
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"
import {
  PromptInput,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input"
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
  type ToolPart,
} from "@/components/ai-elements/tool"
import type { BotListItem } from "@/queries/bot"
import type { chatAgent } from "@/trigger/chat"
import type { ChatUiMessage } from "@/trigger/computer"

export function Chat({
  chatId,
  bots,
}: {
  chatId: string
  // The group's bots to pick from; empty for a direct chat
  bots: BotListItem[]
}) {
  const transport = useTriggerChatTransport<typeof chatAgent>({
    task: "chat",
    accessToken: ({ chatId }) => mintChatAccessToken(chatId),
    startSession: ({ chatId }) => startChatSession({ chatId }),
  })
  const { messages, isLoading } = useLoadTranscript(chatId, loadTranscript, {
    transport,
  })

  // useChat takes its initial messages once, so mount it only after the transcript loads
  if (isLoading) return null
  return (
    <ChatView
      chatId={chatId}
      initialMessages={messages}
      transport={transport}
      bots={bots}
    />
  )
}

function ChatView({
  chatId,
  initialMessages,
  transport,
  bots,
}: {
  chatId: string
  initialMessages: UIMessage[]
  transport: ReturnType<typeof useTriggerChatTransport>
  bots: BotListItem[]
}) {
  const [input, setInput] = useState("")
  const [botId, setBotId] = useState(bots[0]?.id)
  const { messages, sendMessage, status, stop } = useChat<ChatUiMessage>({
    id: chatId,
    messages: initialMessages as ChatUiMessage[],
    transport,
  })

  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text.trim()) return
    // The agent reads botId from the turn's metadata to pick who answers
    sendMessage({ text: message.text }, { metadata: { botId } })
    setInput("")
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Conversation>
        <ConversationContent className="mx-auto w-full max-w-3xl">
          {messages.map((message) => (
            <Message from={message.role} key={message.id}>
              <MessageContent>
                {message.parts.map((part, i) => {
                  if (part.type === "text")
                    return (
                      <MessageResponse key={i}>{part.text}</MessageResponse>
                    )
                  if (
                    part.type === "tool-showScreen" &&
                    part.state === "output-available"
                  )
                    return (
                      <Image
                        key={i}
                        {...part.output}
                        uint8Array={new Uint8Array()}
                        alt="Screenshot of the bot's screen"
                      />
                    )
                  if (isToolUIPart(part))
                    return <ToolCall key={i} part={part} />
                  return null
                })}
              </MessageContent>
            </Message>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="mx-auto w-full max-w-3xl p-4 pt-0">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputTextarea
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
          />
          <PromptInputFooter>
            {bots.length > 0 && (
              <PromptInputTools>
                <PromptInputSelect
                  value={botId}
                  onValueChange={(value) =>
                    typeof value === "string" && setBotId(value)
                  }
                >
                  <PromptInputSelectTrigger aria-label="Bot to talk to">
                    <PromptInputSelectValue className="items-center gap-1.5">
                      {(id: string) => (
                        <BotOption bot={bots.find((b) => b.id === id)} />
                      )}
                    </PromptInputSelectValue>
                  </PromptInputSelectTrigger>
                  <PromptInputSelectContent>
                    {bots.map((bot) => (
                      <PromptInputSelectItem key={bot.id} value={bot.id}>
                        <BotOption bot={bot} />
                      </PromptInputSelectItem>
                    ))}
                  </PromptInputSelectContent>
                </PromptInputSelect>
              </PromptInputTools>
            )}
            <PromptInputSubmit
              status={status}
              onStop={stop}
              disabled={!input.trim() && status === "ready"}
              className="ms-auto"
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  )
}

function BotOption({ bot }: { bot?: BotListItem }) {
  if (!bot) return null
  return (
    <>
      <ChatAvatar seed={bot.avatar} className="size-4" />
      {bot.name}
    </>
  )
}

function ToolCall({ part }: { part: ToolPart }) {
  // Screenshots are base64 blobs: viewScreen is for the model only, and showScreen renders as an image
  const isScreenshot =
    part.type === "tool-viewScreen" || part.type === "tool-showScreen"

  return (
    <Tool>
      {part.type === "dynamic-tool" ? (
        <ToolHeader
          type={part.type}
          state={part.state}
          toolName={part.toolName}
        />
      ) : (
        <ToolHeader type={part.type} state={part.state} />
      )}
      <ToolContent>
        <ToolInput input={part.input} />
        <ToolOutput
          output={isScreenshot ? undefined : part.output}
          errorText={part.errorText}
        />
      </ToolContent>
    </Tool>
  )
}
