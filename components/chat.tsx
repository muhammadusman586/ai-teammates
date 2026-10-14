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
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input"
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
  type ToolPart,
} from "@/components/ai-elements/tool"
import type { chatAgent } from "@/trigger/chat"
import type { ChatUiMessage } from "@/trigger/computer"

export function Chat({ chatId }: { chatId: string }) {
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
    />
  )
}

function ChatView({
  chatId,
  initialMessages,
  transport,
}: {
  chatId: string
  initialMessages: UIMessage[]
  transport: ReturnType<typeof useTriggerChatTransport>
}) {
  const [input, setInput] = useState("")
  const { messages, sendMessage, status, stop } = useChat<ChatUiMessage>({
    id: chatId,
    messages: initialMessages as ChatUiMessage[],
    transport,
  })

  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text.trim()) return
    sendMessage({ text: message.text })
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
