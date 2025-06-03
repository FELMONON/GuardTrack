import { PatrolSite } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Route } from "lucide-react";
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
      return `${Math.round(dist * 1000)}m`;
    }
    return `${dist.toFixed(1)}km`;
  };

  const getLastVisitText = () => {
    if (!lastVisit) return "Never";
    
    const timeDiff = Date.now() - new Date(lastVisit.entryTime).getTime();
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return formatDistanceToNow(new Date(lastVisit.entryTime), { addSuffix: true });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return `${days} days ago`;
    } else if (days < 14) {
      return "1 week ago";
    } else {
      return `${Math.floor(days / 7)} weeks ago`;
    }
  };

  const getStatusInfo = () => {
    if (isWithinGeofence) {
      return {
        text: "You're here",
        color: "bg-success text-white",
        icon: MapPin,
      };
    }
    
    if (!lastVisit) {
      return {
        text: "Not visited",
        color: "bg-gray-600 text-white",
        icon: Clock,
      };
    }
    
    const hoursSinceVisit = (Date.now() - new Date(lastVisit.entryTime).getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceVisit < 24) {
      return {
        text: "Completed",
        color: "bg-secondary text-white",
        icon: Clock,
      };
    } else {
      return {
        text: "Pending",
        color: "bg-warning text-white",
        icon: Clock,
      };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  const handleButtonClick = (action: () => void) => {
    // Haptic feedback
    if ('vibrate' in navigator && localStorage.getItem('haptic-enabled') !== 'false') {
      navigator.vibrate(50);
    }
    action();
  };

  return (
    <Card className={`surface-variant material-shadow ${
      isWithinGeofence ? 'geofence-highlight border-2 border-success' : ''
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="font-medium text-white">{site.name}</h3>
              <span className={`text-xs px-2 py-1 rounded-full ${statusInfo.color}`}>
                <StatusIcon className="h-3 w-3 inline mr-1" />
                {statusInfo.text}
              </span>
            </div>
            <p className="text-xs text-gray-300 mb-2">
              {site.address}
            </p>
            <div className="flex items-center space-x-4 text-xs text-gray-400">
              <span className="flex items-center">
                <Route className="h-3 w-3 mr-1" />
                {formatDistance(distance)}
              </span>
              <span className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                Last visit: {getLastVisitText()}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <Button
            onClick={() => handleButtonClick(onEnter)}
            disabled={isLoading}
            className="flex-1 bg-success hover:bg-success/90 text-white py-3 px-4 rounded-lg font-medium text-sm transition-colors touch-target haptic-feedback"
          >
            <MapPin className="h-4 w-4 mr-2" />
            Enter Site
          </Button>
          <Button
            onClick={() => handleButtonClick(onExit)}
            disabled={isLoading}
            className="flex-1 bg-destructive hover:bg-destructive/90 text-white py-3 px-4 rounded-lg font-medium text-sm transition-colors touch-target haptic-feedback"
          >
            <MapPin className="h-4 w-4 mr-2" />
            Exit Site
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
