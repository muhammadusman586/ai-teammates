import { nanoid } from "nanoid";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const bots = pgTable(
  "bots",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => nanoid()),
    userId: text("user_id").notNull(), // Clerk user id
    name: text().notNull(),
    avatar: text()
      .notNull()
      .$defaultFn(() => nanoid()), // seed for the bot's generated face
    job: text().notNull(), // what the bot is for, in a phrase
    instructions: text(), // how it should go about the job
    sandboxId: text("sandbox_id"), // sandbox provider id, created lazily
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("bots_user_id_idx").on(t.userId)]
);
