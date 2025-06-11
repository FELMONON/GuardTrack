import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPatrolLogSchema, insertPatrolSiteSchema, insertPatrolSessionSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all patrol sites
  app.get("/api/patrol-sites", async (req, res) => {
    try {
      const sites = await storage.getPatrolSites();
      res.json(sites);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch patrol sites" });
    }
  });

  // Create a new patrol site (for admin use)
  app.post("/api/patrol-sites", async (req, res) => {
    try {
      const siteData = insertPatrolSiteSchema.parse(req.body);
      const site = await storage.createPatrolSite(siteData);
      res.status(201).json(site);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid site data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create patrol site" });
      }
    }
  });

  // Get patrol logs
  app.get("/api/patrol-logs", async (req, res) => {
    try {
      const deviceId = req.query.deviceId as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const logs = await storage.getPatrolLogs(deviceId, limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch patrol logs" });
    }
  });

  // Create a new patrol log
  app.post("/api/patrol-logs", async (req, res) => {
    try {
      const logData = insertPatrolLogSchema.parse(req.body);
      const log = await storage.createPatrolLog(logData);
      res.status(201).json(log);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid log data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create patrol log" });
      }
    }
  });

  // Enhanced patrol action with session-based logging
  app.post("/api/patrol-action", async (req, res) => {
    try {
      const { siteId, deviceId, action, latitude, longitude, accuracy, isWithinGeofence } = req.body;
      
      // Input validation
      if (!siteId || !deviceId || !action || latitude === undefined || longitude === undefined) {
        return res.status(400).json({ 
          error: "Missing required fields: siteId, deviceId, action, latitude, longitude" 
        });
      }
      
      if (!['enter', 'exit'].includes(action)) {
        return res.status(400).json({ 
          error: "Invalid action. Must be 'enter' or 'exit'" 
        });
      }
      
      if (typeof siteId !== 'number' || typeof latitude !== 'number' || typeof longitude !== 'number') {
        return res.status(400).json({ 
          error: "siteId, latitude, and longitude must be numbers" 
        });
      }
      
      if (typeof deviceId !== 'string' || deviceId.trim().length === 0) {
        return res.status(400).json({ 
          error: "deviceId must be a non-empty string" 
        });
      }
      
      if (action === 'enter') {
        // Check if there's already an active session for this device and site
        const activeSession = await storage.getActiveSession(deviceId, siteId);
        
        if (activeSession) {
          return res.status(400).json({ error: "Already have an active session at this site" });
        }
        
        // Start new session
        const sessionData = {
          siteId,
          deviceId,
          entryLatitude: latitude.toString(),
          entryLongitude: longitude.toString(),
          entryAccuracy: accuracy ? accuracy.toString() : undefined,
          entryWithinGeofence: Boolean(isWithinGeofence),
          isActive: true,
        };
        
        const session = await storage.startPatrolSession(sessionData);
        res.status(201).json({ action: 'enter', session });
        
      } else if (action === 'exit') {
        // Find active session for this device and site
        const activeSession = await storage.getActiveSession(deviceId, siteId);
        
        if (!activeSession) {
          return res.status(400).json({ error: "No active session found to exit" });
        }
        
        // End the session
        const exitData = {
          exitLatitude: latitude.toString(),
          exitLongitude: longitude.toString(),
          exitAccuracy: accuracy ? accuracy.toString() : undefined,
          exitWithinGeofence: Boolean(isWithinGeofence),
        };
        
        const session = await storage.endPatrolSession(activeSession.id, exitData);
        res.status(200).json({ action: 'exit', session });
      }
      
    } catch (error) {
      console.error('Error in patrol-action:', error);
      res.status(500).json({ error: "Failed to process patrol action" });
    }
  });

  // Get patrol logs by site
  app.get("/api/patrol-logs/site/:siteId", async (req, res) => {
    try {
      const siteId = parseInt(req.params.siteId);
      const deviceId = req.query.deviceId as string;
      const logs = await storage.getPatrolLogsBySite(siteId, deviceId);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch site logs" });
    }
  });

  // Sync offline logs
  app.post("/api/sync-logs", async (req, res) => {
    try {
      const { logs } = req.body;
      
      // Input validation
      if (!logs || !Array.isArray(logs)) {
        return res.status(400).json({ 
          error: "Invalid request body. 'logs' must be an array" 
        });
      }
      
      if (logs.length === 0) {
        return res.json({ synced: 0, logs: [] });
      }
      
      const syncedLogs = [];
      const errors = [];
      
      for (let i = 0; i < logs.length; i++) {
        try {
          const logData = logs[i];
          const validatedLog = insertPatrolLogSchema.parse(logData);
          const log = await storage.createPatrolLog(validatedLog);
          syncedLogs.push(log);
        } catch (validationError: unknown) {
          console.error(`Error syncing log at index ${i}:`, validationError);
          errors.push({
            index: i,
            error: validationError instanceof z.ZodError ? validationError.errors : String(validationError)
          });
        }
      }
      
      res.json({ 
        synced: syncedLogs.length, 
        logs: syncedLogs,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error('Error in sync-logs:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid log data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to sync logs" });
      }
    }
  });

  // Get recent visits for analytics
  app.get("/api/recent-visits", async (req, res) => {
    try {
      const deviceId = req.query.deviceId as string;
      const hours = req.query.hours ? parseInt(req.query.hours as string) : 24;
      
      if (!deviceId) {
        return res.status(400).json({ error: "Device ID is required" });
      }
      
      const visits = await storage.getRecentVisits(deviceId, hours);
      res.json(visits);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recent visits" });
    }
  });

  // Get patrol sessions with site information
  app.get("/api/patrol-sessions", async (req, res) => {
    try {
      const deviceId = req.query.deviceId as string;
      const limit = parseInt(req.query.limit as string) || 100;
      
      const sessions = await storage.getPatrolSessions(deviceId, limit);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch patrol sessions" });
    }
  });

  // Initialize default patrol sites if none exist
  app.post("/api/init-sites", async (req, res) => {
    try {
      const existingSites = await storage.getPatrolSites();
      if (existingSites.length === 0) {
        const defaultSites = [
          {
            name: "Delaney",
            address: "851 17 Ave NW, Calgary, AB T2M 5B8",
            latitude: "51.0447",
            longitude: "-114.0719",
            geofenceRadius: 60
          },
          {
            name: "Trico Homes HQ",
            address: "100-7711 Macleod Trail S, Calgary, AB",
            latitude: "50.9916",
            longitude: "-114.0708",
            geofenceRadius: 60
          },
          {
            name: "Shawville",
            address: "108 Shawville Pl SE, Calgary, AB",
            latitude: "50.9034",
            longitude: "-114.0105",
            geofenceRadius: 60
          },
          {
            name: "Centre Street",
            address: "2017 Centre St N, Calgary, AB T2E 2S9",
            latitude: "51.0814",
            longitude: "-114.0581",
            geofenceRadius: 60
          },
          {
            name: "Legacy",
            address: "47 Legacy Vw S E, Calgary, AB T2X 2C3",
            latitude: "50.9008",
            longitude: "-113.9564",
            geofenceRadius: 60
          },
          {
            name: "Trico Warehouse",
            address: "4214 54 Ave SE, Calgary, AB T2C 2E3",
            latitude: "50.9734",
            longitude: "-113.9584",
            geofenceRadius: 60
          }
        ];

        const createdSites = [];
        for (const siteData of defaultSites) {
          const site = await storage.createPatrolSite(siteData);
          createdSites.push(site);
        }
        
        res.json({ message: "Default sites initialized", sites: createdSites });
      } else {
        res.json({ message: "Sites already exist", sites: existingSites });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to initialize sites" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
