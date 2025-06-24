import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { QrCode, X, CheckCircle } from 'lucide-react';

interface QRScannerProps {
  onSiteDetected: (siteId: number, siteName: string) => void;
  onCancel: () => void;
  availableSites: { id: number; name: string; qrCode?: string }[];
}

export default function QRScanner({ onSiteDetected, onCancel, availableSites }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [detectedSite, setDetectedSite] = useState<{ id: number; name: string } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startScanner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsScanning(true);
        
        // Start scanning for QR codes
        startQRDetection();
      }
    } catch (error) {
      console.error('Camera access failed:', error);
      alert('Unable to access camera. Please check permissions.');
    }
  };

  const startQRDetection = () => {
    if (!videoRef.current) return;

    // Simple QR detection simulation - in production, use a proper QR library like jsQR
    intervalRef.current = setInterval(() => {
      // This is a simplified version - in real implementation, you'd use canvas
      // to capture video frames and detect QR codes with a library like jsQR
      simulateQRDetection();
    }, 1000);
  };

  // Simulate QR code detection - replace with real QR detection library
  const simulateQRDetection = () => {
    // In a real implementation, you would:
    // 1. Capture video frame to canvas
    // 2. Use jsQR library to detect QR codes
    // 3. Parse the QR code data
    
    // For demo purposes, we'll just show manual input
    if (Math.random() > 0.95) { // Randomly "detect" a QR code for demo
      const mockQRData = "GUARD_SITE_001"; // This would come from actual QR detection
      handleQRDetected(mockQRData);
    }
  };

  const handleQRDetected = (qrData: string) => {
    setScannedData(qrData);
    
    // Match QR code to available sites
    const site = availableSites.find(s => 
      s.qrCode === qrData || 
      qrData.includes(s.id.toString()) ||
      qrData.toLowerCase().includes(s.name.toLowerCase().replace(/\s+/g, '_'))
    );
    
    if (site) {
      setDetectedSite(site);
      stopScanner();
    }
  };

  const stopScanner = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setIsScanning(false);
  };

  const confirmSite = () => {
    if (detectedSite) {
      onSiteDetected(detectedSite.id, detectedSite.name);
    }
  };

  const tryAgain = () => {
    setScannedData(null);
    setDetectedSite(null);
    startScanner();
  };

  // Manual site selection fallback
  const [showManualSelect, setShowManualSelect] = useState(false);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-4">
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-center">Scan Site QR Code</h3>
          
          {!isScanning && !detectedSite && !showManualSelect && (
            <div className="text-center">
              <QrCode className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p className="text-sm text-gray-600 mb-4">
                Scan the QR code at your patrol site to check in
              </p>
              <div className="space-y-2">
                <Button onClick={startScanner} className="w-full">
                  <QrCode className="h-4 w-4 mr-2" />
                  Start QR Scanner
                </Button>
                <Button 
                  onClick={() => setShowManualSelect(true)}
                  variant="outline" 
                  className="w-full"
                >
                  Manual Site Selection
                </Button>
              </div>
            </div>
          )}

          {isScanning && (
            <div className="space-y-4">
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full rounded-lg"
                />
                <div className="absolute inset-0 border-2 border-blue-500 rounded-lg">
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-48 h-48 border-2 border-white rounded-lg opacity-75"></div>
                  </div>
                </div>
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                  <p className="text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded">
                    Position QR code within the square
                  </p>
                </div>
              </div>
              <Button onClick={stopScanner} variant="outline" className="w-full">
                Stop Scanning
              </Button>
            </div>
          )}

          {detectedSite && (
            <div className="space-y-4 text-center">
              <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
              <div>
                <h4 className="text-lg font-medium">Site Detected!</h4>
                <p className="text-gray-600">{detectedSite.name}</p>
                {scannedData && (
                  <p className="text-xs text-gray-500 mt-1">
                    QR: {scannedData}
                  </p>
                )}
              </div>
              <div className="flex space-x-2">
                <Button 
                  onClick={tryAgain}
                  variant="outline" 
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Scan Again
                </Button>
                <Button 
                  onClick={confirmSite}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Check In
                </Button>
              </div>
            </div>
          )}

          {showManualSelect && (
            <div className="space-y-4">
              <h4 className="font-medium">Select Your Site:</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {availableSites.map((site) => (
                  <Button
                    key={site.id}
                    onClick={() => {
                      setDetectedSite(site);
                      setShowManualSelect(false);
                    }}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    {site.name}
                  </Button>
                ))}
              </div>
              <Button 
                onClick={() => setShowManualSelect(false)}
                variant="ghost" 
                className="w-full"
              >
                Back to Scanner
              </Button>
            </div>
          )}
          
          <Button 
            onClick={onCancel} 
            variant="ghost" 
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 