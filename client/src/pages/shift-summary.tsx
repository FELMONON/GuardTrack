import { useState, useEffect } from "react";
import { PatrolSite } from "@shared/schema";
import AppHeader from "@/components/app-header";
import BottomNavigation from "@/components/bottom-navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGeolocation } from "@/hooks/use-geolocation";
import { usePatrolSessions } from "@/hooks/use-patrol-sessions";
import { useQuery } from "@tanstack/react-query";
import { Clock, MapPin, Timer, CheckCircle, Download, Moon, Sun } from "lucide-react";
import { format, isAfter, isBefore, startOfDay, addHours } from "date-fns";

export default function ShiftSummary() {
  const [deviceId] = useState(() => localStorage.getItem('patrol-device-id') || '');
  const { location, accuracy, isLoading: locationLoading, error: locationError } = useGeolocation();
  const { getAllSessions, formatMilitaryTime, clearAllSessions, checkShiftChange } = usePatrolSessions(deviceId);
  const [isShiftActive, setIsShiftActive] = useState(false);
  const [shiftStartTime, setShiftStartTime] = useState<Date | null>(null);

  const { data: sites = [] } = useQuery<PatrolSite[]>({
    queryKey: ['/api/patrol-sites'],
  });

  const sessions = getAllSessions();

  // Shift times: 18:00 to 07:00 next day
  const getCurrentShiftTimes = () => {
    const now = new Date();
    const today18 = new Date(now);
    today18.setHours(18, 0, 0, 0);
    
    const tomorrow7 = new Date(now);
    tomorrow7.setDate(tomorrow7.getDate() + 1);
    tomorrow7.setHours(7, 0, 0, 0);
    
    // If current time is before 18:00, shift started yesterday
    if (now.getHours() < 18) {
      today18.setDate(today18.getDate() - 1);
      tomorrow7.setDate(tomorrow7.getDate() - 1);
    }
    
    return { start: today18, end: tomorrow7 };
  };

  const { start: shiftStart, end: shiftEnd } = getCurrentShiftTimes();

  // Check if currently in shift time
  useEffect(() => {
    const now = new Date();
    const inShift = isAfter(now, shiftStart) && isBefore(now, shiftEnd);
    setIsShiftActive(inShift);
    
    if (inShift && !shiftStartTime) {
      setShiftStartTime(shiftStart);
    }
  }, [shiftStart, shiftEnd, shiftStartTime]);

  // Filter sessions for current shift
  const shiftSessions = sessions.filter(session => {
    const sessionTime = new Date(session.entryTime);
    return isAfter(sessionTime, shiftStart) && isBefore(sessionTime, shiftEnd);
  });

  // Group sessions by site
  const sessionsBySite = shiftSessions.reduce((acc, session) => {
    const siteId = session.siteId;
    if (!acc[siteId]) {
      acc[siteId] = [];
    }
    acc[siteId].push(session);
    return acc;
  }, {} as Record<number, typeof shiftSessions>);

  const getSiteName = (siteId: number) => {
    const site = sites.find(s => s.id === siteId);
    return site?.name || `Site #${siteId}`;
  };

  const formatShiftTime = (date: Date) => {
    return format(date, 'HH:mm:ss');
  };

  const calculateTotalDuration = () => {
    return shiftSessions.reduce((total, session) => {
      return total + (session.duration || 0);
    }, 0);
  };

  const exportShiftSummary = () => {
    const summary = generateShiftReport();
    const blob = new Blob([summary], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shift-summary-${format(shiftStart, 'yyyy-MM-dd')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateShiftReport = () => {
    const tricoHQSessions = shiftSessions.filter(s => getSiteName(s.siteId) === 'Trico Homes HQ');
    const extraTricoPatrols = Math.max(0, tricoHQSessions.length - 3);
    
    let report = `SHIFT SUMMARY - ${format(shiftStart, 'yyyy-MM-dd')}\n`;
    report += `Shift: ${formatShiftTime(shiftStart)} - ${formatShiftTime(shiftEnd)}\n`;
    report += `Total Patrols: ${shiftSessions.length}\n`;
    report += `Total Duration: ${calculateTotalDuration()} minutes\n`;
    report += `Sites Visited: ${Object.keys(sessionsBySite).length}\n\n`;

    report += `PATROL LOG (Military Time):\n`;
    report += `${'='.repeat(50)}\n`;

    shiftSessions
      .sort((a, b) => new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime())
      .forEach((session, index) => {
        const siteName = getSiteName(session.siteId);
        const entered = formatMilitaryTime(session.entryTime);
        const exited = session.exitTime ? formatMilitaryTime(session.exitTime) : 'In Progress';
        const duration = session.duration ? `${session.duration} min` : 'Ongoing';
        
        report += `${index + 1}. ${siteName}\n`;
        report += `   Entered: ${entered} | Exited: ${exited}\n`;
        report += `   Duration: ${duration}\n`;
        if (session.entryAccuracy) {
          report += `   GPS Accuracy: ±${session.entryAccuracy}m\n`;
        }
        report += `\n`;
      });

    if (tricoHQSessions.length >= 3) {
      report += `EXTRA TRICO HOMES HQ PATROLS: ${extraTricoPatrols}\n`;
      report += `${'='.repeat(30)}\n`;
      tricoHQSessions.slice(3).forEach((session, index) => {
        const entered = formatMilitaryTime(session.entryTime);
        const exited = session.exitTime ? formatMilitaryTime(session.exitTime) : 'In Progress';
        report += `Extra ${index + 1}: ${entered} - ${exited}\n`;
      });
    }

    return report;
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
        {/* Shift Status */}
        <Card className="mb-6 surface-variant border-0">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2">
              {isShiftActive ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              <span>Shift Status</span>
              <Badge variant={isShiftActive ? "default" : "secondary"}>
                {isShiftActive ? "Active" : "Ended"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Start Time</p>
                <p className="font-mono text-white">{formatShiftTime(shiftStart)}</p>
              </div>
              <div>
                <p className="text-gray-400">End Time</p>
                <p className="font-mono text-white">{formatShiftTime(shiftEnd)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shift Statistics */}
        <Card className="mb-6 surface-variant border-0">
          <CardHeader className="pb-3">
            <CardTitle>Shift Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-white">{shiftSessions.length}</p>
                <p className="text-xs text-gray-400">Total Patrols</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{Object.keys(sessionsBySite).length}</p>
                <p className="text-xs text-gray-400">Sites Visited</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{calculateTotalDuration()}</p>
                <p className="text-xs text-gray-400">Total Minutes</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {sessionsBySite[2]?.length || 0}
                </p>
                <p className="text-xs text-gray-400">Trico HQ Visits</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="mb-6 space-y-3">
          <Button 
            onClick={exportShiftSummary}
            className="w-full bg-primary hover:bg-primary/90"
            disabled={shiftSessions.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Shift Summary
          </Button>
          
          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={() => {
                clearAllSessions();
                window.location.reload();
              }}
              variant="outline"
              className="text-red-400 border-red-400 hover:bg-red-400/10"
            >
              Clear History
            </Button>
            
            <Button 
              onClick={() => {
                // Force cleanup check
                localStorage.removeItem('last-shift-cleanup');
                checkShiftChange();
                setTimeout(() => window.location.reload(), 500);
              }}
              variant="outline"
              className="text-blue-400 border-blue-400 hover:bg-blue-400/10"
            >
              Test Cleanup
            </Button>
          </div>
        </div>

        {/* Patrol Sessions List */}
        <Card className="surface-variant border-0">
          <CardHeader className="pb-3">
            <CardTitle>Patrol Log (Military Time)</CardTitle>
          </CardHeader>
          <CardContent>
            {shiftSessions.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">No patrols recorded for this shift</p>
              </div>
            ) : (
              <div className="space-y-3">
                {shiftSessions
                  .sort((a, b) => new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime())
                  .map((session, index) => (
                    <div key={session.id} className="border-b border-gray-700 pb-3 last:border-b-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-white">
                          {index + 1}. {getSiteName(session.siteId)}
                        </span>
                        {session.exitTime && (
                          <CheckCircle className="h-4 w-4 text-green-400" />
                        )}
                      </div>
                      
                      <div className="text-sm font-mono text-gray-300">
                        Entered: {formatMilitaryTime(session.entryTime)}
                        {session.exitTime && ` | Exited: ${formatMilitaryTime(session.exitTime)}`}
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-3 w-3" />
                          <span>±{session.entryAccuracy || '?'}m</span>
                        </div>
                        {session.duration && (
                          <div className="flex items-center space-x-1">
                            <Timer className="h-3 w-3" />
                            <span>{session.duration} min</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trico HQ Extra Patrols */}
        {sessionsBySite[2] && sessionsBySite[2].length > 3 && (
          <Card className="mt-6 surface-variant border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-green-400">Extra Trico HQ Patrols</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-300 mb-3">
                Completed {sessionsBySite[2].length - 3} extra patrol(s) at Trico Homes HQ
              </p>
              <div className="space-y-2">
                {sessionsBySite[2].slice(3).map((session, index) => (
                  <div key={session.id} className="text-sm font-mono text-green-300">
                    Extra {index + 1}: {formatMilitaryTime(session.entryTime)}
                    {session.exitTime && ` - ${formatMilitaryTime(session.exitTime)}`}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <BottomNavigation currentRoute="/shift" />
    </div>
  );
}