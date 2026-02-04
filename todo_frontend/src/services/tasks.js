/**
 * Task service layer.
 *
 * Design:
 * - If REACT_APP_API_BASE or REACT_APP_BACKEND_URL is set and the backend is reachable,
 *   use REST calls.
 * - Otherwise, fall back to local in-memory store persisted to localStorage.
 *
 * This abstraction keeps UI independent of storage mechanism.
 */

const STORAGE_KEY = "todo_frontend.tasks.v1";

// Auto-detect base URL from env (CRA exposes process.env.REACT_APP_* at build time).
const ENV_BASE_URL =
  (process.env.REACT_APP_API_BASE || "").trim() ||
  (process.env.REACT_APP_BACKEND_URL || "").trim();

// Allow dev override: null = auto, true = force online, false = force offline
let onlineOverride = null;

// Cache reachability probe so we don't hammer the backend.
let reachability = {
  checkedAt: 0,
  ok: false,
  baseUrl: ENV_BASE_URL,
};

// Simple id generator for fallback mode
function makeId() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function safeParse(json, fallback) {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

function loadLocal() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const data = safeParse(raw || "[]", []);
  if (!Array.isArray(data)) return [];
  return data;
}

function saveLocal(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function normalizeTask(task) {
  return {
    id: String(task.id),
    title: String(task.title ?? ""),
    description: String(task.description ?? ""),
    completed: Boolean(task.completed),
    createdAt: typeof task.createdAt === "number" ? task.createdAt : Date.now(),
    updatedAt: typeof task.updatedAt === "number" ? task.updatedAt : Date.now(),
  };
}

// Backend API assumptions:
// - GET    /tasks
// - POST   /tasks
// - PATCH  /tasks/:id
// - DELETE /tasks/:id
//
// If a backend uses a different shape, adjust here only.
async function backendRequest(path, options = {}) {
  const base = (ENV_BASE_URL || "").replace(/\/+$/, "");
  const url = `${base}${path}`;
  const resp = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!resp.ok) {
    let detail = "";
    try {
      detail = await resp.text();
    } catch {
      detail = "";
    }
    throw new Error(
      `Backend request failed (${resp.status}). ${detail || "Please try again."}`
    );
  }

  // Some endpoints may return 204
  if (resp.status === 204) return null;

  const contentType = resp.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return resp.json();
  }
  return resp.text();
}

async function checkBackendReachable() {
  // Respect forced modes
  if (onlineOverride === false) return false;
  if (onlineOverride === true) return Boolean(ENV_BASE_URL);

  if (!ENV_BASE_URL) return false;

  // Cache for 30s
  const now = Date.now();
  if (reachability.baseUrl === ENV_BASE_URL && now - reachability.checkedAt < 30_000) {
    return reachability.ok;
  }

  reachability = { checkedAt: now, ok: false, baseUrl: ENV_BASE_URL };

  // Probe: try GET /tasks with a short timeout.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1200);

  try {
    await backendRequest("/tasks", { method: "GET", signal: controller.signal });
    reachability.ok = true;
    return true;
  } catch {
    reachability.ok = false;
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

// PUBLIC_INTERFACE
export function setServiceOnlineOverride(value) {
  /**
   * PUBLIC_INTERFACE
   * Force online/offline behavior:
   * - null: auto (default)
   * - true: force online (if base URL is set)
   * - false: force offline
   */
  onlineOverride = value;
}

// PUBLIC_INTERFACE
export async function listTasks() {
  /** PUBLIC_INTERFACE: Return tasks sorted by updatedAt desc. */
  const canUseBackend = await checkBackendReachable();
  if (canUseBackend) {
    const data = await backendRequest("/tasks", { method: "GET" });
    const items = Array.isArray(data) ? data : data?.tasks;
    if (!Array.isArray(items)) return [];
    return items.map(normalizeTask).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  const local = loadLocal();
  return local.map(normalizeTask).sort((a, b) => b.updatedAt - a.updatedAt);
}

// PUBLIC_INTERFACE
export async function createTask(taskInput) {
  /** PUBLIC_INTERFACE: Create a task and return it. */
  const canUseBackend = await checkBackendReachable();
  if (canUseBackend) {
    const created = await backendRequest("/tasks", {
      method: "POST",
      body: JSON.stringify(taskInput),
    });
    return normalizeTask(created);
  }

  const now = Date.now();
  const local = loadLocal();
  const created = normalizeTask({
    id: makeId(),
    title: taskInput.title,
    description: taskInput.description || "",
    completed: Boolean(taskInput.completed),
    createdAt: now,
    updatedAt: now,
  });
  const next = [created, ...local];
  saveLocal(next);
  return created;
}

// PUBLIC_INTERFACE
export async function updateTask(taskId, patch) {
  /** PUBLIC_INTERFACE: Update a task by id and return it. */
  const canUseBackend = await checkBackendReachable();
  if (canUseBackend) {
    const updated = await backendRequest(`/tasks/${encodeURIComponent(taskId)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    return normalizeTask(updated);
  }

  const local = loadLocal();
  const idx = local.findIndex((t) => String(t.id) === String(taskId));
  if (idx < 0) throw new Error("Task not found.");
  const updated = normalizeTask({
    ...local[idx],
    ...patch,
    id: local[idx].id,
    updatedAt: Date.now(),
  });
  const next = [...local.slice(0, idx), updated, ...local.slice(idx + 1)];
  saveLocal(next);
  return updated;
}

// PUBLIC_INTERFACE
export async function deleteTask(taskId) {
  /** PUBLIC_INTERFACE: Delete a task by id. */
  const canUseBackend = await checkBackendReachable();
  if (canUseBackend) {
    await backendRequest(`/tasks/${encodeURIComponent(taskId)}`, { method: "DELETE" });
    return;
  }

  const local = loadLocal();
  const next = local.filter((t) => String(t.id) !== String(taskId));
  saveLocal(next);
}
