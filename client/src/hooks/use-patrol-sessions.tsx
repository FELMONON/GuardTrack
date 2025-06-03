import { useState, useEffect } from 'react';
import { PatrolSession, PatrolSite } from '@shared/schema';

interface OfflinePatrolSession {
  id: number;
  siteId: number;
  deviceId: string;
  entryTime: Date;
  exitTime: Date | null;
  entryLatitude: string;
  entryLongitude: string;
  exitLatitude?: string;
  exitLongitude?: string;
  entryAccuracy?: string;
  exitAccuracy?: string;
  entryWithinGeofence: boolean;
  exitWithinGeofence?: boolean;
  duration?: number;
  isActive: boolean;
  synced: boolean;
}

export function usePatrolSessions(deviceId: string) {
  const [offlineSessions, setOfflineSessions] = useState<OfflinePatrolSession[]>([]);

  // Load sessions from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('patrol-sessions');
    if (stored) {
      try {
        const sessions = JSON.parse(stored).map((session: any) => ({
          ...session,
          entryTime: new Date(session.entryTime),
          exitTime: session.exitTime ? new Date(session.exitTime) : null,
        }));
        setOfflineSessions(sessions);
      } catch (error) {
        console.error('Error loading sessions from localStorage:', error);
      }
    }
  }, []);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('patrol-sessions', JSON.stringify(offlineSessions));
  }, [offlineSessions]);

  const startSession = (sessionData: {
    siteId: number;
    entryLatitude: string;
    entryLongitude: string;
    entryAccuracy?: string;
    entryWithinGeofence: boolean;
  }) => {
    const now = new Date();
    
    // Check for recent sessions at the same site (within 60 seconds)
    const recentSession = offlineSessions.find(session => 
      session.siteId === sessionData.siteId &&
      session.deviceId === deviceId &&
      (now.getTime() - new Date(session.entryTime).getTime()) < 60000 // 60 seconds
    );

    if (recentSession) {
      // Don't create a new session, return the existing one
      console.log('Recent session found, skipping duplicate entry');
      return recentSession;
    }

    const newSession: OfflinePatrolSession = {
      id: Date.now(),
      deviceId,
      ...sessionData,
      entryTime: now,
      exitTime: null,
      isActive: true,
      synced: false,
    };

    setOfflineSessions(prev => [...prev, newSession]);
    return newSession;
  };

  const endSession = (sessionId: number, exitData: {
    exitLatitude: string;
    exitLongitude: string;
    exitAccuracy?: string;
    exitWithinGeofence: boolean;
  }) => {
    setOfflineSessions(prev => prev.map(session => {
      if (session.id === sessionId && session.isActive) {
        const exitTime = new Date();
        const duration = Math.round((exitTime.getTime() - session.entryTime.getTime()) / (1000 * 60));
        
        return {
          ...session,
          ...exitData,
          exitTime,
          duration,
          isActive: false,
        };
      }
      return session;
    }));
  };

  const getActiveSession = (siteId: number) => {
    return offlineSessions.find(session => 
      session.siteId === siteId && 
      session.deviceId === deviceId && 
      session.isActive
    );
  };

  const getAllSessions = () => {
    return offlineSessions
      .filter(session => session.deviceId === deviceId)
      .sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime());
  };

  const clearAllSessions = () => {
    setOfflineSessions([]);
    localStorage.removeItem('patrol-sessions');
  };

  // Auto-cleanup at shift times (18:00 start, 07:00 end)
  const checkShiftChange = () => {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const lastCleanup = localStorage.getItem('last-shift-cleanup');
    const today = now.toDateString();
    
    // Clean up at 18:00 (shift start) or 07:00 (shift end)
    if ((hour === 18 || hour === 7) && minute === 0) {
      if (lastCleanup !== `${today}-${hour}`) {
        clearAllSessions();
        localStorage.setItem('last-shift-cleanup', `${today}-${hour}`);
        console.log(`${hour === 18 ? 'Shift started' : 'Shift ended'} - cleared patrol history`);
      }
    }
  };

  const formatMilitaryTime = (date: Date) => {
    return date.toLocaleTimeString('en-CA', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Initialize and setup auto-cleanup
  useEffect(() => {
    // Check for shift change every minute
    const interval = setInterval(checkShiftChange, 60000);
    
    // Check immediately on load
    checkShiftChange();
    
    return () => clearInterval(interval);
  }, []);

  return {
    startSession,
    endSession,
    getActiveSession,
    getAllSessions,
    clearAllSessions,
    formatMilitaryTime,
    checkShiftChange, // Expose for manual testing
    sessions: offlineSessions.filter(session => session.deviceId === deviceId),
  };
}