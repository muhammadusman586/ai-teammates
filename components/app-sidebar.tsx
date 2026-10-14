"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { UserButton } from "@clerk/nextjs"
import { formatDistanceToNowStrict } from "date-fns"
import { PlusIcon, SearchIcon, UsersIcon } from "lucide-react"

import { BotDialog } from "@/components/bot-dialog"
import { GroupChatAvatar } from "@/components/group-chat-avatar"
import { GroupChatDialog } from "@/components/group-chat-dialog"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Kbd } from "@/components/ui/kbd"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  sidebarMenuButtonVariants,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import type { BotListItem, ChatListItem } from "@/queries/bot"

// A group goes by its own name; a direct chat by its bot's
const chatName = (chat: ChatListItem) =>
  chat.name ?? chat.members[0]?.bot.name ?? ""
const chatSeeds = (chat: ChatListItem) => chat.members.map((m) => m.bot.avatar)

export function AppSidebar({
  chats,
  bots,
}: {
  chats: ChatListItem[]
  bots: BotListItem[]
}) {
  // The dialogs live outside the menu, which unmounts its items on close.
  const [botDialogOpen, setBotDialogOpen] = useState(false)
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setSearchOpen((open) => !open)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label="New"
                className="self-end"
              />
            }
          >
            <PlusIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-auto">
            <DropdownMenuItem onClick={() => setBotDialogOpen(true)}>
              <PlusIcon />
              Create new bot
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setGroupDialogOpen(true)}>
              <UsersIcon />
              Create group chat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <BotDialog open={botDialogOpen} onOpenChange={setBotDialogOpen} />
        <GroupChatDialog
          bots={bots}
          open={groupDialogOpen}
          onOpenChange={setGroupDialogOpen}
        />
        {/* Input's classes on a ghost button, so it looks like a field but keeps the button hover. */}
        <Button
          variant="ghost"
          onClick={() => setSearchOpen(true)}
          className="h-8 w-full min-w-0 justify-start rounded-lg border border-input bg-transparent px-2.5 py-1 text-base font-normal text-muted-foreground group-data-[collapsible=icon]:hidden md:text-sm dark:bg-input/30"
        >
          <SearchIcon data-icon="inline-start" />
          Search
          <Kbd className="ms-auto">⌘K</Kbd>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Search"
          onClick={() => setSearchOpen(true)}
          className="hidden group-data-[collapsible=icon]:inline-flex"
        >
          <SearchIcon />
        </Button>
        <CommandDialog
          open={searchOpen}
          onOpenChange={setSearchOpen}
          title="Search chats"
          description="Search your chats by name"
        >
          <Command>
            <CommandInput placeholder="Search chats..." />
            <CommandList>
              <CommandEmpty>No chats found.</CommandEmpty>
              <CommandGroup heading="Chats">
                {chats.map((chat) => {
                  if (!chat.members.length) return null

                  return (
                    <CommandItem
                      key={chat.id}
                      value={chat.id}
                      keywords={[chatName(chat)]}
                      onSelect={() => {
                        setSearchOpen(false)
                        router.push(`/chats/${chat.id}`)
                      }}
                    >
                      <GroupChatAvatar
                        seeds={chatSeeds(chat)}
                        className="size-6"
                      />
                      <span className="truncate">{chatName(chat)}</span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </CommandDialog>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {chats.map((chat) => {
              if (!chat.members.length) return null

              return (
                <SidebarMenuItem key={chat.id}>
                  <SidebarMenuButton
                    size="lg"
                    tooltip={chatName(chat)}
                    isActive={pathname === `/chats/${chat.id}`}
                    // Pad the avatar down so it matches the icon buttons when collapsed.
                    className="group-data-[collapsible=icon]:p-1.5!"
                    render={<Link href={`/chats/${chat.id}`} />}
                  >
                    <GroupChatAvatar
                      seeds={chatSeeds(chat)}
                      className="group-data-[collapsible=icon]:size-5"
                    />
                    <div className="grid flex-1 text-left leading-tight">
                      <div className="flex items-baseline gap-2">
                        <span className="truncate font-medium">
                          {chatName(chat)}
                        </span>
                        {/* Relative time differs between the server render and hydration */}
                        <span
                          suppressHydrationWarning
                          className="ms-auto shrink-0 text-xs text-muted-foreground"
                        >
                          {formatDistanceToNowStrict(chat.lastMessageAt)}
                        </span>
                      </div>
                      <span className="truncate text-xs text-muted-foreground">
                        {chat.lastMessagePreview}
                      </span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {/* UserButton can't take a render prop, so its trigger gets SidebarMenuButton's classes. */}
            <UserButton
              showName
              appearance={{
                elements: {
                  rootBox: "flex w-full",
                  userButtonTrigger: cn(
                    sidebarMenuButtonVariants({ size: "lg" }),
                    // Undo Clerk's button base styles that a plain SidebarMenuButton doesn't have.
                    "shrink-0 cursor-default justify-start font-normal select-auto group-data-[collapsible=icon]:p-1.5!"
                  ),
                  // Clerk puts the name before the avatar; reverse so the avatar leads.
                  userButtonBox:
                    "min-w-0 flex-1 flex-row-reverse justify-end gap-2",
                  userButtonOuterIdentifier:
                    "truncate ps-0 text-sm font-normal group-data-[collapsible=icon]:hidden",
                  userButtonAvatarBox:
                    "size-6 group-data-[collapsible=icon]:size-5",
                },
              }}
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
