"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { UserButton } from "@clerk/nextjs"
import { formatDistanceToNowStrict } from "date-fns"
import { PlusIcon, SearchIcon, UsersIcon } from "lucide-react"

import { BotDialog } from "@/components/bot-dialog"
import { ChatAvatar } from "@/components/chat-avatar"
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
  sidebarMenuButtonVariants,
} from "@/components/ui/sidebar"
import type { ChatListItem } from "@/queries/bot"

export function AppSidebar({ chats }: { chats: ChatListItem[] }) {
  // The dialog lives outside the menu, which unmounts its items on close.
  const [botDialogOpen, setBotDialogOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const router = useRouter()

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
    <Sidebar>
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
            <DropdownMenuItem>
              <UsersIcon />
              Create group chat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <BotDialog open={botDialogOpen} onOpenChange={setBotDialogOpen} />
        {/* Input's classes on a ghost button, so it looks like a field but keeps the button hover. */}
        <Button
          variant="ghost"
          onClick={() => setSearchOpen(true)}
          className="h-8 w-full min-w-0 justify-start rounded-lg border border-input bg-transparent px-2.5 py-1 text-base font-normal text-muted-foreground md:text-sm dark:bg-input/30"
        >
          <SearchIcon data-icon="inline-start" />
          Search
          <Kbd className="ms-auto">⌘K</Kbd>
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
                  const bot = chat.members[0]?.bot
                  if (!bot) return null

                  return (
                    <CommandItem
                      key={chat.id}
                      value={chat.id}
                      keywords={[bot.name]}
                      onSelect={() => {
                        setSearchOpen(false)
                        router.push(`/chats/${chat.id}`)
                      }}
                    >
                      <ChatAvatar seed={bot.avatar} className="size-6" />
                      <span className="truncate">{bot.name}</span>
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
              const bot = chat.members[0]?.bot
              if (!bot) return null

              return (
                <SidebarMenuItem key={chat.id}>
                  <SidebarMenuButton
                    size="lg"
                    render={<Link href={`/chats/${chat.id}`} />}
                  >
                    <ChatAvatar seed={bot.avatar} />
                    <div className="grid flex-1 text-left leading-tight">
                      <div className="flex items-baseline gap-2">
                        <span className="truncate font-medium">{bot.name}</span>
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
                  userButtonTrigger: sidebarMenuButtonVariants({
                    size: "lg",
                    // Undo Clerk's button base styles that a plain SidebarMenuButton doesn't have.
                    className:
                      "cursor-default justify-start font-normal select-auto",
                  }),
                  // Clerk puts the name before the avatar; reverse so the avatar leads.
                  userButtonBox:
                    "min-w-0 flex-1 flex-row-reverse justify-end gap-2",
                  userButtonOuterIdentifier:
                    "truncate ps-0 text-sm font-normal",
                  userButtonAvatarBox: "size-6",
                },
              }}
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
