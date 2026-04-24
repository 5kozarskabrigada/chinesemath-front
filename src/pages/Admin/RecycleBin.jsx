import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { apiGetRecycleBin, apiRestoreRecycleBinItem, apiPermanentlyDeleteRecycleBinItem } from "../../api";
import { Trash2, RotateCcw, Search, Users, FileText, School, HelpCircle, Loader2, AlertTriangle } from "lucide-react";

const typeMap = {
  users: { name: "User", icon: Users, color: "blue" },
  exams: { name: "Exam", icon: FileText, color: "green" },
  questions: { name: "Question", icon: HelpCircle, color: "purple" },
  classrooms: { name: "Classroom", icon: School, color: "indigo" },
};

const colorClasses = {
  blue: { 
    bg: "bg-blue-50", 
    border: "border-blue-200", 
    text: "text-blue-700",
    badge: "bg-blue-100 text-blue-700",
    restore: "bg-blue-600 hover:bg-blue-700",
    delete: "bg-red-600 hover:bg-red-700"
  },
  green: { 
    bg: "bg-green-50", 
    border: "border-green-200", 
    text: "text-green-700",
    badge: "bg-green-100 text-green-700",
    restore: "bg-green-600 hover:bg-green-700",
    delete: "bg-red-600 hover:bg-red-700"
  },
  purple: { 
    bg: "bg-purple-50", 
    border: "border-purple-200", 
    text: "text-purple-700",
    badge: "bg-purple-100 text-purple-700",
    restore: "bg-purple-600 hover:bg-purple-700",
    delete: "bg-red-600 hover:bg-red-700"
  },
  indigo: { 
    bg: "bg-indigo-50", 
    border: "border-indigo-200", 
    text: "text-indigo-700",
    badge: "bg-indigo-100 text-indigo-700",
    restore: "bg-indigo-600 hover:bg-indigo-700",
    delete: "bg-red-600 hover:bg-red-700"
  },
};

export default function RecycleBin() {
  const [data, setData] = useState({ users: [], exams: [], questions: [], classrooms: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [actionLoading, setActionLoading] = useState({});
  const [confirmDialog, setConfirmDialog] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiGetRecycleBin();
      setData(result);
    } catch (e) {
      setError("Failed to load recycle bin");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleRestore = async (type, id, name) => {
    setActionLoading({ [`${type}_${id}`]: "restore" });
    try {
      await apiRestoreRecycleBinItem(type, id);
      await load();
    } catch (e) {
      alert(`Failed to restore ${name}`);
    }
    setActionLoading({});
  };

  const handlePermanentDelete = async (type, id, name) => {
    setActionLoading({ [`${type}_${id}`]: "delete" });
    try {
      await apiPermanentlyDeleteRecycleBinItem(type, id);
      await load();
      setConfirmDialog(null);
    } catch (e) {
      alert(`Failed to permanently delete ${name}`);
    }
    setActionLoading({});
  };

  const getItemName = (type, item) => {
    switch (type) {
      case "users": return `${item.first_name} ${item.last_name} (@${item.username})`;
      case "exams": return item.title;
      case "questions": return `Question ${item.question_number}`;
      case "classrooms": return item.name;
      default: return "Unknown";
    }
  };

  const getItemDescription = (type, item) => {
    switch (type) {
      case "users": return item.email || "No email";
      case "exams": return `Code: ${item.access_code}`;
      case "questions": return `Exam ID: ${item.exam_id}`;
      case "classrooms": return item.description || "No description";
      default: return "";
    }
  };

  const filteredData = () => {
    const filtered = {};
    Object.keys(data).forEach(type => {
      if (selectedCategory !== "all" && selectedCategory !== type) {
        filtered[type] = [];
        return;
      }
      filtered[type] = data[type].filter(item => {
        const name = getItemName(type, item).toLowerCase();
        const desc = getItemDescription(type, item).toLowerCase();
        return name.includes(searchTerm.toLowerCase()) || desc.includes(searchTerm.toLowerCase());
      });
    });
    return filtered;
  };

  const getTotalItems = () => Object.values(data).reduce((sum, items) => sum + items.length, 0);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-red-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading recycle bin...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-medium">{error}</p>
            <button 
              onClick={load}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Try Again
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const totalItems = getTotalItems();

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Trash2 className="w-8 h-8 text-red-600" />
                Recycle Bin
              </h1>
              <p className="text-gray-600 mt-1">
                {totalItems} deleted {totalItems === 1 ? 'item' : 'items'} • Restore or permanently delete
              </p>
            </div>
            {totalItems > 0 && (
              <button
                onClick={() => load()}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Refresh
              </button>
            )}
          </div>

          {/* Search and Filter */}
          {totalItems > 0 && (
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search deleted items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              >
                <option value="all">All Categories</option>
                {Object.entries(typeMap).map(([key, { name }]) => (
                  <option key={key} value={key}>{name}s</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Content */}
        {totalItems === 0 ? (
          <div className="text-center py-12">
            <Trash2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Recycle bin is empty</h3>
            <p className="text-gray-600">
              No deleted items found. When you delete users, exams, questions, or classrooms, they'll appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(filteredData()).map(([type, items]) => {
              if (items.length === 0) return null;
              
              const typeInfo = typeMap[type];
              const colors = colorClasses[typeInfo.color];
              
              return (
                <div key={type} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <typeInfo.icon className={`w-5 h-5 ${colors.text}`} />
                    <h2 className={`text-xl font-semibold ${colors.text}`}>
                      {typeInfo.name}s
                    </h2>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors.badge}`}>
                      {items.length}
                    </span>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {items.map((item) => {
                      const itemName = getItemName(type, item);
                      const itemDesc = getItemDescription(type, item);
                      const loadingKey = `${type}_${item.id}`;
                      const isRestoring = actionLoading[loadingKey] === "restore";
                      const isDeleting = actionLoading[loadingKey] === "delete";
                      
                      return (
                        <div key={item.id} className={`p-4 rounded-lg border ${colors.bg} ${colors.border}`}>
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-900 truncate" title={itemName}>
                                {itemName}
                              </h3>
                              {itemDesc && (
                                <p className="text-sm text-gray-600 truncate" title={itemDesc}>
                                  {itemDesc}
                                </p>
                              )}
                              <p className="text-xs text-gray-500 mt-1">
                                ID: {item.id.slice(0, 8)}...
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleRestore(type, item.id, itemName)}
                              disabled={isRestoring || isDeleting}
                              className={`flex-1 px-3 py-2 text-white rounded-md font-medium transition text-sm flex items-center justify-center gap-2 ${colors.restore} disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              {isRestoring ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <RotateCcw className="w-4 h-4" />
                              )}
                              {isRestoring ? "Restoring..." : "Restore"}
                            </button>
                            
                            <button
                              onClick={() => setConfirmDialog({ type, id: item.id, name: itemName })}
                              disabled={isRestoring || isDeleting}
                              className={`flex-1 px-3 py-2 text-white rounded-md font-medium transition text-sm flex items-center justify-center gap-2 ${colors.delete} disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              {isDeleting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                              {isDeleting ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Confirmation Dialog */}
        {confirmDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Permanently Delete</h3>
                  <p className="text-sm text-gray-600">This action cannot be undone</p>
                </div>
              </div>
              
              <p className="text-gray-700 mb-6">
                Are you sure you want to permanently delete "<strong>{confirmDialog.name}</strong>"? 
                This will remove it completely from the database.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handlePermanentDelete(confirmDialog.type, confirmDialog.id, confirmDialog.name)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition"
                >
                  Delete Forever
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}