import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { apiGetRecycleBin, apiRestoreRecycleBinItem, apiPermanentlyDeleteRecycleBinItem } from "../../api/recycleBin";

function fetchDeleted() {
  return fetch("/api/admin/recycle-bin").then((res) => res.json());
}

const typeMap = {
  users: "User",
  exams: "Exam",
  questions: "Question",
  classrooms: "Classroom",
};

export default function RecycleBin() {
  const [data, setData] = useState({ users: [], exams: [], questions: [], classrooms: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const handleRestore = async (type, id) => {
    await apiRestoreRecycleBinItem(type, id);
    load();
  };

  const handlePermanentDelete = async (type, id) => {
    if (!window.confirm("Permanently delete? This cannot be undone.")) return;
    await apiPermanentlyDeleteRecycleBinItem(type, id);
    load();
  };

  if (loading) return <AdminLayout><div>Loading...</div></AdminLayout>;
  if (error) return <AdminLayout><div>{error}</div></AdminLayout>;

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-4">Recycle Bin</h1>
      {Object.entries(data).map(([type, items]) => (
        <div key={type} className="mb-8">
          <h2 className="text-xl font-semibold mb-2">{typeMap[type]}s</h2>
          {items.length === 0 ? (
            <div className="text-gray-500">No deleted {typeMap[type].toLowerCase()}s.</div>
          ) : (
            <table className="min-w-full border text-sm">
              <thead>
                <tr>
                  <th className="border px-2 py-1">ID</th>
                  <th className="border px-2 py-1">Info</th>
                  <th className="border px-2 py-1">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="border px-2 py-1">{item.id}</td>
                    <td className="border px-2 py-1 text-left">
                      {type === "users" && `${item.username} (${item.email})`}
                      {type === "exams" && `${item.title} (${item.access_code})`}
                      {type === "questions" && `Exam ${item.exam_id} Q${item.question_number}: ${item.question_text?.slice(0, 40)}...`}
                      {type === "classrooms" && `${item.name}`}
                    </td>
                    <td className="border px-2 py-1">
                      <button className="text-blue-600 hover:underline mr-2" onClick={() => handleRestore(type, item.id)}>Restore</button>
                      <button className="text-red-600 hover:underline" onClick={() => handlePermanentDelete(type, item.id)}>Delete Permanently</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </AdminLayout>
  );
}
