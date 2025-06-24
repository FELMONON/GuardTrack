import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, X, Check } from 'lucide-react';

interface PhotoCaptureProps {
  onPhotoTaken: (photoData: string, timestamp: Date) => void;
  onCancel: () => void;
}

export default function PhotoCapture({ onPhotoTaken, onCancel }: PhotoCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCapturing(true);
      }
    } catch (error) {
      console.error('Camera access failed:', error);
      alert('Unable to access camera. Please check permissions.');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0);

    // Add timestamp overlay
    context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    context.fillRect(10, canvas.height - 60, 300, 50);
    
    context.fillStyle = 'white';
    context.font = '16px Arial';
    context.fillText(
      new Date().toLocaleString(),
      20, 
      canvas.height - 30
    );

    // Convert to base64
    const photoData = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedPhoto(photoData);
    
    // Stop camera
    stopCamera();
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  };

  const confirmPhoto = () => {
    if (capturedPhoto) {
      onPhotoTaken(capturedPhoto, new Date());
    }
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-4">
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-center">Document Visit</h3>
          
          {!isCapturing && !capturedPhoto && (
            <div className="text-center">
              <Camera className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p className="text-sm text-gray-600 mb-4">
                Take a photo to document your patrol visit
              </p>
              <Button onClick={startCamera} className="w-full">
                <Camera className="h-4 w-4 mr-2" />
                Start Camera
              </Button>
            </div>
          )}

          {isCapturing && (
            <div className="space-y-4">
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full rounded-lg"
                />
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                  <Button
                    onClick={capturePhoto}
                    size="lg"
                    className="rounded-full w-16 h-16 bg-white hover:bg-gray-100 border-4 border-gray-800"
                  >
                    <Camera className="h-6 w-6 text-gray-800" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {capturedPhoto && (
            <div className="space-y-4">
              <img 
                src={capturedPhoto} 
                alt="Captured patrol photo"
                className="w-full rounded-lg"
              />
              <div className="flex space-x-2">
                <Button 
                  onClick={retakePhoto}
                  variant="outline" 
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Retake
                </Button>
                <Button 
                  onClick={confirmPhoto}
                  className="flex-1"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Confirm
                </Button>
              </div>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
          
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