import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PatrolSite } from "@shared/schema";
import AppHeader from "@/components/app-header";
import BottomNavigation from "@/components/bottom-navigation";
import PatrolSiteCard from "@/components/patrol-site-card";
import { Button } from "@/components/ui/button";
import { useGeolocation } from "@/hooks/use-geolocation";
import { usePatrolSessions } from "@/hooks/use-patrol-sessions";
import { calculateDistance, isWithinGeofence } from "@/lib/geofencing";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw } from "lucide-react";

export default function Home() {
  const [deviceId] = useState(() => {
    let id = localStorage.getItem('patrol-device-id');
    if (!id) {
      id = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('patrol-device-id', id);
    }
    return id;
  });

  const { toast } = useToast();
  const { location, accuracy, isLoading: locationLoading, error: locationError } = useGeolocation();
  const { startSession, endSession, getActiveSession, sessions } = usePatrolSessions(deviceId);

  // Initialize default sites
  const initSitesMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/init-sites'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patrol-sites'] });
    },
  });

  // Fetch patrol sites
  const { data: sites = [], isLoading: sitesLoading } = useQuery<PatrolSite[]>({
    queryKey: ['/api/patrol-sites'],
    enabled: true,
  });

  // Handle patrol actions with unified session management and duplicate prevention
  const logActionMutation = useMutation({
    mutationFn: async ({ siteId, action }: { siteId: number; action: 'enter' | 'exit' }) => {
      if (!location) throw new Error('Location not available');
      
      const site = sites.find(s => s.id === siteId);
      if (!site) throw new Error('Site not found');

      const isWithinFence = isWithinGeofence(
        location.latitude,
        location.longitude,
        parseFloat(site.latitude),
        parseFloat(site.longitude),
        site.geofenceRadius
      );

      if (action === 'enter') {
        // Check for existing active session
        const activeSession = getActiveSession(siteId);
        if (activeSession) {
          throw new Error('Already have an active session at this site');
        }

        // Start new session with duplicate prevention
        const sessionData = {
          siteId,
          entryLatitude: location.latitude.toString(),
          entryLongitude: location.longitude.toString(),
          entryAccuracy: accuracy?.toString(),
          entryWithinGeofence: isWithinFence,
        };

        const newSession = startSession(sessionData);
        return { action: 'enter', session: newSession };

      } else if (action === 'exit') {
        // Find and end active session
        const activeSession = getActiveSession(siteId);
        if (!activeSession) {
          throw new Error('No active session found to exit');
        }

        const exitData = {
          exitLatitude: location.latitude.toString(),
          exitLongitude: location.longitude.toString(),
          exitAccuracy: accuracy?.toString(),
          exitWithinGeofence: isWithinFence,
        };

        endSession(activeSession.id, exitData);
        return { action: 'exit', session: activeSession };
      }
    },
    onSuccess: (data, { action, siteId }) => {
      const site = sites.find(s => s.id === siteId);
      toast({
        title: `${action === 'enter' ? 'Entered' : 'Exited'} Site`,
        description: `${action === 'enter' ? 'Started' : 'Completed'} patrol at ${site?.name}`,
        duration: 3000,
      });
      
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    },
    onError: (error: any, { action, siteId }) => {
      const site = sites.find(s => s.id === siteId);
      console.error('Failed to log action:', error);
      
      toast({
        title: "Action Failed",
        description: error.message || `Failed to ${action} at ${site?.name}`,
        variant: "destructive",
      });
    },
  });

  // Sort sites by distance from current location
  const sortedSites = location ? sites
    .map(site => ({
      ...site,
      distance: calculateDistance(
        location.latitude,
        location.longitude,
        parseFloat(site.latitude),
        parseFloat(site.longitude)
      ),
      isWithinGeofence: isWithinGeofence(
        location.latitude,
        location.longitude,
        parseFloat(site.latitude),
        parseFloat(site.longitude),
        site.geofenceRadius
      )
    }))
    .sort((a, b) => a.distance - b.distance)
    : sites.map(site => ({ ...site, distance: 0, isWithinGeofence: false }));

  // Get last visit for each site using local sessions
  const getLastVisit = (siteId: number) => {
    return sessions
      .filter(session => session.siteId === siteId)
      .sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime())[0];
  };

  // Initialize sites on first load
  useEffect(() => {
    if (sites.length === 0 && !sitesLoading) {
      initSitesMutation.mutate();
    }
  }, [sites.length, sitesLoading]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/patrol-sites'] });
    
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <AppHeader 
        location={location}
        accuracy={accuracy}
        isOnline={navigator.onLine}
        isLocationLoading={locationLoading}
        locationError={locationError}
      />

      <main className="px-4 py-4 pb-24">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Patrol Sites</h2>
          <span className="text-xs text-gray-400 surface-container px-2 py-1 rounded">
            Sorted by distance
          </span>
        </div>

        {sitesLoading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="surface-variant rounded-xl p-4 material-shadow animate-pulse">
                <div className="h-4 bg-gray-600 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-600 rounded w-2/3 mb-4"></div>
                <div className="flex space-x-3">
                  <div className="flex-1 h-12 bg-gray-600 rounded-lg"></div>
                  <div className="flex-1 h-12 bg-gray-600 rounded-lg"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedSites.map((site) => {
              const lastVisit = getLastVisit(site.id);
              return (
                <PatrolSiteCard
                  key={site.id}
                  site={site}
                  distance={site.distance}
                  isWithinGeofence={site.isWithinGeofence}
                  lastVisit={lastVisit}
                  onEnter={() => logActionMutation.mutate({ siteId: site.id, action: 'enter' })}
                  onExit={() => logActionMutation.mutate({ siteId: site.id, action: 'exit' })}
                  isLoading={logActionMutation.isPending}
                />
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <Button
        onClick={handleRefresh}
        className="fixed bottom-20 right-4 w-14 h-14 bg-primary hover:bg-primary/90 text-white rounded-full material-shadow-elevated transition-colors touch-target"
        size="icon"
      >
        <RefreshCw className="h-6 w-6" />
      </Button>

      <BottomNavigation currentRoute="/" />
    </div>
  );
}