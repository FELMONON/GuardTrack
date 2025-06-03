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
    const newSession: OfflinePatrolSession = {
      id: Date.now(),
      deviceId,
      ...sessionData,
      entryTime: new Date(),
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

  const formatMilitaryTime = (date: Date) => {
    return date.toLocaleTimeString('en-CA', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return {
    startSession,
    endSession,
    getActiveSession,
    getAllSessions,
    clearAllSessions,
    formatMilitaryTime,
    sessions: offlineSessions.filter(session => session.deviceId === deviceId),
  };
}