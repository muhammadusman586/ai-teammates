import { auth } from "@clerk/nextjs/server"

import { BotDialog } from "@/components/bot-dialog"
import { ChatAvatar } from "@/components/chat-avatar"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export default async function Page() {
  await auth.protect()

  return (
    <Empty className="min-h-svh">
      <EmptyHeader>
        <EmptyMedia>
          <ChatAvatar seed={crypto.randomUUID()} className="size-12" />
        </EmptyMedia>
        <EmptyTitle>No teammates yet</EmptyTitle>
        <EmptyDescription>
          You haven&apos;t created any AI teammates. Create your first one to
          get started.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <BotDialog>
          <Button size="sm">Create Teammate</Button>
        </BotDialog>
      </EmptyContent>
    </Empty>
  )
}
