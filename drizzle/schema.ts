import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/**
 * 登录用户的娱乐占卜档案。cardsJson / plumJson 保留一次结果所需的完整展示数据，
 * ritualNonce 与 seedFingerprint 仅用于对同次仪式进行审计和复现，不存储原始种子。
 */
export const divinationRecords = mysqlTable("divinationRecords", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  question: text("question").notNull(),
  numberA: int("numberA").notNull(),
  numberB: int("numberB").notNull(),
  numberC: int("numberC").notNull(),
  ritualNonce: varchar("ritualNonce", { length: 64 }).notNull(),
  seedFingerprint: varchar("seedFingerprint", { length: 16 }).notNull(),
  cardsJson: text("cardsJson").notNull(),
  plumJson: text("plumJson").notNull(),
  interpretation: text("interpretation").notNull(),
  status: mysqlEnum("status", ["draft", "complete"]).notNull().default("draft"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type DivinationRecord = typeof divinationRecords.$inferSelect;
export type InsertDivinationRecord = typeof divinationRecords.$inferInsert;

// TODO: Add your tables here
