import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PatrolSite } from "@shared/schema";
import AppHeader from "@/components/app-header";
import BottomNavigation from "@/components/bottom-navigation";
import { Card, CardContent } from "@/components/ui/card";
import { useGeolocation } from "@/hooks/use-geolocation";
import { calculateDistance } from "@/lib/geofencing";
import { MapPin, Navigation, Crosshair } from "lucide-react";

export default function Map() {
  const { location, accuracy, isLoading: locationLoading, error: locationError } = useGeolocation();
  const [mapCenter, setMapCenter] = useState({ lat: 51.0447, lng: -114.0719 }); // Calgary default

  const { data: sites = [] } = useQuery<PatrolSite[]>({
    queryKey: ['/api/patrol-sites'],
  });

  // Update map center when location is available
  useEffect(() => {
    if (location) {
      setMapCenter({ lat: location.latitude, lng: location.longitude });
    }
  }, [location]);

  const sitesWithDistance = location ? sites.map(site => ({
    ...site,
    distance: calculateDistance(
      location.latitude,
      location.longitude,
      parseFloat(site.latitude),
      parseFloat(site.longitude)
    )
  })).sort((a, b) => a.distance - b.distance) : sites;

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
          <h2 className="text-lg font-medium">Map View</h2>
          <span className="text-xs text-gray-400 surface-container px-2 py-1 rounded">
            Live tracking
          </span>
        </div>

        {/* Map Placeholder - In production, integrate with a mapping service */}
        <Card className="mb-6 surface-variant border-0">
          <CardContent className="p-4">
            <div className="relative w-full h-64 bg-surface-container rounded-lg flex items-center justify-center">
              <div className="text-center">
                <MapPin className="h-12 w-12 text-primary mx-auto mb-2" />
                <p className="text-sm text-gray-400 mb-1">Interactive Map</p>
                <p className="text-xs text-gray-500">
                  {location ? 
                    `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` : 
                    'Getting location...'
                  }
                </p>
                {accuracy && (
                  <p className="text-xs text-gray-500 mt-1">
                    Accuracy: ±{accuracy.toFixed(0)}m
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Location Card */}
        {location && (
          <Card className="mb-4 surface-variant border-0">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-success rounded-full status-pulse"></div>
                <div className="flex-1">
                  <h3 className="font-medium text-white">Current Position</h3>
                  <p className="text-xs text-gray-400">
                    {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </p>
                  {accuracy && (
                    <p className="text-xs text-gray-500">±{accuracy.toFixed(0)}m accuracy</p>
                  )}
                </div>
                <Crosshair className="h-5 w-5 text-primary" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Nearby Sites List */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Nearby Sites</h3>
          {sitesWithDistance.map((site) => (
            <Card key={site.id} className="surface-variant border-0">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-white">{site.name}</h4>
                      {location && site.distance < 0.1 && (
                        <span className="bg-success text-white text-xs px-2 py-1 rounded-full">
                          <MapPin className="h-3 w-3 inline mr-1" />
                          Very close
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-300 mb-2">{site.address}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-400">
                      <span className="flex items-center">
                        <Navigation className="h-3 w-3 mr-1" />
                        {location ? 
                          site.distance < 1 ? 
                            `${Math.round(site.distance * 1000)}m` :
                            `${site.distance.toFixed(1)}km`
                          : 'Calculating...'
                        }
                      </span>
                      <span>
                        {parseFloat(site.latitude).toFixed(4)}, {parseFloat(site.longitude).toFixed(4)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <BottomNavigation currentRoute="/map" />
    </div>
  );
}
