"use client"

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { RefreshCwIcon, XIcon } from "lucide-react"
import { use, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function BotDesktop({
  name,
  url,
}: {
  name: string
  url: Promise<string>
}) {
  const latestUrl = use(url)
  // Every server render mints a new signed url; adopting it would reload the desktop, so only the refresh button does
  const [frame, setFrame] = useState({ src: latestUrl, key: 0 })
  const [open, setOpen] = useState(false)
  // State, not a ref: the portal reads its container on mount and falls back to <body> while it is null
  const [frameSlot, setFrameSlot] = useState<HTMLDivElement | null>(null)
  const iframe = useRef<HTMLIFrameElement>(null)
  const title = `${name}'s screen`

  return (
    <div className="flex flex-col gap-3 p-4">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Reload screen"
        className="self-end"
        onClick={() => setFrame((f) => ({ src: latestUrl, key: f.key + 1 }))}
      >
        <RefreshCwIcon />
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next, { reason }) => {
          // Keys and clicks belong to the remote desktop, so only the close button exits
          if (next || reason === "close-press") setOpen(next)
        }}
      >
        <div
          ref={setFrameSlot}
          className="relative aspect-4/3 w-full overflow-hidden rounded-xl border bg-muted"
        >
          {/* The popup lives in the panel even when closed, so the one iframe is never moved (moving reloads it) */}
          {frameSlot && (
            <DialogPortal container={frameSlot} keepMounted>
              <DialogOverlay />
              <DialogPrimitive.Popup
                hidden={false}
                // Closed, it's only a preview: the trigger is what assistive tech should find
                aria-hidden={!open}
                initialFocus={iframe}
                className="group absolute inset-2 flex flex-col outline-none data-open:fixed data-open:inset-4 data-open:z-50 data-open:gap-2 data-open:rounded-xl data-open:bg-popover data-open:p-2 data-open:text-popover-foreground data-open:ring-1 data-open:ring-foreground/10"
              >
                <div className="hidden items-center justify-between ps-2 group-data-open:flex">
                  <DialogTitle>{title}</DialogTitle>
                  <DialogClose
                    render={<Button variant="ghost" size="icon-sm" />}
                    aria-label="Close"
                  >
                    <XIcon />
                  </DialogClose>
                </div>
                <iframe
                  key={frame.key}
                  ref={iframe}
                  src={frame.src}
                  title={title}
                  allow="clipboard-read; clipboard-write"
                  // The trigger stands in for the preview until it's opened
                  tabIndex={open ? 0 : -1}
                  className="min-h-0 flex-1 rounded-lg"
                />
              </DialogPrimitive.Popup>
            </DialogPortal>
          )}
          <DialogTrigger
            aria-label={`Open ${title}`}
            // The portal appends after this, so lift the trigger over the closed preview
            className="absolute inset-0 z-10 cursor-zoom-in rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </Dialog>
      <p className="text-center text-sm text-muted-foreground">{title}</p>
    </div>
  )
}
