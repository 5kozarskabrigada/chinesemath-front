import React, { useEffect, useState, useRef } from "react";
import AdminLayout from "../../components/AdminLayout";
import { 
  Monitor, 
  Smartphone, 
  Users, 
  Camera, 
  AlertTriangle,
  CheckCircle,
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
  Maximize2,
  RotateCcw,
  MessageSquare,
  Send,
  XCircle,
  UserCheck,
  Eye,
  RefreshCw
} from "lucide-react";
import io from 'socket.io-client';

export default function ExamMonitoring({ examId }) {
  const [exam, setExam] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [customMessage, setCustomMessage] = useState('');
  const [messageHistory, setMessageHistory] = useState([]);
  const socketRef = useRef(null);
  const laptopVideoRef = useRef(null);
  const phoneVideoRef = useRef(null);

  useEffect(() => {
    const initializeMonitoring = async () => {
      // Don't initialize if examId is missing
      if (!examId || examId === 'undefined') {
        console.warn('ExamMonitoring: examId is missing, skipping socket connection');
        return;
      }

      try {
        // Initialize socket connection for admin monitoring
        const baseURL = process.env.REACT_APP_API_URL || window.location.origin;
        socketRef.current = io(baseURL, {
          query: { examId, type: 'admin' },
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 2000
        });

        socketRef.current.on('connect', () => {
          setConnectionStatus(true);
          console.log('Connected to monitoring server');
        });

        socketRef.current.on('disconnect', () => {
          setConnectionStatus(false);
          console.log('Disconnected from monitoring server');
        });

        // Listen for student connections
        socketRef.current.on('student_connected', (studentData) => {
          setStudents(prev => {
            const existing = prev.find(s => s.id === studentData.id);
            if (existing) {
              return prev.map(s => s.id === studentData.id ? { ...s, ...studentData, connected: true } : s);
            }
            return [...prev, { ...studentData, connected: true }];
          });
        });

        socketRef.current.on('student_disconnected', (studentId) => {
          setStudents(prev => 
            prev.map(s => s.id === studentId ? { ...s, connected: false } : s)
          );
          
          setAlerts(prev => [...prev, {
            id: Date.now(),
            type: 'disconnect',
            studentId,
            message: `Student disconnected`,
            timestamp: new Date()
          }]);
        });

        // Listen for camera status updates
        socketRef.current.on('camera_status', (data) => {
          setStudents(prev => 
            prev.map(s => s.id === data.studentId ? { 
              ...s, 
              laptopCamera: data.laptopCamera,
              phoneCamera: data.phoneCamera
            } : s)
          );
        });

        // Listen for camera errors
        socketRef.current.on('camera_error', (data) => {
          setAlerts(prev => [...prev, {
            id: Date.now(),
            type: 'camera_error',
            studentId: data.studentId,
            message: `${data.type} camera error: ${data.error}`,
            timestamp: new Date()
          }]);
        });

        // Listen for laptop camera stream
        socketRef.current.on('student_camera_stream', (data) => {
          if (selectedStudent?.id === data.studentId && data.data) {
            const blob = new Blob([data.data], { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            if (laptopVideoRef.current) {
              laptopVideoRef.current.src = url;
            }
          }
        });

        // Listen for phone camera stream
        socketRef.current.on('student_phone_camera_stream', (data) => {
          if (selectedStudent?.id === data.studentId && data.data) {
            const blob = new Blob([data.data], { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            if (phoneVideoRef.current) {
              phoneVideoRef.current.src = url;
            }
          }
        });

        // Listen for exam violations
        socketRef.current.on('exam_violation', (data) => {
          setAlerts(prev => [...prev, {
            id: Date.now(),
            type: 'violation',
            studentId: data.studentId,
            message: data.violation,
            timestamp: new Date()
          }]);
        });

      } catch (error) {
        console.error('Failed to initialize monitoring:', error);
      }
    };

    initializeMonitoring();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [examId]);

  const requestCameraCheck = (studentId) => {
    if (socketRef.current) {
      socketRef.current.emit('admin_request_camera_check', { targetStudentId: studentId });
    }
  };

  const sendMessage = (message, messageType) => {
    if (socketRef.current && selectedStudent) {
      socketRef.current.emit('admin_message', {
        targetStudentId: selectedStudent.id,
        message,
        messageType
      });
      
      setMessageHistory(prev => [...prev, {
        id: Date.now(),
        studentId: selectedStudent.id,
        studentName: selectedStudent.name || `Student ${selectedStudent.id.slice(0, 8)}`,
        message,
        messageType,
        timestamp: new Date()
      }]);
    }
  };

  const sendCustomMessage = () => {
    if (customMessage.trim()) {
      sendMessage(customMessage, 'custom');
      setCustomMessage('');
    }
  };

  const terminateExam = (studentId) => {
    if (socketRef.current && window.confirm('Are you sure you want to terminate this student\'s exam?')) {
      socketRef.current.emit('admin_terminate_exam', { targetStudentId: studentId });
      sendMessage('Your exam has been terminated by the administrator.', 'disqualify');
    }
  };

  const dismissAlert = (alertId) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'disconnect': return <WifiOff className="w-5 h-5 text-red-500" />;
      case 'camera_error': return <Camera className="w-5 h-5 text-yellow-500" />;
      case 'violation': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default: return <AlertTriangle className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Monitor className="w-8 h-8 text-red-600" />
              Exam Monitoring
            </h1>
            <p className="text-gray-600 mt-1">Live dual-camera monitoring for {exam?.title}</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${connectionStatus ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-600">
                {connectionStatus ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <span className="text-sm text-gray-500">
              {students.filter(s => s.connected).length} / {students.length} students online
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Students List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Students ({students.length})
              </h2>
              
              <div className="space-y-3">
                {students.map(student => (
                  <div
                    key={student.id}
                    onClick={() => setSelectedStudent(student)}
                    className={`
                      p-3 rounded-lg border cursor-pointer transition
                      ${selectedStudent?.id === student.id 
                        ? 'border-red-500 bg-red-50' 
                        : 'border-gray-200 hover:border-gray-300'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900 text-sm">
                        {student.name || `Student ${student.id.slice(0, 8)}`}
                      </span>
                      <div className={`w-2 h-2 rounded-full ${student.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <Monitor className={`w-3 h-3 ${student.laptopCamera?.active ? 'text-green-500' : 'text-red-500'}`} />
                        <span className={student.laptopCamera?.active ? 'text-green-600' : 'text-red-600'}>
                          Laptop
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Smartphone className={`w-3 h-3 ${student.phoneCamera?.active ? 'text-green-500' : 'text-red-500'}`} />
                        <span className={student.phoneCamera?.active ? 'text-green-600' : 'text-red-600'}>
                          Phone
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Alerts */}
            <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Alerts ({alerts.length})
              </h2>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {alerts.slice(0, 10).map(alert => (
                  <div key={alert.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded text-xs">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1">
                      <p className="text-gray-800">{alert.message}</p>
                      <p className="text-gray-500 text-xs">
                        {alert.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    <button
                      onClick={() => dismissAlert(alert.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
                
                {alerts.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">No alerts</p>
                )}
              </div>
            </div>
          </div>

          {/* Video Monitoring */}
          <div className="lg:col-span-3">
            {selectedStudent ? (
              <div className="space-y-6">
                {/* Student Info & Controls */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        {selectedStudent.name || `Student ${selectedStudent.id.slice(0, 8)}`}
                      </h2>
                      <p className="text-gray-600 text-sm">
                        Status: {selectedStudent.connected ? 'Online' : 'Offline'}
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => requestCameraCheck(selectedStudent.id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition flex items-center gap-2"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Check Cameras
                      </button>
                      
                      <button
                        onClick={() => terminateExam(selectedStudent.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition flex items-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Disqualify
                      </button>
                    </div>
                  </div>
                </div>

                {/* Camera Feeds */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Laptop Camera */}
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Monitor className="w-5 h-5 text-blue-600" />
                        Laptop Camera
                      </h3>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${selectedStudent.laptopCamera?.active ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-sm text-gray-600">
                          {selectedStudent.laptopCamera?.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="relative bg-gray-900 rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                      <video
                        ref={laptopVideoRef}
                        autoPlay
                        muted
                        className="w-full h-full object-cover"
                      />
                      {!selectedStudent.laptopCamera?.active && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Camera className="w-12 h-12 text-gray-600" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Phone Camera */}
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Smartphone className="w-5 h-5 text-green-600" />
                        Phone Camera
                      </h3>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${selectedStudent.phoneCamera?.active ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-sm text-gray-600">
                          {selectedStudent.phoneCamera?.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="relative bg-gray-900 rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                      <video
                        ref={phoneVideoRef}
                        autoPlay
                        muted
                        className="w-full h-full object-cover"
                      />
                      {!selectedStudent.phoneCamera?.active && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Smartphone className="w-12 h-12 text-gray-600" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Admin Messaging Panel */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-purple-600" />
                    Send Message to Student
                  </h3>
                  
                  {/* Preset Messages */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <button
                      onClick={() => sendMessage('Please stand up and do a 360° turn.', 'stand_360')}
                      className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm hover:bg-blue-100 transition flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Stand & 360°
                    </button>
                    
                    <button
                      onClick={() => sendMessage('Please show your desk/workspace clearly.', 'show_desk')}
                      className="px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm hover:bg-green-100 transition flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Show Desk
                    </button>
                    
                    <button
                      onClick={() => sendMessage('Please verify your identity by showing your face.', 'verify_identity')}
                      className="px-3 py-2 bg-yellow-50 text-yellow-700 rounded-lg text-sm hover:bg-yellow-100 transition flex items-center justify-center gap-2"
                    >
                      <UserCheck className="w-4 h-4" />
                      Verify ID
                    </button>
                    
                    <button
                      onClick={() => sendMessage('Please return to your seat and focus on the exam.', 'return_seat')}
                      className="px-3 py-2 bg-orange-50 text-orange-700 rounded-lg text-sm hover:bg-orange-100 transition flex items-center justify-center gap-2"
                    >
                      <Monitor className="w-4 h-4" />
                      Return to Seat
                    </button>
                  </div>
                  
                  {/* Custom Message Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendCustomMessage()}
                      placeholder="Type a custom message..."
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      onClick={sendCustomMessage}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Send
                    </button>
                  </div>
                </div>

                {/* Message History */}
                {messageHistory.length > 0 && (
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-gray-600" />
                      Message History
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {messageHistory.slice(-10).reverse().map(msg => (
                        <div key={msg.id} className="p-3 bg-gray-50 rounded-lg text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-900">{msg.studentName}</span>
                            <span className="text-xs text-gray-500">{msg.timestamp.toLocaleTimeString()}</span>
                          </div>
                          <p className="text-gray-700">{msg.message}</p>
                          <span className="inline-block mt-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                            {msg.messageType}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a Student</h3>
                <p className="text-gray-600">
                  Choose a student from the list to view their camera feeds and monitoring status
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}