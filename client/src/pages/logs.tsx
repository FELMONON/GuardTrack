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

  // Format time in military time (24-hour format)
  const formatMilitaryTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-CA', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getSessionStatus = (session: PatrolSession) => {
    return session.exitTime ? 'Complete' : 'Active';
  };

  const getSessionIcon = (session: PatrolSession) => {
    return session.exitTime ? CheckCircle : Timer;
  };

  const getSessionColor = (session: PatrolSession) => {
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

        {/* Sessions List */}
        {sessionsLoading ? (
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="surface-variant rounded-lg p-4 material-shadow animate-pulse">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gray-600 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-600 rounded w-1/2 mb-2"></div>
                    <div className="h-3 bg-gray-600 rounded w-3/4 mb-1"></div>
                    <div className="h-3 bg-gray-600 rounded w-1/3"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
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
              const siteName = session.site?.name || `Site #${session.siteId}`;
              const siteAddress = session.site?.address || 'Unknown address';
              
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
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-400 mb-2">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span className="font-mono">
                              IN: {formatMilitaryTime(session.entryTime)}
                              {session.exitTime && ` | OUT: ${formatMilitaryTime(session.exitTime)}`}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 truncate">
                            {siteAddress}
                          </span>
                          {session.duration && (
                            <div className="flex items-center space-x-1 text-gray-400">
                              <Timer className="h-3 w-3" />
                              <span>{session.duration} min</span>
                            </div>
                          )}
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