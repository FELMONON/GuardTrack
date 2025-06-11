import { patrolSites, patrolLogs, patrolSessions, type PatrolSite, type InsertPatrolSite, type PatrolLog, type InsertPatrolLog, type PatrolSession, type InsertPatrolSession } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, isNull, inArray } from "drizzle-orm";

export interface IStorage {
  // Patrol Sites
  getPatrolSites(): Promise<PatrolSite[]>;
  getPatrolSite(id: number): Promise<PatrolSite | undefined>;
  createPatrolSite(site: InsertPatrolSite): Promise<PatrolSite>;
  
  // Patrol Sessions (new unified logging)
  getPatrolSessions(deviceId?: string, limit?: number): Promise<(PatrolSession & { site: PatrolSite })[]>;
  startPatrolSession(sessionData: InsertPatrolSession): Promise<PatrolSession>;
  endPatrolSession(sessionId: number, exitData: { exitLatitude: string; exitLongitude: string; exitAccuracy?: string; exitWithinGeofence: boolean }): Promise<PatrolSession>;
  getActiveSession(deviceId: string, siteId: number): Promise<PatrolSession | undefined>;
  
  // Legacy Patrol Logs (keep for backward compatibility)
  getPatrolLogs(deviceId?: string, limit?: number): Promise<PatrolLog[]>;
  getPatrolLogsBySite(siteId: number, deviceId?: string): Promise<PatrolLog[]>;
  createPatrolLog(log: InsertPatrolLog): Promise<PatrolLog>;
  getUnsyncedLogs(deviceId: string): Promise<PatrolLog[]>;
  markLogsSynced(logIds: number[]): Promise<void>;
  
  // Analytics
  getRecentVisits(deviceId: string, hours?: number): Promise<(PatrolSession & { site: PatrolSite })[]>;
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

  // Patrol Sessions Methods
  async getPatrolSessions(deviceId?: string, limit = 100): Promise<(PatrolSession & { site: PatrolSite })[]> {
    const baseQuery = db.select({
      id: patrolSessions.id,
      siteId: patrolSessions.siteId,
      deviceId: patrolSessions.deviceId,
      entryTime: patrolSessions.entryTime,
      exitTime: patrolSessions.exitTime,
      entryLatitude: patrolSessions.entryLatitude,
      entryLongitude: patrolSessions.entryLongitude,
      exitLatitude: patrolSessions.exitLatitude,
      exitLongitude: patrolSessions.exitLongitude,
      entryAccuracy: patrolSessions.entryAccuracy,
      exitAccuracy: patrolSessions.exitAccuracy,
      entryWithinGeofence: patrolSessions.entryWithinGeofence,
      exitWithinGeofence: patrolSessions.exitWithinGeofence,
      duration: patrolSessions.duration,
      isActive: patrolSessions.isActive,
      syncedAt: patrolSessions.syncedAt,
      site: patrolSites,
    })
      .from(patrolSessions)
      .innerJoin(patrolSites, eq(patrolSessions.siteId, patrolSites.id))
      .orderBy(desc(patrolSessions.entryTime));

    if (deviceId) {
      return await baseQuery.where(eq(patrolSessions.deviceId, deviceId)).limit(limit);
    }

    return await baseQuery.limit(limit);
  }

  async startPatrolSession(sessionData: InsertPatrolSession): Promise<PatrolSession> {
    const [session] = await db
      .insert(patrolSessions)
      .values(sessionData)
      .returning();
    return session;
  }

  async endPatrolSession(sessionId: number, exitData: { exitLatitude: string; exitLongitude: string; exitAccuracy?: string; exitWithinGeofence: boolean }): Promise<PatrolSession> {
    const entryTime = await db.select({ entryTime: patrolSessions.entryTime }).from(patrolSessions).where(eq(patrolSessions.id, sessionId));
    const duration = entryTime.length > 0 ? Math.round((Date.now() - new Date(entryTime[0].entryTime).getTime()) / (1000 * 60)) : null;

    const [session] = await db
      .update(patrolSessions)
      .set({
        exitTime: new Date(),
        exitLatitude: exitData.exitLatitude,
        exitLongitude: exitData.exitLongitude,
        exitAccuracy: exitData.exitAccuracy,
        exitWithinGeofence: exitData.exitWithinGeofence,
        duration,
        isActive: false,
      })
      .where(eq(patrolSessions.id, sessionId))
      .returning();
    return session;
  }

  async getActiveSession(deviceId: string, siteId: number): Promise<PatrolSession | undefined> {
    const [session] = await db
      .select()
      .from(patrolSessions)
      .where(and(
        eq(patrolSessions.deviceId, deviceId),
        eq(patrolSessions.siteId, siteId),
        eq(patrolSessions.isActive, true)
      ));
    return session || undefined;
  }

  async getPatrolLogs(deviceId?: string, limit = 100): Promise<PatrolLog[]> {
    let query = db.select().from(patrolLogs).orderBy(desc(patrolLogs.timestamp));
    
    if (deviceId) {
      query = query.where(eq(patrolLogs.deviceId, deviceId));
    }
    
    return await query.limit(limit);
  }

  async getPatrolLogsBySite(siteId: number, deviceId?: string): Promise<PatrolLog[]> {
    if (deviceId) {
      return await db.select().from(patrolLogs)
        .where(and(
          eq(patrolLogs.siteId, siteId), 
          eq(patrolLogs.deviceId, deviceId)
        ))
        .orderBy(desc(patrolLogs.timestamp));
    }
    
    return await db.select().from(patrolLogs)
      .where(eq(patrolLogs.siteId, siteId))
      .orderBy(desc(patrolLogs.timestamp));
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
        isNull(patrolLogs.syncedAt)
      ))
      .orderBy(desc(patrolLogs.timestamp));
  }

  async markLogsSynced(logIds: number[]): Promise<void> {
    if (logIds.length === 0) return;
    
    await db.update(patrolLogs)
      .set({ syncedAt: new Date() })
      .where(inArray(patrolLogs.id, logIds));
  }

  async getRecentVisits(deviceId: string, hours = 24): Promise<(PatrolSession & { site: PatrolSite })[]> {
    const sinceTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return await db.select({
      id: patrolSessions.id,
      siteId: patrolSessions.siteId,
      deviceId: patrolSessions.deviceId,
      entryTime: patrolSessions.entryTime,
      exitTime: patrolSessions.exitTime,
      entryLatitude: patrolSessions.entryLatitude,
      entryLongitude: patrolSessions.entryLongitude,
      exitLatitude: patrolSessions.exitLatitude,
      exitLongitude: patrolSessions.exitLongitude,
      entryAccuracy: patrolSessions.entryAccuracy,
      exitAccuracy: patrolSessions.exitAccuracy,
      entryWithinGeofence: patrolSessions.entryWithinGeofence,
      exitWithinGeofence: patrolSessions.exitWithinGeofence,
      duration: patrolSessions.duration,
      isActive: patrolSessions.isActive,
      syncedAt: patrolSessions.syncedAt,
      site: patrolSites,
    })
      .from(patrolSessions)
      .innerJoin(patrolSites, eq(patrolSessions.siteId, patrolSites.id))
      .where(and(
        eq(patrolSessions.deviceId, deviceId),
        gte(patrolSessions.entryTime, sinceTime)
      ))
      .orderBy(desc(patrolSessions.entryTime));
  }
}

export const storage = new DatabaseStorage();
