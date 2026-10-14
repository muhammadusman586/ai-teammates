import { notFound } from "next/navigation"
import { Suspense } from "react"

import { BotDesktop } from "@/components/bot-desktop"
import { Chat } from "@/components/chat"
import { ChatHeader } from "@/components/chat-header"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Skeleton } from "@/components/ui/skeleton"
import { getDesktopUrl } from "@/lib/daytona"
import { getChat } from "@/queries/chats"

export default async function Page(props: PageProps<"/chats/[chatId]">) {
  const { chatId } = await props.params
  const chat = await getChat(chatId)
  if (!chat) notFound()
  const desktopOpen =
    chat.kind === "direct" && "desktop" in (await props.searchParams)
  const bot = chat.members[0]?.bot

  return (
    // style, not h-svh: the group sets an inline height of 100%, which beats the class and lets the page grow
    <ResizablePanelGroup style={{ height: "100svh" }}>
      <ResizablePanel id="chat" minSize="30%" className="flex flex-col">
        <ChatHeader chat={chat} desktopOpen={desktopOpen} />
        <Chat
          key={chatId}
          chatId={chatId}
          // Only groups pick who answers; a direct chat always gets its one bot
          bots={
            chat.kind === "group"
              ? chat.members.map(({ bot: { id, name, avatar } }) => ({
                  id,
                  name,
                  avatar,
                }))
              : []
          }
        />
      </ResizablePanel>
      {desktopOpen && (
        <>
          <ResizableHandle />
          <ResizablePanel id="desktop" defaultSize="50%" minSize="20%">
            {bot?.sandboxId && (
              // Waking a stopped sandbox takes a while, so the chat doesn't wait on it
              <Suspense
                fallback={<Skeleton className="m-4 mt-15 aspect-4/3" />}
              >
                <BotDesktop
                  name={bot.name}
                  url={getDesktopUrl(bot.sandboxId)}
                />
              </Suspense>
            )}
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  )
}
