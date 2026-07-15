import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const appInstallations = pgTable("app_installations", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const canvases = pgTable("canvases", {
  id: uuid("id").defaultRandom().primaryKey(),
  publicToken: text("public_token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
