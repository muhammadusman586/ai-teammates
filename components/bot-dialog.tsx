"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { ShuffleIcon } from "lucide-react"
import { nanoid } from "nanoid"
import { Controller, useForm } from "react-hook-form"

import { createBot } from "@/actions/bot"
import { ChatAvatar } from "@/components/chat-avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { insertBotSchema } from "@/db/schema"

const JOB_PRESETS: Record<string, string> = {
  "Research assistant":
    "Answer briefly, cite sources, and ask before running anything destructive.",
  "Code reviewer":
    "Point out bugs, security issues, and unclear code first. Suggest concrete fixes and skip style nitpicks.",
  "Writing editor":
    "Tighten wording and fix grammar while keeping my voice. Explain big changes in one line each.",
  Tutor:
    "Explain step by step with simple examples. Ask a quick question to check I understood before moving on.",
}
const JOB_TAGS = Object.keys(JOB_PRESETS)

export function BotDialog({
  children,
  open: openProp,
  onOpenChange,
}: {
  children?: React.ReactElement
  // Controlled from outside when there's no trigger, e.g. opened from a menu item
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [openState, setOpenState] = useState(false)
  const open = openProp ?? openState
  const setOpen = onOpenChange ?? setOpenState

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger render={children} />}
      <DialogContent className="sm:max-w-md">
        {/* Popup unmounts on close, so every open starts with a fresh form */}
        <BotForm onCreated={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}

function BotForm({ onCreated }: { onCreated: () => void }) {
  const form = useForm({
    resolver: zodResolver(insertBotSchema),
    defaultValues: { name: "", avatar: nanoid(), job: "", instructions: "" },
  })

  async function onSubmit(values: Parameters<typeof createBot>[0]) {
    try {
      await createBot(values)
      toast.add({ title: "Bot created", type: "success" })
      onCreated()
    } catch {
      toast.add({ title: "Couldn't create bot", type: "error" })
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
    >
      <DialogHeader>
        <DialogTitle>New bot</DialogTitle>
        <DialogDescription>
          Give it a face, a name, and a job to do.
        </DialogDescription>
      </DialogHeader>
      <Controller
        name="job"
        control={form.control}
        render={({ field }) => (
          <ToggleGroup
            aria-label="Job presets"
            variant="outline"
            className="flex-wrap"
            value={JOB_TAGS.includes(field.value) ? [field.value] : []}
            onValueChange={([tag]) => {
              field.onChange(tag ?? "")
              // Only replace instructions the user hasn't written themselves
              const current = form.getValues("instructions")
              if (!current || Object.values(JOB_PRESETS).includes(current)) {
                form.setValue("instructions", tag ? JOB_PRESETS[tag] : "")
              }
            }}
          >
            {JOB_TAGS.map((tag) => (
              <ToggleGroupItem key={tag} value={tag} className="rounded-full">
                {tag}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
      />
      <FieldGroup>
        <Controller
          name="avatar"
          control={form.control}
          render={({ field }) => (
            <Field orientation="horizontal">
              <ChatAvatar seed={field.value ?? ""} className="size-12" />
              <FieldContent>
                <FieldTitle>Face</FieldTitle>
                <FieldDescription>
                  Shuffle until you find one you like.
                </FieldDescription>
              </FieldContent>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => field.onChange(nanoid())}
              >
                <ShuffleIcon data-icon="inline-start" />
                Shuffle
              </Button>
            </Field>
          )}
        />
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="bot-name">Name</FieldLabel>
              <Input
                {...field}
                id="bot-name"
                aria-invalid={fieldState.invalid}
                placeholder="Ada"
                autoComplete="off"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="job"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="bot-job">Job</FieldLabel>
              <Input
                {...field}
                id="bot-job"
                aria-invalid={fieldState.invalid}
                placeholder="Research assistant"
                autoComplete="off"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="instructions"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="bot-instructions">
                How it should work
              </FieldLabel>
              <Textarea
                {...field}
                value={field.value ?? ""}
                id="bot-instructions"
                aria-invalid={fieldState.invalid}
                placeholder="Answer briefly, cite sources, and ask before running anything destructive."
                rows={4}
                className="resize-none"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          Cancel
        </DialogClose>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Spinner data-icon="inline-start" />}
          Create bot
        </Button>
      </DialogFooter>
    </form>
  )
}
