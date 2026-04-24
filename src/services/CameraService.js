// Camera service for handling dual-camera monitoring
import io from 'socket.io-client';

class CameraService {
  constructor() {
    this.laptopStream = null;
    this.phoneStream = null;
    this.socket = null;
    this.peerId = null;
    this.isConnected = false;
    this.callbacks = {
      onLaptopCameraReady: null,
      onPhoneCameraReady: null,
      onConnectionStatus: null,
      onError: null
    };
  }

  // Initialize socket connection for real-time monitoring
  async initializeSocket(examId, studentId) {
    try {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:4000';
      this.socket = io(baseURL, {
        query: { examId, studentId, type: 'student' }
      });

      this.socket.on('connect', () => {
        this.isConnected = true;
        this.callbacks.onConnectionStatus?.(true);
        console.log('Connected to monitoring server');
      });

      this.socket.on('disconnect', () => {
        this.isConnected = false;
        this.callbacks.onConnectionStatus?.(false);
        console.log('Disconnected from monitoring server');
      });

      this.socket.on('admin_request_camera_check', () => {
        this.sendCameraStatus();
      });

      this.socket.on('exam_terminated', () => {
        this.cleanup();
        window.location.href = '/student/dashboard';
      });

      return true;
    } catch (error) {
      console.error('Socket initialization failed:', error);
      this.callbacks.onError?.('Failed to connect to monitoring system');
      return false;
    }
  }

  // Get available cameras
  async getAvailableCameras() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      return videoDevices.map(device => ({
        deviceId: device.deviceId,
        label: device.label || `Camera ${videoDevices.indexOf(device) + 1}`,
        facing: this.detectCameraFacing(device.label)
      }));
    } catch (error) {
      console.error('Error getting cameras:', error);
      throw new Error('Unable to access camera devices');
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
      }

      return this.laptopStream;
    } catch (error) {
      console.error('Laptop camera initialization failed:', error);
      this.callbacks.onError?.('Unable to access laptop camera. Please check permissions.');
      throw error;
    }
  }

  // Generate QR code URL for phone camera
  generatePhoneURL(examId, studentId) {
    const baseURL = window.location.origin;
    const phoneURL = `${baseURL}/phone-camera/${examId}/${studentId}`;
    return phoneURL;
  }

  // Handle phone camera connection (called from phone)
  async initializePhoneCamera() {
    try {
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

      return this.phoneStream;
    } catch (error) {
      console.error('Phone camera initialization failed:', error);
      this.callbacks.onError?.('Unable to access phone camera. Please check permissions.');
      throw error;
    }
  }

  // Start streaming laptop camera to admin
  startLaptopStreaming() {
    if (!this.laptopStream || !this.socket) return;

    // Create media recorder for streaming
    const mediaRecorder = new MediaRecorder(this.laptopStream, {
      mimeType: 'video/webm; codecs=vp8,opus',
      videoBitsPerSecond: 500000 // 500kbps for real-time streaming
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && this.socket) {
        // Send video chunks to admin via socket
        const reader = new FileReader();
        reader.onload = () => {
          this.socket.emit('video_chunk', {
            type: 'laptop',
            data: reader.result,
            timestamp: Date.now()
          });
        };
        reader.readAsArrayBuffer(event.data);
      }
    };

    // Record in 1-second chunks for real-time streaming
    mediaRecorder.start(1000);
    
    return mediaRecorder;
  }

  // Send current camera status to admin
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

  // Set event callbacks
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  // Cleanup resources
  cleanup() {
    if (this.laptopStream) {
      this.laptopStream.getTracks().forEach(track => track.stop());
      this.laptopStream = null;
    }

    if (this.phoneStream) {
      this.phoneStream.getTracks().forEach(track => track.stop());
      this.phoneStream = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnected = false;
  }
}

export default new CameraService();