import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PatrolSession, PatrolSite } from "@shared/schema";
import AppHeader from "@/components/app-header";
import BottomNavigation from "@/components/bottom-navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGeolocation } from "@/hooks/use-geolocation";
import { usePatrolSessions } from "@/hooks/use-patrol-sessions";
import { formatDistanceToNow } from "date-fns";
import { MapPin, Clock, Timer, CheckCircle, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function Logs() {
  const [deviceId] = useState(() => localStorage.getItem('patrol-device-id') || '');
  const { location, accuracy, isLoading: locationLoading, error: locationError } = useGeolocation();
  const { getAllSessions, clearAllSessions, formatMilitaryTime } = usePatrolSessions(deviceId);

  // Get sessions from local storage instead of API
  const sessions = getAllSessions();
  const sessionsLoading = false;

  const { data: sites = [] } = useQuery<PatrolSite[]>({
    queryKey: ['/api/patrol-sites'],
  });

  const getSiteName = (siteId: number) => {
    const site = sites.find(s => s.id === siteId);
    return site?.name || `Site #${siteId}`;
  };

  const getSiteAddress = (siteId: number) => {
    const site = sites.find(s => s.id === siteId);
    return site?.address || 'Unknown address';
  };



  const getSessionStatus = (session: any) => {
    return session.exitTime ? 'Complete' : 'Active';
  };

  const getSessionIcon = (session: any) => {
    return session.exitTime ? CheckCircle : Timer;
  };

  const getSessionColor = (session: any) => {
    return session.exitTime ? 'text-success' : 'text-primary';
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
          <h2 className="text-lg font-medium">Patrol Sessions</h2>
          <span className="text-xs text-gray-400 surface-container px-2 py-1 rounded">
            {sessions.length} sessions
          </span>
        </div>

        {/* Stats Card */}
        <Card className="mb-6 surface-variant border-0">
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xl font-bold text-white">{sessions.filter(s => s.exitTime).length}</p>
                <p className="text-xs text-gray-400">Completed</p>
              </div>
              <div>
                <p className="text-xl font-bold text-white">{sessions.filter(s => !s.exitTime).length}</p>
                <p className="text-xs text-gray-400">Active</p>
              </div>
              <div>
                <p className="text-xl font-bold text-white">{new Set(sessions.map(s => s.siteId)).size}</p>
                <p className="text-xs text-gray-400">Sites</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Clear All Button */}
        {sessions.length > 0 && (
          <div className="mb-4">
            <Button
              onClick={() => clearAllSessions()}
              variant="outline"
              size="sm"
              className="text-red-400 border-red-400 hover:bg-red-400/10"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All Sessions
            </Button>
          </div>
        )}

        {/* Sessions List */}
        {sessions.length === 0 ? (
          <Card className="surface-variant border-0">
            <CardContent className="p-8 text-center">
              <Clock className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h3 className="font-medium text-white mb-2">No Sessions Yet</h3>
              <p className="text-sm text-gray-400">
                Start patrolling sites to see your activity sessions here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => {
              const SessionIcon = getSessionIcon(session);
              const siteName = getSiteName(session.siteId);
              const siteAddress = getSiteAddress(session.siteId);
              
              return (
                <Card key={session.id} className="surface-variant border-0">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-full ${getSessionColor(session)}`}>
                        <SessionIcon className="h-4 w-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-medium text-white truncate">
                            {siteName}
                          </h3>
                          <span className="text-xs text-gray-400 ml-2">
                            {formatDistanceToNow(new Date(session.entryTime), { addSuffix: true })}
                          </span>
                        </div>
                        
                        <div className="space-y-1 text-xs text-gray-400">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span className="font-mono">
                              Entered: {formatMilitaryTime(session.entryTime)}
                              {session.exitTime && ` | Exited: ${formatMilitaryTime(session.exitTime)}`}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-3 w-3" />
                              <span>
                                {session.entryAccuracy ? `±${session.entryAccuracy}m` : 'GPS'}
                              </span>
                            </div>
                            {session.duration && (
                              <div className="flex items-center space-x-1">
                                <Timer className="h-3 w-3" />
                                <span>{session.duration} min</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-500 truncate mt-2">
                          {siteAddress}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <BottomNavigation currentRoute="/logs" />
    </div>
  );
}