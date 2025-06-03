import { useState, useEffect } from "react";
import AppHeader from "@/components/app-header";
import BottomNavigation from "@/components/bottom-navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useOfflineStorage } from "@/hooks/use-offline-storage";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Smartphone, Wifi, Trash2, RotateCcw, Shield, MapPin } from "lucide-react";

export default function Settings() {
  const [deviceId] = useState(() => localStorage.getItem('patrol-device-id') || '');
  const [hapticEnabled, setHapticEnabled] = useState(() => {
    return localStorage.getItem('haptic-enabled') !== 'false';
  });
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(() => {
    return localStorage.getItem('auto-sync-enabled') !== 'false';
  });
  const [highAccuracyGPS, setHighAccuracyGPS] = useState(() => {
    return localStorage.getItem('high-accuracy-gps') !== 'false';
  });

  const { location, accuracy, isLoading: locationLoading, error: locationError } = useGeolocation();
  const { clearOfflineData, getOfflineStats, syncOfflineLogs } = useOfflineStorage();
  const { toast } = useToast();

  const [offlineStats, setOfflineStats] = useState({ logs: 0, sites: 0, storage: '0 KB' });

  useEffect(() => {
    getOfflineStats().then(setOfflineStats);
  }, []);

  const handleHapticToggle = (enabled: boolean) => {
    setHapticEnabled(enabled);
    localStorage.setItem('haptic-enabled', enabled.toString());
    
    if (enabled && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  const handleAutoSyncToggle = (enabled: boolean) => {
    setAutoSyncEnabled(enabled);
    localStorage.setItem('auto-sync-enabled', enabled.toString());
    
    toast({
      title: enabled ? "Auto-sync Enabled" : "Auto-sync Disabled",
      description: enabled ? 
        "Data will sync automatically when online" : 
        "You'll need to manually sync data",
    });
  };

  const handleHighAccuracyToggle = (enabled: boolean) => {
    setHighAccuracyGPS(enabled);
    localStorage.setItem('high-accuracy-gps', enabled.toString());
    
    toast({
      title: enabled ? "High Accuracy GPS Enabled" : "Standard GPS Mode",
      description: enabled ? 
        "GPS will use high accuracy mode (higher battery usage)" : 
        "GPS will use balanced accuracy mode",
    });
  };

  const handleClearData = async () => {
    if (confirm('Are you sure you want to clear all offline data? This cannot be undone.')) {
      try {
        await clearOfflineData();
        setOfflineStats({ logs: 0, sites: 0, storage: '0 KB' });
        
        toast({
          title: "Data Cleared",
          description: "All offline data has been removed from this device.",
        });
      } catch (error) {
        toast({
          title: "Clear Failed",
          description: "Failed to clear offline data. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleManualSync = async () => {
    try {
      await syncOfflineLogs();
      toast({
        title: "Sync Complete",
        description: "All offline data has been synchronized.",
      });
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Failed to sync data. Check your connection and try again.",
        variant: "destructive",
      });
    }
  };

  const getBatteryInfo = () => {
    // Battery API is deprecated but still available in some browsers
    if ('getBattery' in navigator) {
      return "Battery info available";
    }
    return "Battery info not supported";
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
          <h2 className="text-lg font-medium">Settings</h2>
          <SettingsIcon className="h-5 w-5 text-gray-400" />
        </div>

        {/* Device Information */}
        <Card className="mb-4 surface-variant border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <Smartphone className="h-5 w-5 mr-2 text-primary" />
              Device Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Device ID</span>
              <span className="text-sm text-white font-mono">{deviceId.slice(-12)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Connection</span>
              <span className={`text-sm ${navigator.onLine ? 'text-success' : 'text-orange-400'}`}>
                {navigator.onLine ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">GPS Status</span>
              <span className={`text-sm ${location ? 'text-success' : 'text-orange-400'}`}>
                {location ? `Active (±${accuracy?.toFixed(0) || 'Unknown'}m)` : 'Not available'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">User Agent</span>
              <span className="text-sm text-white truncate max-w-32">
                {navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop Device'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* GPS Settings */}
        <Card className="mb-4 surface-variant border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-primary" />
              GPS Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white">High Accuracy GPS</p>
                <p className="text-xs text-gray-400">More precise location but higher battery usage</p>
              </div>
              <Switch 
                checked={highAccuracyGPS}
                onCheckedChange={handleHighAccuracyToggle}
              />
            </div>
          </CardContent>
        </Card>

        {/* App Preferences */}
        <Card className="mb-4 surface-variant border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <Shield className="h-5 w-5 mr-2 text-primary" />
              App Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white">Haptic Feedback</p>
                <p className="text-xs text-gray-400">Vibration when logging patrol actions</p>
              </div>
              <Switch 
                checked={hapticEnabled}
                onCheckedChange={handleHapticToggle}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white">Auto-sync Data</p>
                <p className="text-xs text-gray-400">Automatically sync when connection is available</p>
              </div>
              <Switch 
                checked={autoSyncEnabled}
                onCheckedChange={handleAutoSyncToggle}
              />
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card className="mb-4 surface-variant border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <Wifi className="h-5 w-5 mr-2 text-primary" />
              Data Management
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            <div className="grid grid-cols-3 gap-4 p-3 bg-surface-container rounded-lg">
              <div className="text-center">
                <p className="text-lg font-bold text-white">{offlineStats.logs}</p>
                <p className="text-xs text-gray-400">Offline Logs</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-white">{offlineStats.sites}</p>
                <p className="text-xs text-gray-400">Cached Sites</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-white">{offlineStats.storage}</p>
                <p className="text-xs text-gray-400">Storage Used</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Button
                onClick={handleManualSync}
                className="w-full bg-primary hover:bg-primary/90 text-white touch-target"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Sync Data Now
              </Button>
              
              <Button
                onClick={handleClearData}
                variant="destructive"
                className="w-full touch-target"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Offline Data
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* App Information */}
        <Card className="surface-variant border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">App Information</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Version</span>
              <span className="text-sm text-white">1.0.0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">PWA Support</span>
              <span className="text-sm text-success">Enabled</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Offline Capable</span>
              <span className="text-sm text-success">Yes</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Last Updated</span>
              <span className="text-sm text-white">{new Date().toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>
      </main>

      <BottomNavigation currentRoute="/settings" />
    </div>
  );
}
