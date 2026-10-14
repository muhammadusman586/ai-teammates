import { MonitorIcon } from "lucide-react"
import Link from "next/link"

import { BotDialog } from "@/components/bot-dialog"
import { ChatAvatar } from "@/components/chat-avatar"
import { Button } from "@/components/ui/button"
import type { Chat } from "@/queries/chats"

export function ChatHeader({
  chat,
  desktopOpen,
}: {
  chat: Chat
  desktopOpen: boolean
}) {
  const bot = chat.members[0]?.bot

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
      {bot && (
        <h1 className="min-w-0">
          <BotDialog bot={bot}>
            <Button variant="ghost" size="sm" className="-ms-2 max-w-full">
              <ChatAvatar seed={bot.avatar} className="size-5" />
              <span className="truncate">{bot.name}</span>
            </Button>
          </BotDialog>
        </h1>
      )}
      <Button
        variant={desktopOpen ? "secondary" : "ghost"}
        size="icon-sm"
        aria-label={desktopOpen ? "Hide desktop" : "Show desktop"}
        className="ms-auto"
        nativeButton={false}
        render={
          <Link
            href={
              desktopOpen ? `/chats/${chat.id}` : `/chats/${chat.id}?desktop`
            }
            scroll={false}
          />
        }
      >
        <MonitorIcon />
      </Button>
    </header>
  )
}
