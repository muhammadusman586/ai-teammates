import { chat } from "@trigger.dev/sdk/ai"
import { tool } from "ai"
import { z } from "zod"

import { daytona } from "@/lib/daytona"

// Set in onBoot from the chat's bot, read by every tool
export const computer = chat.local<{ sandboxId: string | null }>({
  id: "computer",
})

// Looked up on every call: the sandbox auto-stops when idle, so a handle cached at boot goes stale
async function getSandbox() {
  if (!computer.sandboxId) throw new Error("This bot has no computer.")
  const sandbox = await daytona.get(computer.sandboxId)
  if (sandbox.state === "starting") await sandbox.waitUntilStarted()
  else if (sandbox.state !== "started") await sandbox.start()
  return sandbox
}

async function getDesktop() {
  const { computerUse } = await getSandbox()
  const { status } = await computerUse.getStatus()
  if (status !== "active") await computerUse.start()
  return computerUse
}

// Keeps a runaway command or a huge file from flooding the model's context
const clip = (text: string, max = 20_000) =>
  text.length > max
    ? `${text.slice(0, max)}\n…[truncated ${text.length - max} chars]`
    : text

const point = { x: z.number().int().min(0), y: z.number().int().min(0) }

async function takeScreenshot() {
  const desktop = await getDesktop()
  const { screenshot } = await desktop.screenshot.takeCompressed({
    format: "jpeg",
    quality: 70,
    showCursor: true,
  })
  if (!screenshot) throw new Error("The screen could not be captured.")
  return { mediaType: "image/jpeg", base64: screenshot }
}

const screenTool = (description: string) =>
  tool({
    description,
    inputSchema: z.object({}),
    execute: takeScreenshot,
    // The model sees the image itself, not a wall of base64
    toModelOutput: ({ output }) => ({
      type: "content",
      value: [
        {
          type: "file",
          mediaType: output.mediaType,
          data: { type: "data", data: output.base64 },
        },
      ],
    }),
  })

export const computerTools = {
  bash: tool({
    description:
      "Run a bash command on your computer and get its combined output and exit code.",
    inputSchema: z.object({
      command: z.string(),
      cwd: z
        .string()
        .optional()
        .describe("Working directory. Defaults to your home directory."),
    }),
    execute: async ({ command, cwd }) => {
      const sandbox = await getSandbox()
      const { exitCode, result } = await sandbox.process.executeCommand(
        command,
        cwd,
        undefined,
        120
      )
      return { exitCode, output: clip(result) }
    },
  }),
  readFile: tool({
    description: "Read a text file on your computer.",
    inputSchema: z.object({ path: z.string() }),
    execute: async ({ path }) => {
      const sandbox = await getSandbox()
      return {
        content: clip((await sandbox.fs.downloadFile(path)).toString("utf8")),
      }
    },
  }),
  writeFile: tool({
    description: "Create or overwrite a text file on your computer.",
    inputSchema: z.object({ path: z.string(), content: z.string() }),
    execute: async ({ path, content }) => {
      const sandbox = await getSandbox()
      await sandbox.fs.uploadFile(Buffer.from(content), path)
      return { path, bytes: Buffer.byteLength(content) }
    },
  }),
  listFiles: tool({
    description: "List the files and folders in a directory on your computer.",
    inputSchema: z.object({ path: z.string() }),
    execute: async ({ path }) => {
      const sandbox = await getSandbox()
      const files = await sandbox.fs.listFiles(path)
      return files.map(({ name, isDir, size }) => ({ name, isDir, size }))
    },
  }),
  mouseClick: tool({
    description: "Click the mouse at a point on your screen.",
    inputSchema: z.object({
      ...point,
      button: z.enum(["left", "right", "middle"]).default("left"),
      double: z.boolean().default(false),
    }),
    execute: async ({ x, y, button, double }) =>
      (await getDesktop()).mouse.click(x, y, button, double),
  }),
  mouseMove: tool({
    description: "Move the mouse to a point on your screen.",
    inputSchema: z.object(point),
    execute: async ({ x, y }) => (await getDesktop()).mouse.move(x, y),
  }),
  mouseScroll: tool({
    description: "Scroll the mouse wheel at a point on your screen.",
    inputSchema: z.object({
      ...point,
      direction: z.enum(["up", "down"]),
      amount: z
        .number()
        .int()
        .min(1)
        .max(50)
        .default(3)
        .describe("Wheel ticks"),
    }),
    execute: async ({ x, y, direction, amount }) =>
      (await getDesktop()).mouse.scroll(x, y, direction, amount),
  }),
  keyboardType: tool({
    description:
      "Type text with the keyboard into whatever has focus. Newlines press Enter.",
    inputSchema: z.object({ text: z.string() }),
    execute: async ({ text }) => {
      await (await getDesktop()).keyboard.type(text)
      return { typed: text.length }
    },
  }),
  keyboardPress: tool({
    description:
      "Press one key, optionally with modifiers, e.g. key 'enter', or key 'c' with modifiers ['ctrl'].",
    inputSchema: z.object({
      key: z
        .string()
        .describe(
          "A key name such as enter, escape, tab, backspace, up, f5, a"
        ),
      modifiers: z.array(z.enum(["ctrl", "alt", "shift", "cmd"])).default([]),
    }),
    execute: async ({ key, modifiers }) => {
      await (await getDesktop()).keyboard.press(key, modifiers)
      return { pressed: [...modifiers, key].join("+") }
    },
  }),
  viewScreen: screenTool(
    "Look at your screen yourself, to see where things are before or after you act. The person does not see this screenshot. Use showScreen instead when they ask to see your screen."
  ),
  showScreen: screenTool(
    "Show the person a screenshot of your screen in the chat. Use only when they ask what is on your screen or ask to see it."
  ),
}
