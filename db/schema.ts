import { boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const todos = pgTable(
  "todos",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: text("user_id").notNull(), // Clerk user id
    title: text().notNull(),
    completed: boolean().notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("todos_user_id_idx").on(t.userId)]
);
