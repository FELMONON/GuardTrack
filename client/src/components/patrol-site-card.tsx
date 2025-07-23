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
    <div className={`bg-white rounded-xl shadow-sm border transition-all duration-200 ${
      isWithinGeofence 
        ? 'border-green-200 bg-green-50/30 ring-1 ring-green-100' 
        : 'border-gray-100 hover:shadow-md'
    }`}>
      <div className="p-4">
        {/* Site Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">{site.name}</h3>
            <p className="text-sm text-gray-500 line-clamp-2">{site.address}</p>
          </div>
          <div className={`ml-3 px-3 py-1 rounded-full flex-shrink-0 ${status.bgColor}`}>
            <div className="flex items-center space-x-1.5">
              <div className={`w-2 h-2 rounded-full ${status.dotColor}`}></div>
              <span className={`text-xs font-semibold ${status.color}`}>{status.text}</span>
            </div>
          </div>
        </div>
        
        {/* Distance and Last Visit */}
        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <div className="flex items-center space-x-1">
            <Navigation className="h-4 w-4" />
            <span className="font-medium">{formatDistance(distance)}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="h-4 w-4" />
            <span>{getLastVisitText()}</span>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex space-x-3">
          <Button
            onClick={() => handleButtonClick(onEnter)}
            disabled={isLoading}
            className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-lg transition-all duration-200 shadow-sm hover:shadow-md active-scale tap-highlight disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Processing...</span>
              </div>
            ) : (
              'Check In'
            )}
          </Button>
          <Button
            onClick={() => handleButtonClick(onExit)}
            disabled={isLoading}
            variant="outline"
            className="flex-1 h-12 border-2 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 active:bg-gray-100 font-semibold rounded-lg transition-all duration-200 active-scale tap-highlight disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-gray-700 border-t-transparent rounded-full animate-spin"></div>
                <span>Processing...</span>
              </div>
            ) : (
              'Check Out'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
