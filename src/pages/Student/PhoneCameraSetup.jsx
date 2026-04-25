import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { Camera, CheckCircle, AlertTriangle, Loader2, Smartphone, RefreshCw } from "lucide-react";
import CameraService from "../../services/CameraService";

export default function PhoneCameraSetup() {
  const { examId, studentId } = useParams();
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState(true);
  const [instructions, setInstructions] = useState(true);
  const [facingMode, setFacingMode] = useState('environment'); // 'user' for front, 'environment' for back
  const [switching, setSwitching] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    const initializePhoneCamera = async () => {
      try {
        // Set up camera service callbacks
        CameraService.setCallbacks({
          onPhoneCameraReady: (stream) => {
            setCameraReady(true);
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
          },
          onError: setError
        });

        // Add timeout for connection
        const timeout = setTimeout(() => {
          if (connecting) {
            setError("Connection timeout. Please check your internet and try again.");
            setConnecting(false);
          }
        }, 15000); // 15 second timeout

        // Initialize socket connection
        const connected = await CameraService.initializeSocket(examId, studentId);
        if (!connected) {
          clearTimeout(timeout);
          setError("Failed to connect to monitoring system");
          return;
        }

        clearTimeout(timeout);

        // Initialize phone camera
        await CameraService.initializePhoneCamera();

        // Emit socket event to notify laptop that phone camera is ready
        if (CameraService.socket) {
          CameraService.socket.emit('phone_camera_ready', { examId, studentId });
        }

        setConnecting(false);

      } catch (error) {
        setError("Failed to access phone camera: " + error.message);
        setConnecting(false);
      }
    };

    initializePhoneCamera();

    return () => {
      CameraService.cleanup();
    };
  }, [examId, studentId, connecting]);

  const dismissInstructions = () => {
    setInstructions(false);
  };

  const notifyCameraReady = () => {
    if (CameraService.socket) {
      CameraService.socket.emit('phone_camera_ready', { examId, studentId });
    }
  };

  const switchCamera = async () => {
    setSwitching(true);
    try {
      // Stop current camera
      CameraService.cleanup();
      setCameraReady(false);

      // Switch facing mode
      const newFacingMode = facingMode === 'environment' ? 'user' : 'environment';
      setFacingMode(newFacingMode);

      // Initialize camera with new facing mode
      const constraints = {
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: newFacingMode
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      CameraService.phoneStream = stream;
      setCameraReady(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Emit socket event to notify laptop that phone camera is ready
      if (CameraService.socket) {
        CameraService.socket.emit('phone_camera_ready', { examId, studentId });
      }
    } catch (error) {
      setError("Failed to switch camera: " + error.message);
    } finally {
      setSwitching(false);
    }
  };

  if (connecting) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-sm w-full">
          <Loader2 className="w-12 h-12 animate-spin text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Connecting...</h2>
          <p className="text-gray-600">Setting up phone camera monitoring</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-sm w-full">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Camera Error</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 relative overflow-hidden">
      {/* Instructions Overlay */}
      {instructions && (
        <div className="absolute inset-0 bg-black bg-opacity-75 z-20 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            <div className="text-center mb-6">
              <Smartphone className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Phone Camera Setup</h2>
              <p className="text-gray-600">Position your phone to monitor your desk</p>
            </div>

            <div className="space-y-3 text-sm text-gray-700 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                <span>Point camera toward your desk/workspace</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                <span>Keep phone stable and still</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                <span>Ensure good lighting on your workspace</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                <span>Do not close this tab during exam</span>
              </div>
            </div>

            <button
              onClick={dismissInstructions}
              className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition"
            >
              Got it, Start Monitoring
            </button>
          </div>
        </div>
      )}

      {/* Camera Feed */}
      <div className="relative w-full h-screen">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Status Overlay */}
        <div className="absolute top-4 left-4 right-4 z-10">
          <div className="bg-black bg-opacity-75 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${cameraReady ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-white text-sm font-medium">
                  {cameraReady ? 'Camera Active' : 'Camera Inactive'}
                </span>
              </div>

              <div className="text-white text-xs">
                Exam Monitoring
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Status */}
      <div className="absolute bottom-4 left-4 right-4 z-10">
        <div className="bg-black bg-opacity-75 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Camera className="w-5 h-5 text-white" />
            <span className="text-white font-medium">Desk Monitoring Active</span>
          </div>
          <p className="text-gray-300 text-xs mb-3">
            Keep this tab open and phone stable during the entire exam
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={notifyCameraReady}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Camera Ready
            </button>
            <button
              onClick={switchCamera}
              disabled={switching}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {switching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Switch Camera
            </button>
          </div>
        </div>
      </div>

      {/* Warning: Keep Screen On */}
      <div className="absolute top-1/2 left-4 transform -translate-y-1/2 z-10">
        <div className="bg-yellow-500 bg-opacity-90 rounded-lg p-3 max-w-xs">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-900 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-yellow-900 font-medium text-sm">Keep Screen Active</h3>
              <p className="text-yellow-800 text-xs">
                Adjust your phone settings to prevent auto-lock during the exam
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Status Indicator */}
      <div className="absolute top-4 right-4 z-10">
        {cameraReady ? (
          <div className="bg-green-600 text-white px-3 py-2 rounded-full text-xs font-medium flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Connected
          </div>
        ) : (
          <div className="bg-red-600 text-white px-3 py-2 rounded-full text-xs font-medium flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Connecting...
          </div>
        )}
      </div>
    </div>
  );
}