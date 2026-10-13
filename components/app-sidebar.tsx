"use client"

import { UserButton } from "@clerk/nextjs"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  sidebarMenuButtonVariants,
} from "@/components/ui/sidebar"

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader />
      <SidebarContent>
        <SidebarGroup />
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
