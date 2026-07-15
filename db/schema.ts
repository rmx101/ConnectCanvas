import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const appInstallations = pgTable("app_installations", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const canvases = pgTable("canvases", {
  id: uuid("id").defaultRandom().primaryKey(),
  publicToken: varchar("public_token", { length: 48 }).notNull().unique(),
  status: text("status").notNull().default("new"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
