import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import {
  DollarSign,
  Server,
  Database,
  Users,
  Activity,
  Calendar,
  TrendingUp,
  Shield,
  User,
  ArrowUpDown,
  Download
} from "lucide-react";
import { apiGetPerStudentUsage, apiGetUsageSummary } from "../../api";

export default function UsagePage() {
  const [loading, setLoading] = useState(true);
  const [usageData, setUsageData] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [activeTab, setActiveTab] = useState("per-user");
  const [sortField, setSortField] = useState("total_response_ms");
  const [sortDirection, setSortDirection] = useState("desc");
  
  // Cost inputs
  const [hetznerCost, setHetznerCost] = useState(10);
  const [neonCost, setNeonCost] = useState(5);
  
  // Date filter
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    loadUsageData();
  }, [fromDate, toDate]);

  const loadUsageData = async () => {
    try {
      setLoading(true);
      const [perStudent, summary] = await Promise.all([
        apiGetPerStudentUsage(fromDate, toDate),
        apiGetUsageSummary(fromDate, toDate)
      ]);
      setUsageData(perStudent);
      setSummaryData(summary);
    } catch (error) {
      console.error("Failed to load usage data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const getSortedUsers = () => {
    if (!usageData?.users) return [];
    
    return [...usageData.users].sort((a, b) => {
      const aVal = a[sortField] || 0;
      const bVal = b[sortField] || 0;
      
      if (sortDirection === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  };

  const calculateCosts = () => {
    if (!usageData?.totals) return null;
    
    const totalCost = hetznerCost + neonCost;
    const totalMs = usageData.totals.total_response_ms || 1;
    
    const studentMs = usageData.totals.student_response_ms || 0;
    const adminMs = usageData.totals.admin_response_ms || 0;
    
    const studentPct = totalMs > 0 ? (studentMs / totalMs) * 100 : 0;
    const adminPct = totalMs > 0 ? (adminMs / totalMs) * 100 : 0;
    
    // Allocate costs proportionally
    const studentCost = totalCost * (studentPct / 100);
    const adminCost = totalCost * (adminPct / 100);
    
    // Per-user costs
    const userCosts = usageData.users.map(user => {
      const userMs = user.total_response_ms || 0;
      const userPct = totalMs > 0 ? (userMs / totalMs) * 100 : 0;
      return {
        ...user,
        estimated_cost: totalCost * (userPct / 100)
      };
    });
    
    return {
      totalCost,
      hetznerCost,
      neonCost,
      studentCost,
      adminCost,
      studentPct,
      adminPct,
      userCosts
    };
  };

  const costs = calculateCosts();

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-red-600" />
            Usage & Costs
          </h1>
          <p className="text-gray-600 mt-1">Track API usage and infrastructure costs per user</p>
        </div>

        {/* Date Filter */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Date Range:</span>
            </div>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            <button
              onClick={() => { setFromDate(""); setToDate(""); }}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Cost Configuration */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Monthly Infrastructure Costs ($)
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hetzner (Server)</label>
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  value={hetznerCost}
                  onChange={(e) => setHetznerCost(parseFloat(e.target.value) || 0)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  step="0.01"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Neon (Database)</label>
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  value={neonCost}
                  onChange={(e) => setNeonCost(parseFloat(e.target.value) || 0)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  step="0.01"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Combined</label>
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span className="text-2xl font-bold text-gray-900">${(hetznerCost + neonCost).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Cost Allocation Cards */}
        {costs && (
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-lg p-6 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900">Student Share</span>
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-blue-900">{costs.studentPct.toFixed(1)}%</div>
              <div className="text-sm text-blue-700 mt-1">${costs.studentCost.toFixed(2)} / month</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-lg p-6 border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-purple-900">Admin Share</span>
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-purple-900">{costs.adminPct.toFixed(1)}%</div>
              <div className="text-sm text-purple-700 mt-1">${costs.adminCost.toFixed(2)} / month</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-lg p-6 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-900">Total Cost</span>
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-green-900">${costs.totalCost.toFixed(2)}</div>
              <div className="text-sm text-green-700 mt-1">Combined monthly cost</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab("per-user")}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition ${
                  activeTab === "per-user"
                    ? "border-red-600 text-red-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                Per-User Breakdown
              </button>
              <button
                onClick={() => setActiveTab("summary")}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition ${
                  activeTab === "summary"
                    ? "border-red-600 text-red-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Activity className="w-4 h-4 inline mr-2" />
                Summary
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === "per-user" ? (
              <PerUserTable
                users={costs?.userCosts || usageData?.users || []}
                totals={usageData?.totals}
                onSort={handleSort}
                sortField={sortField}
                sortDirection={sortDirection}
              />
            ) : (
              <SummaryTab summaryData={summaryData} />
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function PerUserTable({ users, totals, onSort, sortField, sortDirection }) {
  const getSortIcon = (field) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    return sortDirection === "asc" ? 
      <ArrowUpDown className="w-4 h-4 text-red-600" /> : 
      <ArrowUpDown className="w-4 h-4 text-red-600 rotate-180" />;
  };

  const getRoleBadge = (role) => {
    if (role === "admin") {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full flex items-center gap-1">
          <Shield className="w-3 h-3" />
          Admin
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full flex items-center gap-1">
        <User className="w-3 h-3" />
        Student
      </span>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
              User
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-50" onClick={() => onSort("user_role")}>
              <div className="flex items-center gap-1">
                Role {getSortIcon("user_role")}
              </div>
            </th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-50" onClick={() => onSort("total_requests")}>
              <div className="flex items-center gap-1 justify-end">
                Requests {getSortIcon("total_requests")}
              </div>
            </th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-50" onClick={() => onSort("total_response_ms")}>
              <div className="flex items-center gap-1 justify-end">
                Response Time (ms) {getSortIcon("total_response_ms")}
              </div>
            </th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-50" onClick={() => onSort("active_days")}>
              <div className="flex items-center gap-1 justify-end">
                Active Days {getSortIcon("active_days")}
              </div>
            </th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-50" onClick={() => onSort("pct_of_total_time")}>
              <div className="flex items-center gap-1 justify-end">
                % Share {getSortIcon("pct_of_total_time")}
              </div>
            </th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-50" onClick={() => onSort("estimated_cost")}>
              <div className="flex items-center gap-1 justify-end">
                Est. Cost ($) {getSortIcon("estimated_cost")}
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.user_id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4">
                <div>
                  <div className="font-medium text-gray-900">
                    {user.first_name && user.last_name ? 
                      `${user.first_name} ${user.last_name}` : 
                      user.username || user.email || `User ${user.user_id?.slice(0, 8)}`
                    }
                  </div>
                  <div className="text-xs text-gray-500">{user.email}</div>
                </div>
              </td>
              <td className="py-3 px-4">{getRoleBadge(user.user_role)}</td>
              <td className="py-3 px-4 text-right text-gray-700">{user.total_requests?.toLocaleString() || 0}</td>
              <td className="py-3 px-4 text-right text-gray-700">{user.total_response_ms?.toLocaleString() || 0}</td>
              <td className="py-3 px-4 text-right text-gray-700">{user.active_days || 0}</td>
              <td className="py-3 px-4 text-right">
                <span className="font-semibold text-gray-900">{user.pct_of_total_time?.toFixed(2) || 0}%</span>
              </td>
              <td className="py-3 px-4 text-right">
                <span className="font-semibold text-green-600">${user.estimated_cost?.toFixed(2) || "0.00"}</span>
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan="7" className="py-8 text-center text-gray-500">
                No usage data available for this period
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function SummaryTab({ summaryData }) {
  if (!summaryData) {
    return (
      <div className="text-center py-8 text-gray-500">
        Loading summary data...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* By Role */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          Usage by Role
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Role</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Requests</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Total Time (ms)</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Avg Time (ms)</th>
              </tr>
            </thead>
            <tbody>
              {summaryData.by_role.map((item) => (
                <tr key={item.user_role} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900 capitalize">{item.user_role}</td>
                  <td className="py-3 px-4 text-right text-gray-700">{item.requests?.toLocaleString() || 0}</td>
                  <td className="py-3 px-4 text-right text-gray-700">{item.total_ms?.toLocaleString() || 0}</td>
                  <td className="py-3 px-4 text-right text-gray-700">
                    {item.requests > 0 ? Math.round(item.total_ms / item.requests) : 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Endpoints */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-green-600" />
          Top Endpoints
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Path</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Requests</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Total Time (ms)</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Avg Time (ms)</th>
              </tr>
            </thead>
            <tbody>
              {summaryData.top_endpoints.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-sm text-gray-700">{item.path}</td>
                  <td className="py-3 px-4 text-right text-gray-700">{item.requests?.toLocaleString() || 0}</td>
                  <td className="py-3 px-4 text-right text-gray-700">{item.total_ms?.toLocaleString() || 0}</td>
                  <td className="py-3 px-4 text-right text-gray-700">{item.avg_ms || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily Activity */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-600" />
          Daily Activity
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Date</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Requests</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Unique Users</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Total Time (ms)</th>
              </tr>
            </thead>
            <tbody>
              {summaryData.by_day.map((item) => (
                <tr key={item.day} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-700">{item.day}</td>
                  <td className="py-3 px-4 text-right text-gray-700">{item.requests?.toLocaleString() || 0}</td>
                  <td className="py-3 px-4 text-right text-gray-700">{item.unique_users || 0}</td>
                  <td className="py-3 px-4 text-right text-gray-700">{item.total_ms?.toLocaleString() || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
