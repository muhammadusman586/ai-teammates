import { nanoid } from "nanoid";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

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

// Only user-editable fields; userId comes from the session, never the client
export const insertBotSchema = createInsertSchema(bots, {
  name: (s) => s.trim().min(1, "Name is required.").max(50),
  job: (s) => s.trim().min(1, "Job is required.").max(200),
  instructions: (s) => s.max(4000),
}).pick({ name: true, avatar: true, job: true, instructions: true });
