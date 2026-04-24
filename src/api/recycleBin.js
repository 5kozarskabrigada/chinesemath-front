// API helpers for recycle bin endpoints

export async function apiGetRecycleBin() {
  const res = await fetch("/api/admin/recycle-bin");
  if (!res.ok) throw new Error("Failed to fetch recycle bin");
  return res.json();
}

export async function apiRestoreRecycleBinItem(type, id) {
  const res = await fetch(`/api/admin/recycle-bin/${type}/${id}/restore`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to restore");
  return res.json();
}

export async function apiPermanentlyDeleteRecycleBinItem(type, id) {
  const res = await fetch(`/api/admin/recycle-bin/${type}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to permanently delete");
  return res.json();
}
