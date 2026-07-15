import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const appInstallations = pgTable("app_installations", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const canvases = pgTable("canvases", {
  id: uuid("id").defaultRandom().primaryKey(),
  publicToken: text("public_token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const participants = pgTable("participants", {
  id: uuid("id").defaultRandom().primaryKey(),
  canvasId: uuid("canvas_id").notNull().references(() => canvases.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  privateSessionTokenHash: text("private_session_token_hash").notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  privateSessionTokenHashIdx: uniqueIndex("participants_private_session_token_hash_idx").on(table.privateSessionTokenHash),
}));

export const responses = pgTable("responses", {
  id: uuid("id").defaultRandom().primaryKey(),
  participantId: uuid("participant_id").notNull().references(() => participants.id, { onDelete: "cascade" }),
  reflectionId: text("reflection_id").notNull(),
  responseText: text("response_text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  participantReflectionIdx: uniqueIndex("responses_participant_reflection_idx").on(table.participantId, table.reflectionId),
}));

export const canvasesRelations = relations(canvases, ({ many }) => ({
  participants: many(participants),
}));

export const participantsRelations = relations(participants, ({ one, many }) => ({
  canvas: one(canvases, {
    fields: [participants.canvasId],
    references: [canvases.id],
  }),
  responses: many(responses),
}));

export const responsesRelations = relations(responses, ({ one }) => ({
  participant: one(participants, {
    fields: [responses.participantId],
    references: [participants.id],
  }),
}));
