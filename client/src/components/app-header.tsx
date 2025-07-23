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
  const getLocationStatus = () => {
    if (isLocationLoading) return { text: "Finding location...", color: "text-blue-600", dot: "bg-blue-500" };
    if (locationError) return { text: "Location unavailable", color: "text-red-600", dot: "bg-red-500" };
    if (!location) return { text: "Location disabled", color: "text-gray-600", dot: "bg-gray-400" };
    return { text: "Location active", color: "text-green-600", dot: "bg-green-500" };
  };

  const status = getLocationStatus();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Shield className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">GuardTrack</h1>
              <p className="text-sm text-gray-500">Security Patrol</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${status.dot}`}></div>
              <span className={`text-sm font-medium ${status.color}`}>
                {status.text}
              </span>
            </div>
            
            <div className="flex items-center space-x-1">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-600" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-600" />
              )}
            </div>
          </div>
        </div>
        
        {locationError && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{locationError}</p>
          </div>
        )}
      </div>
    </header>
  );
}
