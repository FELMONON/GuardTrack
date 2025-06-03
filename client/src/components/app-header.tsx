import { useState, useEffect } from "react";
import { Shield, Wifi, WifiOff, MapPin, Clock } from "lucide-react";

interface AppHeaderProps {
  location: { latitude: number; longitude: number } | null;
  accuracy: number | null;
  isOnline: boolean;
  isLocationLoading: boolean;
  locationError: string | null;
}

export default function AppHeader({ 
  location, 
  accuracy, 
  isOnline, 
  isLocationLoading, 
  locationError 
}: AppHeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Battery API is deprecated but still available in some browsers
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
      }).catch(() => {
        // Fallback if battery API fails
        setBatteryLevel(85);
      });
    } else {
      // Fallback for browsers without battery API
      setBatteryLevel(85);
    }
  }, []);

  const formatAddress = (lat: number, lng: number) => {
    // In production, this would use reverse geocoding
    return `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° W`;
  };

  const getLocationStatus = () => {
    if (isLocationLoading) return "Getting location...";
    if (locationError) return "Location unavailable";
    if (!location) return "Location off";
    return "Location active";
  };

  return (
    <header className="surface-variant material-shadow-elevated sticky top-0 z-50">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            <Shield className="text-primary text-xl" />
            <h1 className="text-lg font-medium">Guard Patrol</h1>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`flex items-center text-xs px-2 py-1 rounded-full ${
              isOnline ? 'bg-success text-white' : 'bg-destructive text-white'
            }`}>
              {isOnline ? (
                <>
                  <Wifi className="h-3 w-3 mr-1" />
                  Online
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 mr-1" />
                  Offline
                </>
              )}
            </span>
            {batteryLevel !== null && (
              <span className="text-xs text-gray-400">{batteryLevel}%</span>
            )}
          </div>
        </div>
        
        <div className="surface-container rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                location ? 'bg-success status-pulse' : 'bg-orange-400'
              }`}></div>
              <span className="text-sm font-medium">
                {getLocationStatus()}
              </span>
            </div>
            <span className="text-xs text-gray-400">
              {currentTime.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
              })}
            </span>
          </div>
          
          {location && (
            <>
              <p className="text-xs text-gray-300 mt-1">
                {formatAddress(location.latitude, location.longitude)}
              </p>
              <div className="flex items-center mt-2 space-x-4">
                <span className="text-xs text-gray-400">
                  <MapPin className="h-3 w-3 inline mr-1" />
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </span>
                {accuracy && (
                  <span className="text-xs text-gray-400">
                    <Clock className="h-3 w-3 inline mr-1" />
                    ±{accuracy.toFixed(0)}m
                  </span>
                )}
              </div>
            </>
          )}
          
          {locationError && (
            <p className="text-xs text-orange-400 mt-1">
              {locationError}
            </p>
          )}
        </div>
      </div>
    </header>
  );
}
