import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const patrolSites = pgTable("patrol_sites", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  geofenceRadius: integer("geofence_radius").notNull().default(60), // meters
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const patrolLogs = pgTable("patrol_logs", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").notNull().references(() => patrolSites.id),
  deviceId: text("device_id").notNull(),
  action: text("action").notNull(), // 'enter' or 'exit'
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  accuracy: decimal("accuracy", { precision: 6, scale: 2 }), // GPS accuracy in meters
  isWithinGeofence: boolean("is_within_geofence").notNull().default(false),
  syncedAt: timestamp("synced_at"), // null if not synced to server yet
});

export const patrolSitesRelations = relations(patrolSites, ({ many }) => ({
  logs: many(patrolLogs),
}));

export const patrolLogsRelations = relations(patrolLogs, ({ one }) => ({
  site: one(patrolSites, {
    fields: [patrolLogs.siteId],
    references: [patrolSites.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertPatrolSiteSchema = createInsertSchema(patrolSites).omit({
  id: true,
  createdAt: true,
});

export const insertPatrolLogSchema = createInsertSchema(patrolLogs).omit({
  id: true,
  timestamp: true,
  syncedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type PatrolSite = typeof patrolSites.$inferSelect;
export type InsertPatrolSite = z.infer<typeof insertPatrolSiteSchema>;
export type PatrolLog = typeof patrolLogs.$inferSelect;
export type InsertPatrolLog = z.infer<typeof insertPatrolLogSchema>;
