import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PatrolSite } from "@shared/schema";
import AppHeader from "@/components/app-header";
import BottomNavigation from "@/components/bottom-navigation";
import PatrolSiteCard from "@/components/patrol-site-card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useGeolocation } from "@/hooks/use-geolocation";
import { usePatrolSessions } from "@/hooks/use-patrol-sessions";
import { useGeofenceMonitor } from "@/hooks/use-geofence-monitor";
import { calculateDistance, isWithinGeofence } from "@/lib/geofencing";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, MapPin, Zap } from "lucide-react";

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

  // Auto-detection toggle
  const [autoDetectionEnabled, setAutoDetectionEnabled] = useState(() => {
    return localStorage.getItem('auto-detection-enabled') !== 'false';
  });
  
  // Start automatic geofence monitoring
  const { autoEntries, autoExits, isMonitoring } = useGeofenceMonitor(
    location,
    sites,
    deviceId,
    autoDetectionEnabled
  );

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

  // Get last visit for each site (using local patrol sessions)
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
    queryClient.invalidateQueries({ queryKey: ['/api/recent-visits'] });
    
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
  };

  const toggleAutoDetection = (enabled: boolean) => {
    setAutoDetectionEnabled(enabled);
    localStorage.setItem('auto-detection-enabled', enabled.toString());
    
    toast({
      title: enabled ? "Auto-Detection Enabled" : "Auto-Detection Disabled",
      description: enabled 
        ? "Will automatically log entry/exit when you cross geofences" 
        : "Manual entry/exit buttons required",
      duration: 3000,
    });
    
    if ('vibrate' in navigator) {
      navigator.vibrate(enabled ? [50, 50, 100] : [200]);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <AppHeader 
        location={location}
        accuracy={accuracy}
        isOnline={navigator.onLine}
        isLocationLoading={locationLoading}
        locationError={locationError}
      />

      <main className="px-6 py-6 pb-24 space-clean-lg">
        {/* Page Header */}
        <div className="space-clean-sm">
          <h1 className="text-2xl font-semibold text-primary">Patrol Sites</h1>
          <p className="text-secondary text-sm">
            {location ? 'Sorted by your distance' : 'Enable location to see distances'}
          </p>
        </div>

        {/* Auto-Detection Panel */}
        <div className="clean-card p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${isMonitoring ? 'bg-green-50' : 'bg-gray-50'}`}>
                <MapPin className={`h-5 w-5 ${isMonitoring ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <h3 className="font-medium text-primary">Auto-Detection</h3>
                <p className="text-xs text-tertiary">
                  {isMonitoring ? 'Monitoring your location' : 'Disabled'}
                </p>
              </div>
            </div>
            <Switch
              checked={autoDetectionEnabled}
              onCheckedChange={toggleAutoDetection}
              className="focus-clean"
            />
          </div>
          
          {autoDetectionEnabled && (autoEntries > 0 || autoExits > 0) && (
            <div className="flex items-center space-x-6 pt-3 border-t border-gray-100">
              <div className="flex items-center space-x-2">
                <div className="status-dot bg-green-500"></div>
                <span className="text-sm text-secondary">Entries: {autoEntries}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="status-dot bg-orange-500"></div>
                <span className="text-sm text-secondary">Exits: {autoExits}</span>
              </div>
            </div>
          )}
        </div>

        {/* Sites Section */}
        {sitesLoading ? (
          <div className="space-clean">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="clean-card p-5 animate-pulse">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <div className="flex-1 h-10 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1 h-10 bg-gray-200 rounded-lg"></div>
                </div>
              </div>
            ))}
          </div>
        ) : sortedSites.length === 0 ? (
          <div className="clean-card p-8 text-center">
            <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-medium text-primary mb-2">No Sites Available</h3>
            <p className="text-secondary text-sm mb-4">Add patrol sites to get started</p>
            <Button 
              onClick={() => initSitesMutation.mutate()}
              className="clean-button clean-button-primary"
              disabled={initSitesMutation.isPending}
            >
              {initSitesMutation.isPending ? 'Loading...' : 'Load Default Sites'}
            </Button>
          </div>
        ) : (
          <div className="space-clean">
            {sortedSites.map((site, index) => {
              const lastVisit = getLastVisit(site.id);
              return (
                <div key={site.id} className="animate-fade-in" 
                     style={{ animationDelay: `${index * 50}ms` }}>
                  <PatrolSiteCard
                    site={site}
                    distance={site.distance}
                    isWithinGeofence={site.isWithinGeofence}
                    lastVisit={lastVisit}
                    onEnter={() => logActionMutation.mutate({ siteId: site.id, action: 'enter' })}
                    onExit={() => logActionMutation.mutate({ siteId: site.id, action: 'exit' })}
                    isLoading={logActionMutation.isPending}
                  />
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Refresh Button */}
      <div className="fixed bottom-24 right-6 z-50">
        <Button
          onClick={handleRefresh}
          className="w-12 h-12 bg-white shadow-clean-md hover:shadow-lg border border-gray-200 rounded-full transition-all duration-200 focus-clean touch-target"
          size="icon"
        >
          <RefreshCw className="h-4 w-4 text-gray-600" />
        </Button>
      </div>

      <BottomNavigation currentRoute="/" />
    </div>
  );
}
