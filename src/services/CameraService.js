// Camera service for handling dual-camera monitoring
import io from 'socket.io-client';

class CameraService {
  constructor() {
    this.laptopStream = null;
    this.phoneStream = null;
    this.socket = null;
    this.microphoneStream = null;
    this.proctorAudioStream = null;
    this.audioContext = null;
    this.isMicrophoneMuted = false;
    this.isProctorSpeaking = false;
    this.hasCallRequest = false;
    this.callRequestTime = null;

    this.peerId = null;
    this.isConnected = false;
    this.callbacks = {
      onLaptopCameraReady: null,
      onPhoneCameraReady: null,
      onConnectionStatus: null,
      onError: null,
      onMicrophoneReady: null,
      onAudioStatusChange: null,
      onCallRequest: null,
      onProctorCall: null
    };
  }

  // Check if camera API is available
  checkCameraSupport() {
    if (!navigator) {
      throw new Error('Navigator not available');
    }

    if (!navigator.mediaDevices) {
      throw new Error('Camera access requires HTTPS or localhost. Please use a secure connection.');
    }

    if (!navigator.mediaDevices.getUserMedia) {
      throw new Error('getUserMedia not supported in this browser');
    }

    // Check if page is served over HTTPS (except localhost)
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isHTTPS = window.location.protocol === 'https:';
    
    if (!isHTTPS && !isLocalhost) {
      throw new Error('Camera access requires HTTPS. Please access the site using https://');
    }

    return true;
  }

  // Initialize socket connection for real-time monitoring
  async initializeSocket(examId, studentId) {
    try {
      // Use environment variable or fallback to same-origin
      const baseURL = process.env.REACT_APP_API_URL || window.location.origin;
      
      console.log('Attempting to connect to monitoring server:', baseURL);
      
      this.socket = io(baseURL, {
        query: { examId, studentId, type: 'student' },
        timeout: 10000,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000
      });

      this.socket.on('connect', () => {
        this.isConnected = true;
        this.callbacks.onConnectionStatus?.(true);
        console.log('Connected to monitoring server');
      });

      this.socket.on('disconnect', (reason) => {
        this.isConnected = false;
        this.callbacks.onConnectionStatus?.(false);
        console.log('Disconnected from monitoring server:', reason);
      });

      this.socket.on('connect_error', (error) => {
        console.warn('Socket connection error:', error.message);
        this.callbacks.onError?.('Monitoring system unavailable. Exam can continue without live monitoring.');
      });

      this.socket.on('admin_request_camera_check', () => {
        this.sendCameraStatus();
      });

      this.socket.on('exam_terminated', () => {
        this.cleanup();
        window.location.href = '/student/dashboard';
      });

      // Audio communication events
      this.socket.on('proctor_audio_start', (data) => {
        console.log('Proctor started speaking');
        this.isProctorSpeaking = true;
        this.callbacks.onProctorCall?.(true);
        this.callbacks.onAudioStatusChange?.({ proctorSpeaking: true });
      });

      this.socket.on('proctor_audio_stop', (data) => {
        console.log('Proctor stopped speaking');
        this.isProctorSpeaking = false;
        this.callbacks.onProctorCall?.(false);
        this.callbacks.onAudioStatusChange?.({ proctorSpeaking: false });
      });

      this.socket.on('microphone_toggle', (data) => {
        console.log('Proctor toggled microphone:', data.muted);
        this.setMicrophoneMuted(data.muted);
        this.callbacks.onAudioStatusChange?.({ microphoneMuted: data.muted });
      });

      this.socket.on('call_request_response', (data) => {
        console.log('Call request response:', data);
        if (data.accepted) {
          this.callbacks.onProctorCall?.(true, 'Call accepted by proctor');
        } else {
          this.callbacks.onProctorCall?.(false, 'Call dismissed by proctor');
        }
        this.hasCallRequest = false;
        this.callRequestTime = null;
      });

      // Return true even if socket fails - exam can continue without monitoring
      return true;
    } catch (error) {
      console.warn('Socket initialization failed:', error);
      this.callbacks.onError?.('Monitoring system unavailable. Exam can continue without live monitoring.');
      return true; // Allow exam to proceed
    }
  }

  // Get available cameras
  async getAvailableCameras() {
    try {
      this.checkCameraSupport();
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      return videoDevices.map(device => ({
        deviceId: device.deviceId,
        label: device.label || `Camera ${videoDevices.indexOf(device) + 1}`,
        facing: this.detectCameraFacing(device.label)
      }));
    } catch (error) {
      console.error('Error getting cameras:', error);
      throw error;
    }
  }

  // Detect camera facing direction
  detectCameraFacing(label) {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes('front') || lowerLabel.includes('user')) return 'user';
    if (lowerLabel.includes('back') || lowerLabel.includes('rear') || lowerLabel.includes('environment')) return 'environment';
    return 'unknown';
  }

  // Initialize laptop camera
  async initializeLaptopCamera(deviceId = null) {
    try {
      this.checkCameraSupport();
      
      const constraints = {
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          deviceId: deviceId ? { exact: deviceId } : undefined,
          facingMode: 'user'
        },
        audio: true
      };

      this.laptopStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.callbacks.onLaptopCameraReady?.(this.laptopStream);
      
      // Start streaming to admin if socket is ready
      if (this.socket && this.isConnected) {
        this.startLaptopStreaming();
      } else if (this.socket) {
        // Wait for socket to connect, then start streaming
        this.socket.on('connect', () => {
          this.startLaptopStreaming();
        });
      }

      return this.laptopStream;
    } catch (error) {
      console.error('Laptop camera initialization failed:', error);
      
      let errorMessage = 'Unable to access laptop camera.';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found. Please connect a camera and try again.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Camera constraints not supported. Trying with basic settings...';
        // Try again with basic constraints
        try {
          const basicConstraints = { video: true, audio: true };
          this.laptopStream = await navigator.mediaDevices.getUserMedia(basicConstraints);
          this.callbacks.onLaptopCameraReady?.(this.laptopStream);
          return this.laptopStream;
        } catch (basicError) {
          errorMessage = 'Camera not compatible with exam requirements.';
        }
      } else if (error.message.includes('HTTPS') || error.message.includes('secure')) {
        errorMessage = error.message;
      }
      
      this.callbacks.onError?.(errorMessage);
      throw new Error(errorMessage);
    }
  }

  // Generate QR code URL for phone camera
  generatePhoneURL(examId, studentId) {
    const baseURL = window.location.origin;
    const phoneURL = `${baseURL}/3/phone-camera/${examId}/${studentId}`;
    return phoneURL;
  }

  // Handle phone camera connection (called from phone)
  async initializePhoneCamera() {
    try {
      this.checkCameraSupport();
      
      const constraints = {
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: 'environment' // Back camera to monitor desk
        },
        audio: false
      };

      this.phoneStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.callbacks.onPhoneCameraReady?.(this.phoneStream);
      
      // Notify parent window if in iframe
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'PHONE_CAMERA_READY',
          stream: this.phoneStream
        }, '*');
      }
      
      // Start streaming to admin if socket is ready
      if (this.socket && this.isConnected) {
        this.startPhoneStreaming();
      } else if (this.socket) {
        // Wait for socket to connect, then start streaming
        this.socket.on('connect', () => {
          this.startPhoneStreaming();
        });
      }

      return this.phoneStream;
    } catch (error) {
      console.error('Phone camera initialization failed:', error);
      
      let errorMessage = 'Unable to access phone camera.';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No back camera found. Please use a device with a rear camera.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Back camera not available. Trying front camera...';
        // Try again with front camera
        try {
          const fallbackConstraints = {
            video: { facingMode: 'user' },
            audio: false
          };
          this.phoneStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
          this.callbacks.onPhoneCameraReady?.(this.phoneStream);
          return this.phoneStream;
        } catch (fallbackError) {
          errorMessage = 'No suitable camera found on this device.';
        }
      } else if (error.message.includes('HTTPS') || error.message.includes('secure')) {
        errorMessage = error.message;
      }
      
      this.callbacks.onError?.(errorMessage);
      throw new Error(errorMessage);
    }
  }

  // Start streaming laptop camera to admin via JPEG snapshots
  startLaptopStreaming() {
    if (!this.laptopStream || !this.socket) return;

    const video = document.createElement('video');
    video.srcObject = this.laptopStream;
    video.muted = true;
    video.play();

    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');

    this.laptopSnapshotInterval = setInterval(() => {
      if (!this.socket || !this.isConnected || !this.laptopStream) return;
      try {
        ctx.drawImage(video, 0, 0, 320, 240);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.4);
        this.socket.emit('camera_stream', {
          cameraType: 'laptop',
          data: dataUrl,
          timestamp: Date.now()
        });
      } catch (e) {
        console.warn('Laptop snapshot error:', e);
      }
    }, 67);

    this.laptopVideoEl = video;
    return this.laptopSnapshotInterval;
  }

  // Start streaming phone camera to admin via JPEG snapshots
  startPhoneStreaming() {
    if (!this.phoneStream || !this.socket) return;

    const video = document.createElement('video');
    video.srcObject = this.phoneStream;
    video.muted = true;
    video.play();

    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');

    this.phoneSnapshotInterval = setInterval(() => {
      if (!this.socket || !this.isConnected || !this.phoneStream) return;
      try {
        ctx.drawImage(video, 0, 0, 320, 240);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.4);
        this.socket.emit('phone_camera_stream', {
          data: dataUrl,
          timestamp: Date.now()
        });
      } catch (e) {
        console.warn('Phone snapshot error:', e);
      }
    }, 67);

    this.phoneVideoEl = video;
    return this.phoneSnapshotInterval;
  }

  // ... rest of the code remains the same ...
  sendCameraStatus() {
    if (!this.socket) return;

    const status = {
      laptopCamera: {
        active: !!this.laptopStream,
        tracks: this.laptopStream ? this.laptopStream.getVideoTracks().length : 0
      },
      phoneCamera: {
        active: !!this.phoneStream,
        tracks: this.phoneStream ? this.phoneStream.getVideoTracks().length : 0
      },
      timestamp: Date.now()
    };

    this.socket.emit('camera_status', status);
  }

  // Monitor camera health
  startCameraHealthCheck() {
    return setInterval(() => {
      // Check if cameras are still active
      if (this.laptopStream) {
        const videoTracks = this.laptopStream.getVideoTracks();
        if (videoTracks.length === 0 || videoTracks[0].readyState === 'ended') {
          this.callbacks.onError?.('Laptop camera connection lost');
          this.socket?.emit('camera_error', { type: 'laptop', error: 'Camera disconnected' });
        }
      }

      if (this.phoneStream) {
        const videoTracks = this.phoneStream.getVideoTracks();
        if (videoTracks.length === 0 || videoTracks[0].readyState === 'ended') {
          this.callbacks.onError?.('Phone camera connection lost');
          this.socket?.emit('camera_error', { type: 'phone', error: 'Camera disconnected' });
        }
      }

      // Send periodic status updates
      this.sendCameraStatus();
    }, 5000); // Check every 5 seconds
  }

  // Test camera functionality
  async testCamera(stream) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      
      video.onloadedmetadata = () => {
        video.play();
        setTimeout(() => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0);
          
          // Check if image has content (not black screen)
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const pixels = imageData.data;
          let hasContent = false;
          
          for (let i = 0; i < pixels.length; i += 4) {
            if (pixels[i] > 50 || pixels[i + 1] > 50 || pixels[i + 2] > 50) {
              hasContent = true;
              break;
            }
          }
          
          resolve(hasContent);
        }, 1000); // Wait 1 second for camera to adjust
      };

      video.onerror = () => reject(new Error('Camera test failed'));
    });
  }

  // Initialize microphone for proctor communication
  async initializeMicrophone() {
    try {
      this.checkCameraSupport();
      
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      };

      this.microphoneStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.callbacks.onMicrophoneReady?.(this.microphoneStream);
      
      // Start streaming audio to admin if socket is ready
      if (this.socket && this.isConnected) {
        this.startAudioStreaming();
      } else if (this.socket) {
        this.socket.on('connect', () => {
          this.startAudioStreaming();
        });
      }

      return this.microphoneStream;
    } catch (error) {
      console.error('Microphone initialization failed:', error);
      let errorMessage = 'Unable to access microphone.';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Microphone permission denied. Please allow microphone access and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No microphone found. Please connect a microphone and try again.';
      }
      this.callbacks.onError?.(errorMessage);
      throw new Error(errorMessage);
    }
  }

  // Start streaming audio to proctor (when unmuted)
  startAudioStreaming() {
    if (!this.microphoneStream || !this.socket) return;

    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = this.audioContext.createMediaStreamSource(this.microphoneStream);
    const analyzer = this.audioContext.createAnalyser();
    source.connect(analyzer);

    const dataArray = new Uint8Array(analyzer.frequencyBinCount);
    
    this.audioStreamingInterval = setInterval(() => {
      if (!this.socket || !this.isConnected || this.isMicrophoneMuted) return;
      
      try {
        analyzer.getByteFrequencyData(dataArray);
        // Calculate audio level for voice detection
        const audioLevel = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        
        // Only send audio data if there's significant sound (voice activity detection)
        if (audioLevel > 20) {
          this.socket.emit('student_audio_stream', {
            audioLevel: audioLevel,
            timestamp: Date.now()
          });
        }
      } catch (e) {
        console.warn('Audio streaming error:', e);
      }
    }, 100); // Send audio data every 100ms
  }

  // Set microphone muted state
  setMicrophoneMuted(muted) {
    this.isMicrophoneMuted = muted;
    if (this.microphoneStream) {
      const audioTracks = this.microphoneStream.getAudioTracks();
      audioTracks.forEach(track => track.enabled = !muted);
    }
    this.callbacks.onAudioStatusChange?.({ microphoneMuted: muted });
  }

  // Request proctor assistance
  requestProctorCall(message = 'Student requesting assistance') {
    if (!this.socket) return false;
    
    if (this.hasCallRequest) {
      console.warn('Call request already pending');
      return false;
    }
    
    this.hasCallRequest = true;
    this.callRequestTime = Date.now();
    
    this.socket.emit('call_request', {
      message: message,
      timestamp: this.callRequestTime
    });
    
    this.callbacks.onCallRequest?.(true, message);
    return true;
  }

  // Cancel call request
  cancelCallRequest() {
    if (!this.socket || !this.hasCallRequest) return false;
    
    this.socket.emit('cancel_call_request', {
      timestamp: Date.now()
    });
    
    this.hasCallRequest = false;
    this.callRequestTime = null;
    this.callbacks.onCallRequest?.(false);
    return true;
  }

  // Send audio status to proctor
  sendAudioStatus() {
    if (!this.socket) return;

    const status = {
      microphoneActive: !!this.microphoneStream,
      microphoneMuted: this.isMicrophoneMuted,
      proctorSpeaking: this.isProctorSpeaking,
      callRequestPending: this.hasCallRequest,
      timestamp: Date.now()
    };

    this.socket.emit('audio_status', status);
  }

  // Set event callbacks
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  // Cleanup resources
  cleanup() {
    if (this.laptopSnapshotInterval) {
      clearInterval(this.laptopSnapshotInterval);
      this.laptopSnapshotInterval = null;
    }

    if (this.phoneSnapshotInterval) {
      clearInterval(this.phoneSnapshotInterval);
      this.phoneSnapshotInterval = null;
    }

    if (this.laptopVideoEl) {
      this.laptopVideoEl.srcObject = null;
      this.laptopVideoEl = null;
    }

    if (this.phoneVideoEl) {
      this.phoneVideoEl.srcObject = null;
      this.phoneVideoEl = null;
    }

    if (this.audioStreamingInterval) {
      clearInterval(this.audioStreamingInterval);
      this.audioStreamingInterval = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.laptopStream) {
      this.laptopStream.getTracks().forEach(track => track.stop());
      this.laptopStream = null;
    }

    if (this.phoneStream) {
      this.phoneStream.getTracks().forEach(track => track.stop());
      this.phoneStream = null;
    }

    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach(track => track.stop());
      this.microphoneStream = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnected = false;
    this.hasCallRequest = false;
    this.callRequestTime = null;
  }
}

export default new CameraService();