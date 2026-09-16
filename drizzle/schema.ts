import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const savedClosetItems = mysqlTable("savedClosetItems", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  itemId: varchar("itemId", { length: 128 }).notNull(),
  payload: text("payload").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const savedGalleryLooks = mysqlTable("savedGalleryLooks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  lookId: varchar("lookId", { length: 128 }).notNull(),
  payload: text("payload").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type SavedClosetItem = typeof savedClosetItems.$inferSelect;
export type SavedGalleryLook = typeof savedGalleryLooks.$inferSelect;
