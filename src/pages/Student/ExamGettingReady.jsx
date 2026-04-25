import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../authContext";
import QRCode from "react-qr-code";
import { 
  Camera, 
  Smartphone, 
  CheckCircle, 
  AlertTriangle, 
  Loader2,
  Monitor,
  Wifi,
  Shield,
  Clock,
  ArrowRight,
  RefreshCw
} from "lucide-react";
import CameraService from "../../services/CameraService";
import { apiGetExam } from "../../api";

export default function ExamGettingReady() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State management
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [laptopCameraReady, setLaptopCameraReady] = useState(false);
  const [phoneCameraReady, setPhoneCameraReady] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(false);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [error, setError] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  const [testingCameras, setTestingCameras] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  // Refs
  const laptopVideoRef = useRef(null);
  const phoneVideoRef = useRef(null);
  const healthCheckInterval = useRef(null);

  // Phone camera URL for QR code
  const phoneURL = CameraService.generatePhoneURL(examId, user?.id || 'unknown');

  // Load exam data
  useEffect(() => {
    const loadExamData = async () => {
      try {
        const examData = await apiGetExam(examId);
        setExam(examData);
      } catch (error) {
        setError("Failed to load exam data");
      } finally {
        setLoading(false);
      }
    };

    loadExamData();
  }, [examId]);

  // Initialize camera service
  useEffect(() => {
    const initializeCameraService = async () => {
      // Set up callbacks
      CameraService.setCallbacks({
        onLaptopCameraReady: (stream) => {
          setLaptopCameraReady(true);
          if (laptopVideoRef.current) {
            laptopVideoRef.current.srcObject = stream;
          }
        },
        onPhoneCameraReady: (stream) => {
          setPhoneCameraReady(true);
          if (phoneVideoRef.current) {
            phoneVideoRef.current.srcObject = stream;
          }
        },
        onConnectionStatus: setConnectionStatus,
        onError: setError
      });

      // Initialize socket connection
      const connected = await CameraService.initializeSocket(examId, user.id);
      if (connected) {
        healthCheckInterval.current = CameraService.startCameraHealthCheck();
      }

      // Get available cameras
      try {
        const cameras = await CameraService.getAvailableCameras();
        setAvailableCameras(cameras);
        if (cameras.length > 0) {
          setSelectedCamera(cameras[0].deviceId);
        }
      } catch (error) {
        setError("Unable to access camera devices. Please check permissions.");
      }
    };

    initializeCameraService();

    // Listen for phone camera ready event via Socket.IO
    if (CameraService.socket) {
      CameraService.socket.on('phone_camera_ready', (data) => {
        console.log('Received phone_camera_ready event:', data);
        console.log('Current user ID:', user?.id);
        if (data.studentId === user?.id) {
          setPhoneCameraReady(true);
          console.log('Phone camera marked as ready');
        }
      });
    }

    // Poll API endpoint as fallback for phone camera ready status
    const pollPhoneCameraReady = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/exams/${examId}/phone-camera-ready/${user?.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.ready) {
            console.log('Phone camera ready via API poll');
            setPhoneCameraReady(true);
          }
        }
      } catch (error) {
        console.error('Failed to poll phone camera ready status:', error);
      }
    };

    // Poll every 2 seconds
    const pollInterval = setInterval(pollPhoneCameraReady, 2000);

    return () => {
      if (CameraService.socket) {
        CameraService.socket.off('phone_camera_ready');
      }
      clearInterval(pollInterval);
      if (healthCheckInterval.current) {
        clearInterval(healthCheckInterval.current);
      }
      CameraService.cleanup();
    };
  }, [examId, user?.id]);

  // Handle laptop camera initialization
  const handleLaptopCameraSetup = async () => {
    setTestingCameras(true);
    setError(""); // Clear any previous errors

    try {
      const stream = await CameraService.initializeLaptopCamera(selectedCamera);

      // Test camera functionality
      const hasContent = await CameraService.testCamera(stream);
      if (!hasContent) {
        setError("Camera appears to be blocked or not working properly");
        return;
      }

      // Don't auto-redirect - let student manually proceed
      setLaptopCameraReady(true);
    } catch (error) {
      console.error("Laptop camera setup failed:", error);
      
      // Provide user-friendly error messages
      let userMessage = error.message;
      
      if (error.message.includes('HTTPS') || error.message.includes('secure')) {
        userMessage = "⚠️ Secure connection required: Please access this exam using HTTPS (https://) for camera access to work properly.";
      } else if (error.message.includes('getUserMedia not supported')) {
        userMessage = "❌ Your browser doesn't support camera access. Please try using Chrome, Firefox, Safari, or Edge.";
      } else if (error.name === 'NotAllowedError' || error.message.includes('permission denied')) {
        userMessage = "🔒 Camera permission denied. Please click 'Allow' when prompted, or check your browser's camera settings.";
      } else if (error.name === 'NotFoundError' || error.message.includes('No camera found')) {
        userMessage = "📷 No camera detected. Please connect a camera and refresh the page.";
      } else if (error.message.includes('Navigator not available')) {
        userMessage = "🌐 Browser compatibility issue. Please try refreshing the page or using a different browser.";
      }
      
      setError(userMessage);
    } finally {
      setTestingCameras(false);
    }
  };

  // Handle phone camera test
  const testPhoneCamera = () => {
    setCurrentStep(3);
  };

  // Handle consent and start countdown
  const handleConsentAndStart = () => {
    if (!consentGiven) {
      setError("You must give consent for camera monitoring to proceed");
      return;
    }
    
    if (!laptopCameraReady || !phoneCameraReady) {
      setError("Both cameras must be working before starting the exam");
      return;
    }
    
    setCurrentStep(4);
    setCountdown(10);
    
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          navigate(`/student/exam/${examId}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Reset camera setup
  const resetSetup = () => {
    CameraService.cleanup();
    setLaptopCameraReady(false);
    setPhoneCameraReady(false);
    setCurrentStep(1);
    setError("");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading exam details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Shield className="w-6 h-6 text-red-600" />
                Exam Setup - {exam?.title}
              </h1>
              <p className="text-gray-600 text-sm mt-1">Dual camera monitoring required</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${connectionStatus ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-gray-600">
                  {connectionStatus ? 'Connected' : 'Connecting...'}
                </span>
              </div>
              <button
                onClick={() => navigate('/student/dashboard')}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[
              { num: 1, title: "Laptop Camera", icon: Monitor },
              { num: 2, title: "Phone Camera", icon: Smartphone },
              { num: 3, title: "Consent", icon: Shield },
              { num: 4, title: "Start Exam", icon: ArrowRight }
            ].map(({ num, title, icon: Icon }, index) => (
              <div key={num} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2 
                  ${currentStep >= num 
                    ? 'bg-red-600 border-red-600 text-white' 
                    : 'border-gray-300 text-gray-400'
                  }
                `}>
                  {currentStep > num ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  currentStep >= num ? 'text-red-600' : 'text-gray-400'
                }`}>
                  {title}
                </span>
                {index < 3 && (
                  <div className={`flex-1 h-0.5 mx-4 ${
                    currentStep > num ? 'bg-red-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-red-700 mb-3">{error}</p>
                
                {/* Actionable guidance for common issues */}
                {(error.includes('HTTPS') || error.includes('secure')) && (
                  <div className="text-sm text-red-600 bg-red-100 p-3 rounded-lg">
                    <p className="font-medium mb-2">🔧 How to fix this:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Make sure the URL starts with "https://" not "http://"</li>
                      <li>Contact your instructor for the correct secure exam link</li>
                      <li>If using localhost, try 127.0.0.1 instead</li>
                    </ul>
                  </div>
                )}
                
                {error.includes('browser') && (
                  <div className="text-sm text-red-600 bg-red-100 p-3 rounded-lg">
                    <p className="font-medium mb-2">🔧 Try these browsers:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Chrome (recommended)</li>
                      <li>Firefox</li>
                      <li>Safari</li>
                      <li>Microsoft Edge</li>
                    </ul>
                  </div>
                )}
                
                {error.includes('permission') && (
                  <div className="text-sm text-red-600 bg-red-100 p-3 rounded-lg">
                    <p className="font-medium mb-2">🔧 Camera permission steps:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Click "Allow" when prompted for camera access</li>
                      <li>Check the camera icon in your browser's address bar</li>
                      <li>Try refreshing the page and allowing again</li>
                      <li>Check browser settings: Settings → Privacy & Security → Camera</li>
                    </ul>
                  </div>
                )}
                
                {error.includes('No camera') && (
                  <div className="text-sm text-red-600 bg-red-100 p-3 rounded-lg">
                    <p className="font-medium mb-2">🔧 Camera connection:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Make sure your camera is connected and turned on</li>
                      <li>Close other apps that might be using the camera</li>
                      <li>Try unplugging and reconnecting external cameras</li>
                      <li>Refresh the page after connecting your camera</li>
                    </ul>
                  </div>
                )}
              </div>
              <button
                onClick={() => setError("")}
                className="ml-auto text-red-500 hover:text-red-700 flex-shrink-0"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Laptop Camera Setup */}
        {currentStep === 1 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-center mb-6">
              <Monitor className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Setup Laptop Camera</h2>
              <p className="text-gray-600">
                This camera will monitor your face during the exam
              </p>
            </div>

            {availableCameras.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Camera
                </label>
                <select
                  value={selectedCamera}
                  onChange={(e) => setSelectedCamera(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  {availableCameras.map(camera => (
                    <option key={camera.deviceId} value={camera.deviceId}>
                      {camera.label} {camera.facing === 'user' ? '(Front)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Camera Preview */}
            <div className="mb-6">
              <div className="relative bg-gray-900 rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                <video
                  ref={laptopVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                {!laptopCameraReady && (
                  <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                    <Camera className="w-16 h-16 text-gray-600" />
                  </div>
                )}
                {laptopCameraReady && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
                    <CheckCircle className="w-4 h-4 inline mr-1" />
                    Camera Active
                  </div>
                )}
              </div>
            </div>

            {/* Workspace Rules */}
            {laptopCameraReady && (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Camera Setup Rules
                </h3>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>Make sure your <strong>entire desk/workspace is visible</strong> in the camera</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>Position the camera to show your <strong>face, hands, and keyboard</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>Ensure <strong>good lighting</strong> so your face is clearly visible</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>Remove any unauthorized materials from your desk</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>Keep your <strong>face visible throughout the exam</strong></span>
                  </li>
                </ul>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={handleLaptopCameraSetup}
                disabled={testingCameras}
                className="flex-1 bg-red-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {testingCameras ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Camera className="w-5 h-5" />
                )}
                {testingCameras ? 'Testing Camera...' : (error ? 'Try Again' : 'Test Camera')}
              </button>

              <button
                onClick={resetSetup}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition flex items-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Reset
              </button>

              {/* Continue to phone camera after laptop is ready */}
              {laptopCameraReady && !error && (
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                >
                  <ArrowRight className="w-5 h-5" />
                  Next: Phone Camera
                </button>
              )}

              {/* Skip monitoring option for critical issues */}
              {error && (error.includes('HTTPS') || error.includes('browser') || error.includes('Navigator not available')) && (
                <button
                  onClick={() => setCurrentStep(4)}
                  className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition flex items-center gap-2"
                  title="Continue without camera monitoring (not recommended)"
                >
                  <AlertTriangle className="w-5 h-5" />
                  Skip Monitoring
                </button>
              )}
            </div>
            
            {/* Additional help for persistent issues */}
            {error && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Still having issues?</strong> Try refreshing your browser, 
                  ensuring you're using a supported browser, or contact your instructor for assistance.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Phone Camera Setup */}
        {currentStep === 2 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-center mb-6">
              <Smartphone className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Setup Phone Camera</h2>
              <p className="text-gray-600">
                Scan this QR code with your phone to setup the desk monitoring camera
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="text-center">
                <div className="bg-white p-6 rounded-lg border-2 border-gray-200 inline-block mb-4">
                  <QRCode value={phoneURL} size={200} />
                </div>
                <p className="text-sm text-gray-600 mb-2">Scan with your phone camera</p>
                <p className="text-xs text-gray-500">
                  Or manually visit: <br />
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                    {phoneURL}
                  </code>
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Instructions:</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                  <li>Open your phone camera</li>
                  <li>Point it at the QR code</li>
                  <li>Tap the notification to open the link</li>
                  <li>Allow camera permissions</li>
                  <li>Position phone to monitor your desk</li>
                  <li>Keep the phone stable during exam</li>
                </ol>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${phoneCameraReady ? 'bg-green-500' : 'bg-orange-500'}`} />
                    <span className="text-sm font-medium">
                      {phoneCameraReady ? 'Phone camera connected' : 'Waiting for phone camera...'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Back
              </button>
              
              <button
                onClick={testPhoneCamera}
                disabled={!phoneCameraReady}
                className="bg-red-600 text-white py-3 px-8 rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Consent */}
        {currentStep === 3 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-center mb-6">
              <Shield className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Camera Monitoring Consent</h2>
              <p className="text-gray-600">
                Please read and accept the monitoring terms
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">Exam Monitoring Agreement</h3>
              <div className="space-y-3 text-sm text-gray-700">
                <p>• Your exam session will be monitored via both laptop and phone cameras</p>
                <p>• Video recordings will be stored securely and reviewed only by authorized staff</p>
                <p>• Any suspicious activity may result in exam termination</p>
                <p>• Camera feeds must remain active throughout the entire exam</p>
                <p>• Attempting to disable cameras will automatically fail the exam</p>
                <p>• Recordings will be deleted after grading unless violations are detected</p>
              </div>
            </div>

            <div className="mb-6">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  className="mt-1 w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <span className="text-sm text-gray-700">
                  I have read and agree to the camera monitoring terms. I understand that both cameras 
                  must remain active throughout the exam and consent to being recorded.
                </span>
              </label>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Back
              </button>
              
              <button
                onClick={handleConsentAndStart}
                disabled={!consentGiven}
                className="bg-red-600 text-white py-3 px-8 rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Start Exam Setup
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Final Countdown */}
        {currentStep === 4 && (
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">All Set!</h2>
            <p className="text-gray-600 mb-6">
              Both cameras are active and monitoring has begun
            </p>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <div className="text-6xl font-bold text-red-600 mb-2">
                {countdown}
              </div>
              <p className="text-gray-600">Starting exam in...</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center justify-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                Laptop Camera Active
              </div>
              <div className="flex items-center justify-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                Phone Camera Active
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}