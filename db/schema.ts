import { nanoid } from "nanoid";
import { relations } from "drizzle-orm";
import { index, pgEnum, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
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

export const chatKind = pgEnum("chat_kind", ["direct", "group"]);

export const chats = pgTable(
  "chats",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => nanoid()),
    userId: text("user_id").notNull(), // Clerk user id
    kind: chatKind().notNull().default("direct"),
    name: text(), // null for direct chats, which use the bot's name
    lastMessagePreview: text("last_message_preview"),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("chats_user_id_idx").on(t.userId)]
);

export const chatMembers = pgTable(
  "chat_members",
  {
    chatId: text("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    botId: text("bot_id")
      .notNull()
      .references(() => bots.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.chatId, t.botId] }), index("chat_members_bot_id_idx").on(t.botId)]
);

export const botsRelations = relations(bots, ({ many }) => ({
  memberships: many(chatMembers),
}));

export const chatsRelations = relations(chats, ({ many }) => ({
  members: many(chatMembers),
}));

export const chatMembersRelations = relations(chatMembers, ({ one }) => ({
  chat: one(chats, { fields: [chatMembers.chatId], references: [chats.id] }),
  bot: one(bots, { fields: [chatMembers.botId], references: [bots.id] }),
}));
