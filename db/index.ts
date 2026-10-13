import { parseEnv } from "@neon/env";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import config from "@/neon";
import * as schema from "./schema";

const { postgres } = parseEnv(config, ["DATABASE_URL"]);

// Pooled URL for app traffic; Railway runs a long-lived server, so one Pool is reused
export const db = drizzle({
  client: new Pool({ connectionString: postgres.databaseUrl }),
  schema,
});
