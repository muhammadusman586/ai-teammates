import { ChatAvatar } from "@/components/chat-avatar"
import { cn } from "@/lib/utils"

// Slot positions inside the square, by item count: overlap, triangle, 2x2 grid
const SLOTS = [
  [],
  ["inset-0 size-full"],
  ["top-0 left-0 size-[62%]", "right-0 bottom-0 size-[62%]"],
  [
    "top-0 left-1/4 size-1/2",
    "bottom-0 left-0 size-1/2",
    "right-0 bottom-0 size-1/2",
  ],
  [
    "top-0 left-0 size-1/2",
    "top-0 right-0 size-1/2",
    "bottom-0 left-0 size-1/2",
    "right-0 bottom-0 size-1/2",
  ],
]

// Same footprint as a ChatAvatar, so a group and a direct chat line up anywhere
export function GroupChatAvatar({
  seeds,
  className,
}: {
  seeds: string[]
  className?: string
}) {
  const shown = seeds.slice(0, 3)
  const rest = seeds.length - shown.length
  const slots = SLOTS[shown.length + (rest > 0 ? 1 : 0)]

  return (
    <div className={cn("relative size-8 shrink-0", className)}>
      {shown.map((seed, i) => (
        <ChatAvatar
          key={i}
          seed={seed}
          className={cn(
            "absolute",
            seeds.length > 1 && "ring-1 ring-background",
            slots[i]
          )}
        />
      ))}
      {rest > 0 && (
        // SVG text scales with the avatar, which a font size can't at every size
        <svg
          viewBox="0 0 16 16"
          aria-hidden
          className={cn(
            "absolute rounded-full bg-muted fill-muted-foreground",
            slots[3]
          )}
        >
          <text
            x="8"
            y="8"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={rest > 9 ? 7 : 9}
            fontWeight={600}
          >
            +{rest}
          </text>
        </svg>
      )}
    </div>
  )
}
