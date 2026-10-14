import { Daytona } from "@daytona/sdk"

// apiUrl is explicit: the SDK refuses to send the key to an endpoint it only found in a .env file
export const daytona = new Daytona({ apiUrl: "https://app.daytona.io/api" })

// Wakes the sandbox and its desktop, then returns a noVNC page an iframe can open without headers
export async function getDesktopUrl(sandboxId: string) {
  const sandbox = await daytona.get(sandboxId)
  if (sandbox.state === "starting") await sandbox.waitUntilStarted()
  else if (sandbox.state !== "started") await sandbox.start()

  const { status } = await sandbox.computerUse.getStatus()
  if (status !== "active") await sandbox.computerUse.start()

  // Bound to the noVNC port only; 24h, the max, so an open tab doesn't lose its desktop mid-session
  const { url } = await sandbox.getSignedPreviewUrl(6080, 86_400)
  return `${url}/vnc.html?autoconnect=true&resize=scale&reconnect=true`
}
