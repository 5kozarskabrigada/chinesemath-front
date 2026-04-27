import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../authContext";
import {
  LayoutDashboard,
  FileText,
  Users,
  ClipboardList,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  School,
  Activity,
  Trash2,
  Monitor,
  Video,
} from "lucide-react";

// Navigation items for admin sidebar
const navItems = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/exams", label: "Exams", icon: FileText },
  { to: "/admin/monitoring", label: "Live Monitoring", icon: Monitor },
  { to: "/admin/submissions", label: "Submissions", icon: ClipboardList },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/classrooms", label: "Classrooms", icon: School },
  { to: "/admin/exam-sessions", label: "Exam Sessions", icon: Video },
  { to: "/admin/logs", label: "Activity Logs", icon: Activity },
  { to: "/admin/recycle-bin", label: "Recycle Bin", icon: Trash2 },
];

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`${
          collapsed ? "w-16" : "w-64"
        } h-screen bg-white border-r border-gray-100 flex flex-col shadow-sm transition-all duration-300 overflow-hidden sticky top-0`}
      >
        {/* Header */}
        <div className={`border-b border-gray-100 flex items-center ${collapsed ? "p-3 justify-center" : "p-4 justify-between"}`}>
          {!collapsed && (
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center shadow shrink-0">
                <span className="text-white text-base font-bold">M</span>
              </div>
              <div className="min-w-0">
                <p className="font-bold text-gray-900 text-sm truncate">Chinese Math</p>
                <p className="text-xs text-gray-500">Admin Console</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center shadow">
              <span className="text-white text-base font-bold">M</span>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-500 shrink-0"
              title="Collapse sidebar"
            >
              <PanelLeftClose size={17} />
            </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {collapsed && (
          <div className="flex justify-center pt-2 pb-1">
            <button
              onClick={() => setCollapsed(false)}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-500"
              title="Expand sidebar"
            >
              <PanelLeftOpen size={17} />
            </button>
          </div>
        )}

        <nav className={`flex-1 space-y-1 ${collapsed ? "p-2" : "p-4"}`}>
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center rounded-xl text-sm font-medium transition-all ${
                  collapsed ? "px-2.5 py-2.5 justify-center" : "space-x-3 px-3 py-2.5"
                } ${
                  isActive
                    ? "bg-red-50 text-red-600"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`
              }
            >
              <Icon size={18} />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className={`border-t border-gray-100 ${collapsed ? "p-2" : "p-4"}`}>
          {!collapsed && (
            <div className="flex items-center space-x-3 px-3 py-2 mb-2 min-w-0">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.username}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            title={collapsed ? "Log Out" : undefined}
            className={`w-full flex items-center rounded-xl text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all ${
              collapsed ? "justify-center p-2.5" : "space-x-3 px-3 py-2.5"
            }`}
          >
            <LogOut size={18} />
            {!collapsed && <span>Log Out</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
