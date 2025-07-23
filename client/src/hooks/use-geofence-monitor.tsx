import { useEffect, useRef, useState } from 'react';
import { PatrolSite } from '@shared/schema';
import { isWithinGeofence } from '@/lib/geofencing';
import { usePatrolSessions } from './use-patrol-sessions';
import { useToast } from './use-toast';

interface GeolocationData {
  latitude: number;
  longitude: number;
}

interface GeofenceState {
  [siteId: number]: {
    wasInside: boolean;
    lastCheck: number;
    entryTimer?: NodeJS.Timeout;
    exitTimer?: NodeJS.Timeout;
  };
}

export function useGeofenceMonitor(
  location: GeolocationData | null,
  sites: PatrolSite[],
  deviceId: string,
  enabled: boolean = true,
  gpsAccuracy: number = 5
) {
  const { startSession, endSession, getActiveSession } = usePatrolSessions(deviceId);
  const { toast } = useToast();
  const geofenceState = useRef<GeofenceState>({});
  const [autoEntries, setAutoEntries] = useState<number>(0);
  const [autoExits, setAutoExits] = useState<number>(0);
  
  // Minimum time between checks (5 seconds) to prevent rapid firing
  const CHECK_INTERVAL = 5000;
  
  // Minimum time to stay inside geofence before auto-enter (30 seconds)
  const ENTRY_DELAY = 30000;
  
  // Minimum time to stay outside geofence before auto-exit (60 seconds) 
  const EXIT_DELAY = 60000;

  useEffect(() => {
    if (!enabled || !location || sites.length === 0) return;

    const now = Date.now();
    
    sites.forEach((site) => {
      const siteId = site.id;
      const currentlyInside = isWithinGeofence(
        location.latitude,
        location.longitude,
        parseFloat(site.latitude),
        parseFloat(site.longitude),
        site.geofenceRadius,
        gpsAccuracy
      );

      // Initialize state for new sites
      if (!geofenceState.current[siteId]) {
        geofenceState.current[siteId] = {
          wasInside: currentlyInside,
          lastCheck: now,
        };
        return;
      }

      const state = geofenceState.current[siteId];
      const timeSinceLastCheck = now - state.lastCheck;
      
      // Skip if not enough time has passed
      if (timeSinceLastCheck < CHECK_INTERVAL) return;

      // Check for geofence entry
      if (!state.wasInside && currentlyInside) {
        // Clear any existing exit timer
        if (state.exitTimer) {
          clearTimeout(state.exitTimer);
          state.exitTimer = undefined;
        }
        
        // Just entered geofence - start timer
        state.wasInside = true;
        state.lastCheck = now;
        
        // Set timer for delayed entry
        state.entryTimer = setTimeout(() => {
          // Check if still inside after delay
          if (location && isWithinGeofence(
            location.latitude,
            location.longitude,
            parseFloat(site.latitude),
            parseFloat(site.longitude),
            site.geofenceRadius,
            gpsAccuracy
          )) {
            handleAutoEntry(site);
          }
          state.entryTimer = undefined;
        }, ENTRY_DELAY);
      }
      
      // Check for geofence exit
      else if (state.wasInside && !currentlyInside) {
        // Clear any existing entry timer
        if (state.entryTimer) {
          clearTimeout(state.entryTimer);
          state.entryTimer = undefined;
        }
        
        // Just left geofence - start timer
        state.wasInside = false;
        state.lastCheck = now;
        
        // Set timer for delayed exit
        state.exitTimer = setTimeout(() => {
          // Check if still outside after delay
          if (location && !isWithinGeofence(
            location.latitude,
            location.longitude,
            parseFloat(site.latitude),
            parseFloat(site.longitude),
            site.geofenceRadius,
            gpsAccuracy
          )) {
            handleAutoExit(site);
          }
          state.exitTimer = undefined;
        }, EXIT_DELAY);
      }
      
      // Update last check time
      state.lastCheck = now;
    });
  }, [location, sites, enabled]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(geofenceState.current).forEach(state => {
        if (state.entryTimer) {
          clearTimeout(state.entryTimer);
        }
        if (state.exitTimer) {
          clearTimeout(state.exitTimer);
        }
      });
    };
  }, []);

  const handleAutoEntry = async (site: PatrolSite) => {
    try {
      if (!location) return;
      
      // Check if already have active session
      const activeSession = getActiveSession(site.id);
      if (activeSession) return;

      // Create new session
      const sessionData = {
        siteId: site.id,
        entryLatitude: location.latitude.toString(),
        entryLongitude: location.longitude.toString(),
        entryAccuracy: '50', // Estimated accuracy for auto-entry
        entryWithinGeofence: true,
      };

      startSession(sessionData);
      setAutoEntries(prev => prev + 1);

      // Show notification
      toast({
        title: "Auto Entry Detected",
        description: `Automatically logged entry to ${site.name}`,
        duration: 4000,
      });

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }

      // Play notification sound if available
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMcAzKI1vHKeCsFJHPG8N2OQAoUXrTp66hVFApGn+DyvmMcAzKI1vHKeCsFJHPG8N2OQAoUXrTp66hVFApGn+DyvmMcAzKI1vHKeCsFJHPG8N2OQAoU');
        audio.volume = 0.3;
        audio.play().catch(() => {}); // Ignore errors
      } catch (e) {}

    } catch (error) {
      console.error('Auto-entry failed:', error);
    }
  };

  const handleAutoExit = async (site: PatrolSite) => {
    try {
      if (!location) return;
      
      // Find active session
      const activeSession = getActiveSession(site.id);
      if (!activeSession) return;

      // End session
      const exitData = {
        exitLatitude: location.latitude.toString(),
        exitLongitude: location.longitude.toString(),
        exitAccuracy: '50', // Estimated accuracy for auto-exit
        exitWithinGeofence: false,
      };

      endSession(activeSession.id, exitData);
      setAutoExits(prev => prev + 1);

      // Show notification
      toast({
        title: "Auto Exit Detected", 
        description: `Automatically logged exit from ${site.name}`,
        duration: 4000,
      });

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 50, 200]);
      }

    } catch (error) {
      console.error('Auto-exit failed:', error);
    }
  };

  return {
    autoEntries,
    autoExits,
    isMonitoring: enabled && !!location && sites.length > 0,
  };
} 