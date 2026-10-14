import { MonitorIcon } from "lucide-react"
import Link from "next/link"

import { BotDialog } from "@/components/bot-dialog"
import { GroupChatAvatar } from "@/components/group-chat-avatar"
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
      {chat.kind === "group" ? (
        <h1 className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
          <GroupChatAvatar
            seeds={chat.members.map((m) => m.bot.avatar)}
            className="size-5"
          />
          <span className="truncate">{chat.name}</span>
        </h1>
      ) : (
        bot && (
          <h1 className="min-w-0">
            <BotDialog bot={bot}>
              <Button variant="ghost" size="sm" className="-ms-2 max-w-full">
                <GroupChatAvatar seeds={[bot.avatar]} className="size-5" />
                <span className="truncate">{bot.name}</span>
              </Button>
            </BotDialog>
          </h1>
        )
      )}
      {/* Each bot has its own computer, so a group has no single desktop to show */}
      {chat.kind === "direct" && (
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
      )}
    </header>
  )
}
