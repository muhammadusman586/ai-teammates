import { loadEnvConfig } from "@next/env";
import { parseEnv } from "@neon/env";
import { defineConfig } from "drizzle-kit";

import config from "./neon";

loadEnvConfig(process.cwd());
// Schema push needs the direct (non -pooler) connection
const { postgres } = parseEnv(config, ["DATABASE_URL_UNPOOLED"]);

export default defineConfig({
  schema: "./db/schema.ts",
  dialect: "postgresql",
  dbCredentials: { url: postgres.databaseUrlUnpooled },
  entities: { roles: { provider: "neon" } },
});
