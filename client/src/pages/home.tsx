import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PatrolSite, PatrolSession } from "@shared/schema";
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
  const { startSession, endSession, getActiveSession, getAllSessions, sessions } = usePatrolSessions(deviceId);

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

  // Get recent patrol sessions for each site
  const { data: recentSessions = [] } = useQuery<(PatrolSession & { site: PatrolSite })[]>({
    queryKey: [`/api/patrol-sessions?deviceId=${deviceId}&limit=50`],
    enabled: !!deviceId,
  });

  // Log patrol action
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

      const logData = {
        siteId,
        deviceId,
        action,
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString(),
        accuracy: accuracy?.toString() || null,
        isWithinGeofence: isWithinFence,
      };

      try {
        return await apiRequest('POST', '/api/patrol-action', logData);
      } catch (error) {
        // Store session offline if API fails
        const sessionData = {
          ...logData,
          entryTime: new Date(),
          exitTime: action === 'exit' ? new Date() : null,
          isActive: action === 'enter',
          id: Date.now() // temporary ID
        };
        
        // Store in localStorage for persistence
        const existingSessions = JSON.parse(localStorage.getItem('offline-patrol-sessions') || '[]');
        existingSessions.push(sessionData);
        localStorage.setItem('offline-patrol-sessions', JSON.stringify(existingSessions));
        
        throw error;
      }
    },
    onSuccess: (_, { action, siteId }) => {
      const site = sites.find(s => s.id === siteId);
      toast({
        title: `${action === 'enter' ? 'Entered' : 'Exited'} Site`,
        description: `Successfully logged ${action} for ${site?.name}`,
        duration: 3000,
      });
      
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }

      queryClient.invalidateQueries({ queryKey: ['/api/recent-visits'] });
    },
    onError: (error) => {
      toast({
        title: "Action Logged Offline",
        description: "Your action was saved locally and will sync when online",
        duration: 3000,
      });
      
      // Still provide haptic feedback for offline logs
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
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

  // Get last visit for each site (using patrol sessions)
  const getLastVisit = (siteId: number) => {
    return recentSessions
      .filter(session => session.siteId === siteId)
      .sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime())[0];
  };

  // Initialize sites on first load
  useEffect(() => {
    if (sites.length === 0 && !sitesLoading) {
      initSitesMutation.mutate();
    }
  }, [sites.length, sitesLoading]);

  // Auto-sync offline logs when online
  useEffect(() => {
    if (navigator.onLine) {
      syncOfflineLogs();
    }
  }, [navigator.onLine]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/patrol-sites'] });
    queryClient.invalidateQueries({ queryKey: ['/api/recent-visits'] });
    syncOfflineLogs();
    
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
        style={{ zIndex: 1000 }}
      >
        <RefreshCw className="h-5 w-5" />
      </Button>

      <BottomNavigation currentRoute="/" />
    </div>
  );
}
