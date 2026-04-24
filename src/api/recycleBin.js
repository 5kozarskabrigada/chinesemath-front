// API helpers for recycle bin endpoints

const BASE_URL = "http://178.104.203.221:4000";

export async function apiGetRecycleBin() {
  const res = await fetch(`${BASE_URL}/api/admin/recycle-bin`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch recycle bin");
  return res.json();
}

export async function apiRestoreRecycleBinItem(type, id) {
  const res = await fetch(`${BASE_URL}/api/admin/recycle-bin/${type}/${id}/restore`, { method: "POST", credentials: "include" });
  if (!res.ok) throw new Error("Failed to restore");
  return res.json();
}

export async function apiPermanentlyDeleteRecycleBinItem(type, id) {
  const res = await fetch(`${BASE_URL}/api/admin/recycle-bin/${type}/${id}`, { method: "DELETE", credentials: "include" });
  if (!res.ok) throw new Error("Failed to permanently delete");
  return res.json();
}
