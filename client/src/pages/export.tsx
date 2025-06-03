import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PatrolLog, PatrolSite } from "@shared/schema";
import AppHeader from "@/components/app-header";
import BottomNavigation from "@/components/bottom-navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGeolocation } from "@/hooks/use-geolocation";
import { exportLogsToCSV } from "@/lib/csv-export";
import { useToast } from "@/hooks/use-toast";
import { Download, FileText, Calendar, MapPin } from "lucide-react";

export default function Export() {
  const [deviceId] = useState(() => localStorage.getItem('patrol-device-id') || '');
  const [isExporting, setIsExporting] = useState(false);
  const { location, accuracy, isLoading: locationLoading, error: locationError } = useGeolocation();
  const { toast } = useToast();

  const { data: logs = [], isLoading: logsLoading } = useQuery<PatrolLog[]>({
    queryKey: ['/api/patrol-logs', deviceId],
    enabled: !!deviceId,
  });

  const { data: sites = [] } = useQuery<PatrolSite[]>({
    queryKey: ['/api/patrol-sites'],
  });

  const handleExportCSV = async () => {
    if (logs.length === 0) {
      toast({
        title: "No Data to Export",
        description: "There are no patrol logs to export yet.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    
    try {
      await exportLogsToCSV(logs, sites);
      
      toast({
        title: "Export Successful",
        description: `Exported ${logs.length} patrol logs to CSV file.`,
      });
      
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(100);
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export patrol logs. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getDateRange = () => {
    if (logs.length === 0) return 'No data';
    
    const dates = logs.map(log => new Date(log.timestamp)).sort((a, b) => a.getTime() - b.getTime());
    const oldest = dates[0];
    const newest = dates[dates.length - 1];
    
    if (oldest.toDateString() === newest.toDateString()) {
      return oldest.toLocaleDateString();
    }
    
    return `${oldest.toLocaleDateString()} - ${newest.toLocaleDateString()}`;
  };

  const getUniqueStats = () => {
    const uniqueSites = new Set(logs.map(log => log.siteId)).size;
    const uniqueDays = new Set(logs.map(log => new Date(log.timestamp).toDateString())).size;
    const entries = logs.filter(log => log.action === 'enter').length;
    const exits = logs.filter(log => log.action === 'exit').length;
    
    return { uniqueSites, uniqueDays, entries, exits };
  };

  const stats = getUniqueStats();

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
          <h2 className="text-lg font-medium">Export Data</h2>
          <span className="text-xs text-gray-400 surface-container px-2 py-1 rounded">
            CSV Format
          </span>
        </div>

        {/* Export Overview Card */}
        <Card className="mb-6 surface-variant border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <FileText className="h-5 w-5 mr-2 text-primary" />
              Export Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{logs.length}</p>
                <p className="text-xs text-gray-400">Total Logs</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{stats.uniqueSites}</p>
                <p className="text-xs text-gray-400">Sites Visited</p>
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Date Range
                </span>
                <span className="text-white">{getDateRange()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Device ID</span>
                <span className="text-white text-xs font-mono">{deviceId.slice(-8)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Entries/Exits</span>
                <span className="text-white">{stats.entries}/{stats.exits}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Export Actions */}
        <Card className="mb-6 surface-variant border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Export Options</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              <Button
                onClick={handleExportCSV}
                disabled={isExporting || logs.length === 0}
                className="w-full bg-primary hover:bg-primary/90 text-white py-3 text-sm font-medium touch-target"
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Exporting...' : 'Export to CSV'}
              </Button>
              
              <div className="text-xs text-gray-400 space-y-1">
                <p>• CSV includes timestamps, GPS coordinates, and site information</p>
                <p>• Data is exported with full audit trail details</p>
                <p>• Compatible with Excel and other spreadsheet applications</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Preview */}
        {logs.length > 0 && (
          <Card className="surface-variant border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Data Preview</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {logs.slice(0, 5).map((log) => {
                  const site = sites.find(s => s.id === log.siteId);
                  const timestamp = new Date(log.timestamp);
                  
                  return (
                    <div key={log.id} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-b-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {log.action === 'enter' ? 'Entered' : 'Exited'} {site?.name || `Site #${log.siteId}`}
                        </p>
                        <p className="text-xs text-gray-400">
                          {timestamp.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className={`h-3 w-3 ${log.isWithinGeofence ? 'text-success' : 'text-orange-400'}`} />
                        <span className="text-xs text-gray-400">
                          {parseFloat(log.latitude).toFixed(4)}, {parseFloat(log.longitude).toFixed(4)}
                        </span>
                      </div>
                    </div>
                  );
                })}
                
                {logs.length > 5 && (
                  <p className="text-center text-xs text-gray-400 pt-2">
                    ... and {logs.length - 5} more entries
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <BottomNavigation currentRoute="/export" />
    </div>
  );
}
