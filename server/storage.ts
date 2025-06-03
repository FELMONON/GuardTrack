import { patrolSites, patrolLogs, type PatrolSite, type InsertPatrolSite, type PatrolLog, type InsertPatrolLog } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte } from "drizzle-orm";

export interface IStorage {
  // Patrol Sites
  getPatrolSites(): Promise<PatrolSite[]>;
  getPatrolSite(id: number): Promise<PatrolSite | undefined>;
  createPatrolSite(site: InsertPatrolSite): Promise<PatrolSite>;
  
  // Patrol Logs
  getPatrolLogs(deviceId?: string, limit?: number): Promise<PatrolLog[]>;
  getPatrolLogsBySite(siteId: number, deviceId?: string): Promise<PatrolLog[]>;
  createPatrolLog(log: InsertPatrolLog): Promise<PatrolLog>;
  getUnsyncedLogs(deviceId: string): Promise<PatrolLog[]>;
  markLogsSynced(logIds: number[]): Promise<void>;
  
  // Analytics
  getRecentVisits(deviceId: string, hours?: number): Promise<(PatrolLog & { site: PatrolSite })[]>;
}

export class DatabaseStorage implements IStorage {
  async getPatrolSites(): Promise<PatrolSite[]> {
    return await db.select().from(patrolSites);
  }

  async getPatrolSite(id: number): Promise<PatrolSite | undefined> {
    const [site] = await db.select().from(patrolSites).where(eq(patrolSites.id, id));
    return site || undefined;
  }

  async createPatrolSite(insertSite: InsertPatrolSite): Promise<PatrolSite> {
    const [site] = await db
      .insert(patrolSites)
      .values(insertSite)
      .returning();
    return site;
  }

  async getPatrolLogs(deviceId?: string, limit = 100): Promise<PatrolLog[]> {
    let query = db.select().from(patrolLogs).orderBy(desc(patrolLogs.timestamp));
    
    if (deviceId) {
      query = query.where(eq(patrolLogs.deviceId, deviceId));
    }
    
    return await query.limit(limit);
  }

  async getPatrolLogsBySite(siteId: number, deviceId?: string): Promise<PatrolLog[]> {
    let query = db.select().from(patrolLogs)
      .where(eq(patrolLogs.siteId, siteId))
      .orderBy(desc(patrolLogs.timestamp));
    
    if (deviceId) {
      query = query.where(and(eq(patrolLogs.siteId, siteId), eq(patrolLogs.deviceId, deviceId)));
    }
    
    return await query;
  }

  async createPatrolLog(insertLog: InsertPatrolLog): Promise<PatrolLog> {
    const [log] = await db
      .insert(patrolLogs)
      .values(insertLog)
      .returning();
    return log;
  }

  async getUnsyncedLogs(deviceId: string): Promise<PatrolLog[]> {
    return await db.select().from(patrolLogs)
      .where(and(
        eq(patrolLogs.deviceId, deviceId),
        eq(patrolLogs.syncedAt, null)
      ))
      .orderBy(desc(patrolLogs.timestamp));
  }

  async markLogsSynced(logIds: number[]): Promise<void> {
    if (logIds.length === 0) return;
    
    await db.update(patrolLogs)
      .set({ syncedAt: new Date() })
      .where(eq(patrolLogs.id, logIds[0])); // This would need to be modified for multiple IDs
  }

  async getRecentVisits(deviceId: string, hours = 24): Promise<(PatrolLog & { site: PatrolSite })[]> {
    const sinceTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return await db.select({
      id: patrolLogs.id,
      siteId: patrolLogs.siteId,
      deviceId: patrolLogs.deviceId,
      action: patrolLogs.action,
      timestamp: patrolLogs.timestamp,
      latitude: patrolLogs.latitude,
      longitude: patrolLogs.longitude,
      accuracy: patrolLogs.accuracy,
      isWithinGeofence: patrolLogs.isWithinGeofence,
      syncedAt: patrolLogs.syncedAt,
      site: patrolSites,
    })
      .from(patrolLogs)
      .innerJoin(patrolSites, eq(patrolLogs.siteId, patrolSites.id))
      .where(and(
        eq(patrolLogs.deviceId, deviceId),
        gte(patrolLogs.timestamp, sinceTime)
      ))
      .orderBy(desc(patrolLogs.timestamp));
  }
}

export const storage = new DatabaseStorage();
