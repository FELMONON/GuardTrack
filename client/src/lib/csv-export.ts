import { PatrolLog, PatrolSite } from "@shared/schema";

export async function exportLogsToCSV(logs: PatrolLog[], sites: PatrolSite[]): Promise<void> {
  // Create a map for quick site lookup
  const siteMap = new Map(sites.map(site => [site.id, site]));

  // Define CSV headers
  const headers = [
    'Timestamp',
    'Site Name',
    'Site Address',
    'Action',
    'Device ID',
    'Latitude',
    'Longitude',
    'GPS Accuracy (m)',
    'Within Geofence',
    'Site Latitude',
    'Site Longitude',
    'Synced At',
  ];

  // Convert logs to CSV rows
  const rows = logs.map(log => {
    const site = siteMap.get(log.siteId);
    const timestamp = new Date(log.timestamp);
    
    return [
      timestamp.toISOString(),
      site?.name || `Site #${log.siteId}`,
      site?.address || 'Unknown',
      log.action,
      log.deviceId,
      log.latitude,
      log.longitude,
      log.accuracy || 'N/A',
      log.isWithinGeofence ? 'Yes' : 'No',
      site?.latitude || 'N/A',
      site?.longitude || 'N/A',
      log.syncedAt ? new Date(log.syncedAt).toISOString() : 'Not synced',
    ];
  });

  // Combine headers and rows
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');

  // Create and download the file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    // Generate filename with current date
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
    const filename = `patrol-logs-${dateStr}-${timeStr}.csv`;
    
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    URL.revokeObjectURL(url);
  } else {
    // Fallback for browsers that don't support download attribute
    const url = `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
    window.open(url, '_blank');
  }
}

export function formatLogForExport(log: PatrolLog, site?: PatrolSite): Record<string, any> {
  return {
    timestamp: new Date(log.timestamp).toISOString(),
    siteName: site?.name || `Site #${log.siteId}`,
    siteAddress: site?.address || 'Unknown',
    action: log.action,
    deviceId: log.deviceId,
    latitude: parseFloat(log.latitude),
    longitude: parseFloat(log.longitude),
    accuracy: log.accuracy ? parseFloat(log.accuracy) : null,
    withinGeofence: log.isWithinGeofence,
    siteLatitude: site ? parseFloat(site.latitude) : null,
    siteLongitude: site ? parseFloat(site.longitude) : null,
    syncedAt: log.syncedAt ? new Date(log.syncedAt).toISOString() : null,
  };
}

export function generateReportSummary(logs: PatrolLog[], sites: PatrolSite[]): string {
  const siteMap = new Map(sites.map(site => [site.id, site]));
  const uniqueSites = new Set(logs.map(log => log.siteId));
  const entries = logs.filter(log => log.action === 'enter').length;
  const exits = logs.filter(log => log.action === 'exit').length;
  
  const dateRange = logs.length > 0 ? (() => {
    const dates = logs.map(log => new Date(log.timestamp)).sort((a, b) => a.getTime() - b.getTime());
    const oldest = dates[0];
    const newest = dates[dates.length - 1];
    
    if (oldest.toDateString() === newest.toDateString()) {
      return oldest.toLocaleDateString();
    }
    
    return `${oldest.toLocaleDateString()} - ${newest.toLocaleDateString()}`;
  })() : 'No data';

  return `
Patrol Report Summary
====================
Report Generated: ${new Date().toLocaleString()}
Date Range: ${dateRange}
Total Logs: ${logs.length}
Sites Visited: ${uniqueSites.size}
Entries: ${entries}
Exits: ${exits}

Site Breakdown:
${Array.from(uniqueSites).map(siteId => {
  const site = siteMap.get(siteId);
  const siteLogs = logs.filter(log => log.siteId === siteId);
  const siteEntries = siteLogs.filter(log => log.action === 'enter').length;
  const siteExits = siteLogs.filter(log => log.action === 'exit').length;
  
  return `- ${site?.name || `Site #${siteId}`}: ${siteLogs.length} logs (${siteEntries} entries, ${siteExits} exits)`;
}).join('\n')}
  `.trim();
}
