import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import { apiGetStats, apiGetSubmissions, apiGetAdminExams } from "../../api";
import { 
  Users, 
  FileText, 
  ClipboardList, 
  TrendingUp, 
  Monitor, 
  Camera, 
  AlertTriangle,
  Activity,
  Eye,
  Wifi,
  WifiOff
} from "lucide-react";
import io from 'socket.io-client';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [activeExams, setActiveExams] = useState([]);
  const [monitoringStats, setMonitoringStats] = useState({
    activeStudents: 0,
    totalCameras: 0,
    violations: 0,
    connectionStatus: false
  });
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);

  useEffect(() => {
    Promise.all([
      apiGetStats(), 
      apiGetSubmissions(),
      apiGetAdminExams()
    ])
      .then(([s, subs, exams]) => {
        setStats(s);
        setRecentSubmissions(subs.slice(0, 5));
        setActiveExams(exams.filter(e => e.is_active).slice(0, 3));
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    // Initialize monitoring socket
    const initializeMonitoring = () => {
      const baseURL = process.env.REACT_APP_API_URL || window.location.origin;
      socketRef.current = io(baseURL, {
        query: { type: 'admin_dashboard' },
        reconnection: false
      });

      socketRef.current.on('connect', () => {
        setMonitoringStats(prev => ({ ...prev, connectionStatus: true }));
      });

      socketRef.current.on('disconnect', () => {
        setMonitoringStats(prev => ({ ...prev, connectionStatus: false }));
      });

      socketRef.current.on('dashboard_stats', (stats) => {
        setMonitoringStats(prev => ({ ...prev, ...stats }));
      });

      socketRef.current.on('global_alert', (alert) => {
        setAlerts(prev => [alert, ...prev.slice(0, 4)]);
      });
    };

    initializeMonitoring();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const cards = [
    { label: "Total Students", value: stats?.totalStudents ?? "—", icon: Users, color: "blue" },
    { label: "Total Exams", value: stats?.totalExams ?? "—", icon: FileText, color: "green" },
    { label: "Submissions", value: stats?.totalSubmissions ?? "—", icon: ClipboardList, color: "purple" },
    { label: "Average Score", value: stats?.avgScore != null ? `${stats.avgScore}%` : "—", icon: TrendingUp, color: "red" },
  ];

  const monitoringCards = [
    { label: "Active Students", value: monitoringStats.activeStudents, icon: Users, color: "green" },
    { label: "Active Cameras", value: monitoringStats.totalCameras, icon: Camera, color: "blue" },
    { label: "Violations Today", value: monitoringStats.violations, icon: AlertTriangle, color: "red" },
    { label: "Monitoring", value: monitoringStats.connectionStatus ? "ACTIVE" : "OFFLINE", icon: Monitor, color: monitoringStats.connectionStatus ? "green" : "red" },
  ];

  const colorMap = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    red: "bg-red-50 text-red-600",
  };

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <button
            onClick={() => navigate('/admin/monitoring')}
            className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition flex items-center gap-2"
          >
            <Monitor className="w-4 h-4" />
            Live Monitoring
          </button>
        </div>

        {loading ? (
          <div className="text-gray-400">Loading...</div>
        ) : (
          <>
            {/* Stats cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {cards.map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colorMap[color]}`}>
                    <Icon size={20} />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-sm text-gray-500 mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* Live Monitoring Status */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-8">
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-red-600" />
                    Live Monitoring Status
                  </h2>
                  <div className="flex items-center gap-2">
                    {monitoringStats.connectionStatus ? (
                      <Wifi className="w-4 h-4 text-green-500" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-red-500" />
                    )}
                    <span className={`text-sm font-medium ${
                      monitoringStats.connectionStatus ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {monitoringStats.connectionStatus ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {monitoringCards.map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="text-center">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2 ${colorMap[color]}`}>
                        <Icon size={24} />
                      </div>
                      <p className="text-lg font-bold text-gray-900">{value}</p>
                      <p className="text-xs text-gray-500">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Active Exams */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        Active Exams
                      </h2>
                      <button
                        onClick={() => navigate('/admin/exams')}
                        className="text-red-600 text-sm hover:text-red-700 transition"
                      >
                        View All
                      </button>
                    </div>
                  </div>

                  <div className="p-6">
                    {activeExams.length === 0 ? (
                      <div className="text-center py-8">
                        <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600">No active exams</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {activeExams.map(exam => (
                          <div key={exam.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-medium text-gray-900">{exam.title}</h3>
                                <p className="text-sm text-gray-600 mt-1">
                                  Duration: {exam.duration_minutes} minutes • 
                                  Code: <code className="bg-gray-100 px-2 py-1 rounded text-xs">{exam.access_code}</code>
                                </p>
                              </div>
                              <button
                                onClick={() => navigate(`/admin/exams/${exam.id}/monitor`)}
                                className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition flex items-center gap-2"
                              >
                                <Eye className="w-4 h-4" />
                                Monitor
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Live Alerts & Recent Submissions */}
              <div className="space-y-6">
                {/* Live Alerts */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      Live Alerts
                    </h2>
                  </div>
                  <div className="p-6">
                    {alerts.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-4">No recent alerts</p>
                    ) : (
                      <div className="space-y-3">
                        {alerts.map((alert, index) => (
                          <div key={index} className="flex items-start gap-2 p-2 bg-red-50 rounded text-sm">
                            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-red-800">{alert.message}</p>
                              <p className="text-red-600 text-xs mt-1">{alert.time}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent submissions */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-900">Recent Submissions</h2>
                  </div>
                  {recentSubmissions.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 text-sm">No submissions yet</div>
                  ) : (
                    <div className="p-6">
                      <div className="space-y-3">
                        {recentSubmissions.map((s) => (
                          <div key={s.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {s.first_name} {s.last_name}
                              </p>
                              <p className="text-xs text-gray-600">{s.exam_title}</p>
                            </div>
                            <div className="text-right">
                              <p className={`text-sm font-semibold ${s.score >= 60 ? "text-green-600" : "text-red-500"}`}>
                                {s.score}%
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(s.submitted_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
