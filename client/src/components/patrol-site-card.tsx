import { PatrolSite } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Navigation } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PatrolSiteCardProps {
  site: PatrolSite & { distance: number; isWithinGeofence: boolean };
  distance: number;
  isWithinGeofence: boolean;
  lastVisit?: any;
  onEnter: () => void;
  onExit: () => void;
  isLoading: boolean;
}

export default function PatrolSiteCard({
  site,
  distance,
  isWithinGeofence,
  lastVisit,
  onEnter,
  onExit,
  isLoading,
}: PatrolSiteCardProps) {
  const formatDistance = (dist: number) => {
    if (dist < 1) {
      return `${Math.round(dist * 1000)}m away`;
    }
    return `${dist.toFixed(1)}km away`;
  };

  const getLastVisitText = () => {
    if (!lastVisit) return "Not visited yet";
    
    const timeDiff = Date.now() - new Date(lastVisit.entryTime).getTime();
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    
    if (hours < 1) {
      return "Just visited";
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    }
  };

  const getStatusDisplay = () => {
    if (isWithinGeofence) {
      return {
        text: "You're here",
        color: "text-green-600",
        bgColor: "bg-green-50",
        dotColor: "bg-green-500",
      };
    }
    
    if (!lastVisit) {
      return {
        text: "Not visited",
        color: "text-gray-600",
        bgColor: "bg-gray-50",
        dotColor: "bg-gray-400",
      };
    }
    
    const hoursSinceVisit = (Date.now() - new Date(lastVisit.entryTime).getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceVisit < 8) {
      return {
        text: "Recently visited",
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        dotColor: "bg-blue-500",
      };
    } else {
      return {
        text: "Visit due",
        color: "text-orange-600",
        bgColor: "bg-orange-50",
        dotColor: "bg-orange-500",
      };
    }
  };

  const status = getStatusDisplay();

  const handleButtonClick = (action: () => void) => {
    // Haptic feedback
    if ('vibrate' in navigator && localStorage.getItem('haptic-enabled') !== 'false') {
      navigator.vibrate(30);
    }
    action();
  };

  return (
    <div className={`border rounded-lg transition-all duration-200 ${
      isWithinGeofence 
        ? 'border-green-200 bg-green-50/50' 
        : 'border-gray-200 bg-white hover:border-gray-300'
    }`}>
      {/* Site Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">{site.name}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{site.address}</p>
          </div>
          <div className={`px-3 py-1 rounded-full ${status.bgColor}`}>
            <div className="flex items-center space-x-1.5">
              <div className={`w-2 h-2 rounded-full ${status.dotColor}`}></div>
              <span className={`text-xs font-medium ${status.color}`}>{status.text}</span>
            </div>
          </div>
        </div>
        
        {/* Site Info */}
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <div className="flex items-center space-x-1">
            <Navigation className="h-3.5 w-3.5" />
            <span>{formatDistance(distance)}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="h-3.5 w-3.5" />
            <span>{getLastVisitText()}</span>
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => handleButtonClick(onEnter)}
            disabled={isLoading}
            className="h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus-clean touch-target"
          >
            <MapPin className="h-4 w-4 mr-2" />
            Enter
          </Button>
          <Button
            onClick={() => handleButtonClick(onExit)}
            disabled={isLoading}
            variant="outline"
            className="h-11 border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-lg transition-colors focus-clean touch-target"
          >
            <MapPin className="h-4 w-4 mr-2" />
            Exit
          </Button>
        </div>
      </div>
    </div>
  );
}
