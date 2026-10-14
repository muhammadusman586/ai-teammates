import { Daytona } from "@daytona/sdk"

// apiUrl is explicit: the SDK refuses to send the key to an endpoint it only found in a .env file
export const daytona = new Daytona({ apiUrl: "https://app.daytona.io/api" })
