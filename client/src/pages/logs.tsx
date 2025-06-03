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
          <div className="space-y-2">
            {(() => {
              // Group logs by site and date for better readability
              const groupedLogs = logs.reduce((groups: any, log) => {
                const date = new Date(log.timestamp).toDateString();
                const siteId = log.siteId;
                const key = `${siteId}-${date}`;
                
                if (!groups[key]) {
                  groups[key] = {
                    siteId,
                    siteName: getSiteName(siteId),
                    siteAddress: getSiteAddress(siteId),
                    date,
                    logs: []
                  };
                }
                groups[key].logs.push(log);
                return groups;
              }, {});

              return Object.values(groupedLogs).map((group: any) => (
                <Card key={`${group.siteId}-${group.date}`} className="surface-variant border-0">
                  <CardContent className="p-4">
                    <div className="mb-3">
                      <h4 className="font-medium text-white">{group.siteName}</h4>
                      <p className="text-xs text-gray-300">{group.siteAddress}</p>
                      <p className="text-xs text-gray-400">{group.date}</p>
                    </div>
                    
                    <div className="space-y-1">
                      {group.logs.map((log: any) => {
                        const timestamp = new Date(log.timestamp);
                        const militaryTime = timestamp.toLocaleTimeString('en-GB', { 
                          hour12: false,
                          hour: '2-digit', 
                          minute: '2-digit'
                        });
                        
                        return (
                          <div key={log.id} className="flex items-center justify-between py-1 text-sm">
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${log.action === 'enter' ? 'bg-success' : 'bg-orange-400'}`} />
                              <span className={log.action === 'enter' ? 'text-success' : 'text-orange-400'}>
                                {log.action === 'enter' ? 'IN' : 'OUT'}
                              </span>
                              <span className="text-white font-mono">{militaryTime}</span>
                              <span className="flex items-center text-xs text-gray-400">
                                <MapPin className="h-3 w-3 mr-1" />
                                {log.isWithinGeofence ? 'Range' : 'Remote'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              {log.syncedAt ? (
                                <Wifi className="h-3 w-3 text-success" />
                              ) : (
                                <WifiOff className="h-3 w-3 text-orange-400" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ));
            })()}
          </div>
        )}
      </main>

      <BottomNavigation currentRoute="/logs" />
    </div>
  );
}
