import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PatrolLog, PatrolSite } from "@shared/schema";
import AppHeader from "@/components/app-header";
import BottomNavigation from "@/components/bottom-navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGeolocation } from "@/hooks/use-geolocation";
import { formatDistanceToNow } from "date-fns";
import { LogIn, LogOut, MapPin, Clock, Wifi, WifiOff } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function Logs() {
  const [deviceId] = useState(() => localStorage.getItem('patrol-device-id') || '');
  const { location, accuracy, isLoading: locationLoading, error: locationError } = useGeolocation();

  const { data: logs = [], isLoading: logsLoading } = useQuery<PatrolLog[]>({
    queryKey: [`/api/patrol-logs?deviceId=${deviceId}`],
    enabled: !!deviceId,
  });

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

  const getActionIcon = (action: string) => {
    return action === 'enter' ? LogIn : LogOut;
  };

  const getActionColor = (action: string) => {
    return action === 'enter' ? 'text-success' : 'text-orange-400';
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
          <h2 className="text-lg font-medium">Patrol Logs</h2>
          <span className="text-xs text-gray-400 surface-container px-2 py-1 rounded">
            {logs.length} entries
          </span>
        </div>

        {/* Stats Card */}
        <Card className="mb-6 surface-variant border-0">
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xl font-bold text-white">{logs.filter(l => l.action === 'enter').length}</p>
                <p className="text-xs text-gray-400">Entries</p>
              </div>
              <div>
                <p className="text-xl font-bold text-white">{logs.filter(l => l.action === 'exit').length}</p>
                <p className="text-xs text-gray-400">Exits</p>
              </div>
              <div>
                <p className="text-xl font-bold text-white">{new Set(logs.map(l => l.siteId)).size}</p>
                <p className="text-xs text-gray-400">Sites</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs List */}
        {logsLoading ? (
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
        ) : logs.length === 0 ? (
          <Card className="surface-variant border-0">
            <CardContent className="p-8 text-center">
              <Clock className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h3 className="font-medium text-white mb-2">No Logs Yet</h3>
              <p className="text-sm text-gray-400">
                Start patrolling sites to see your activity logs here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => {
              const ActionIcon = getActionIcon(log.action);
              const actionColor = getActionColor(log.action);
              const timestamp = new Date(log.timestamp);
              
              return (
                <Card key={log.id} className="surface-variant border-0">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${log.action === 'enter' ? 'bg-success/20' : 'bg-orange-400/20'}`}>
                        <ActionIcon className={`h-4 w-4 ${actionColor}`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-white truncate">
                            {log.action === 'enter' ? 'Entered' : 'Exited'} {getSiteName(log.siteId)}
                          </h4>
                          <div className="flex items-center space-x-1">
                            {log.syncedAt ? (
                              <Wifi className="h-3 w-3 text-success" />
                            ) : (
                              <WifiOff className="h-3 w-3 text-orange-400" />
                            )}
                          </div>
                        </div>
                        
                        <p className="text-xs text-gray-300 mb-2 truncate">
                          {getSiteAddress(log.siteId)}
                        </p>
                        
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <div className="flex items-center space-x-3">
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatDistanceToNow(timestamp, { addSuffix: true })}
                            </span>
                            <span className="flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              {log.isWithinGeofence ? 'In range' : 'Remote'}
                            </span>
                          </div>
                          <span className="text-xs">
                            {timestamp.toLocaleTimeString('en-US', { 
                              hour: 'numeric', 
                              minute: '2-digit',
                              hour12: true 
                            })}
                          </span>
                        </div>
                        
                        {log.accuracy && (
                          <div className="mt-1">
                            <span className="text-xs text-gray-500">
                              GPS accuracy: ±{parseFloat(log.accuracy).toFixed(0)}m
                            </span>
                          </div>
                        )}
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
