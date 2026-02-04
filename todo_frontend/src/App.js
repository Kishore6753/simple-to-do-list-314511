import React, { useEffect, useMemo, useState } from "react";
import "./App.css";
import Header from "./components/Header";
import TaskForm from "./components/TaskForm";
import TaskList from "./components/TaskList";
import {
  createTask,
  deleteTask,
  listTasks,
  setServiceOnlineOverride,
  updateTask,
} from "./services/tasks";

/**
 * PUBLIC_INTERFACE
 * App is the main entrypoint for the Todo frontend.
 * It renders a header, task input form, and a scrollable task list.
 * It manages tasks state and delegates persistence/networking to the tasks service layer.
 */
function App() {
  const [tasks, setTasks] = useState([]);
  const [editingTask, setEditingTask] = useState(null);

  const [status, setStatus] = useState({
    loading: true,
    saving: false,
    error: "",
    info: "",
  });

  const completedCount = useMemo(
    () => tasks.filter((t) => t.completed).length,
    [tasks]
  );

  const refresh = async () => {
    setStatus((s) => ({ ...s, loading: true, error: "" }));
    try {
      const data = await listTasks();
      setTasks(data);
    } catch (e) {
      setStatus((s) => ({
        ...s,
        error: e?.message || "Failed to load tasks.",
      }));
    } finally {
      setStatus((s) => ({ ...s, loading: false }));
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  // PUBLIC_INTERFACE
  const handleCreateOrSave = async ({ title, description }) => {
    setStatus((s) => ({ ...s, saving: true, error: "", info: "" }));
    try {
      if (editingTask) {
        const updated = await updateTask(editingTask.id, {
          title,
          description,
        });
        setTasks((prev) =>
          prev.map((t) => (t.id === updated.id ? updated : t))
        );
        setEditingTask(null);
        setStatus((s) => ({ ...s, info: "Task updated." }));
      } else {
        const created = await createTask({ title, description, completed: false });
        setTasks((prev) => [created, ...prev]);
        setStatus((s) => ({ ...s, info: "Task added." }));
      }
    } catch (e) {
      setStatus((s) => ({
        ...s,
        error: e?.message || "Failed to save task.",
      }));
    } finally {
      setStatus((s) => ({ ...s, saving: false }));
    }
  };

  // PUBLIC_INTERFACE
  const handleEdit = (task) => {
    setEditingTask(task);
    setStatus((s) => ({ ...s, error: "", info: "" }));
  };

  // PUBLIC_INTERFACE
  const handleCancelEdit = () => {
    setEditingTask(null);
  };

  // PUBLIC_INTERFACE
  const handleDelete = async (task) => {
    setStatus((s) => ({ ...s, saving: true, error: "", info: "" }));
    try {
      await deleteTask(task.id);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      if (editingTask?.id === task.id) setEditingTask(null);
      setStatus((s) => ({ ...s, info: "Task deleted." }));
    } catch (e) {
      setStatus((s) => ({
        ...s,
        error: e?.message || "Failed to delete task.",
      }));
    } finally {
      setStatus((s) => ({ ...s, saving: false }));
    }
  };

  // PUBLIC_INTERFACE
  const handleToggleComplete = async (task) => {
    // Optimistic update
    const nextCompleted = !task.completed;
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, completed: nextCompleted } : t))
    );

    try {
      const updated = await updateTask(task.id, { completed: nextCompleted });
      setTasks((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t))
      );
    } catch (e) {
      // Rollback if service fails
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, completed: task.completed } : t))
      );
      setStatus((s) => ({
        ...s,
        error: e?.message || "Failed to update completion status.",
      }));
    }
  };

  // PUBLIC_INTERFACE
  const handleDismissMessage = () => {
    setStatus((s) => ({ ...s, error: "", info: "" }));
  };

  // PUBLIC_INTERFACE
  const handleForceOffline = () => {
    // For local debugging; can be removed later if undesired.
    setServiceOnlineOverride(false);
    setStatus((s) => ({
      ...s,
      info: "Offline mode enabled (local storage).",
      error: "",
    }));
  };

  // PUBLIC_INTERFACE
  const handleForceOnlineAuto = async () => {
    setServiceOnlineOverride(null);
    setStatus((s) => ({
      ...s,
      info: "Auto mode enabled (tries backend if reachable).",
      error: "",
    }));
    await refresh();
  };

  return (
    <div className="App">
      <div className="page">
        <Header
          totalCount={tasks.length}
          completedCount={completedCount}
          onForceOffline={handleForceOffline}
          onForceOnlineAuto={handleForceOnlineAuto}
        />

        <main className="main" aria-busy={status.loading ? "true" : "false"}>
          {(status.error || status.info) && (
            <div
              className={`notice ${status.error ? "notice-error" : "notice-info"}`}
              role={status.error ? "alert" : "status"}
              aria-live="polite"
            >
              <div className="notice-text">
                <strong className="notice-title">
                  {status.error ? "Error" : "Info"}
                </strong>
                <div>{status.error || status.info}</div>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleDismissMessage}
                aria-label="Dismiss message"
              >
                Dismiss
              </button>
            </div>
          )}

          <section className="card" aria-label="Task editor">
            <TaskForm
              mode={editingTask ? "edit" : "create"}
              initialTitle={editingTask?.title || ""}
              initialDescription={editingTask?.description || ""}
              loading={status.saving}
              onSubmit={handleCreateOrSave}
              onCancel={editingTask ? handleCancelEdit : undefined}
            />
          </section>

          <section className="card listCard">
            <div className="listHeader">
              <h2 className="sectionTitle">Your tasks</h2>
              <div className="listMeta">
                {status.loading ? (
                  <span className="pill" aria-label="Loading tasks">
                    Loading…
                  </span>
                ) : (
                  <span className="pill" aria-label={`${tasks.length} total tasks`}>
                    {tasks.length} total
                  </span>
                )}
                <span
                  className="pill pill-success"
                  aria-label={`${completedCount} completed tasks`}
                >
                  {completedCount} completed
                </span>
              </div>
            </div>

            <TaskList
              tasks={tasks}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleComplete={handleToggleComplete}
              loading={status.loading}
            />
          </section>
        </main>

        <footer className="footer">
          <span className="footerText">
            Tip: Use Tab/Shift+Tab to navigate. Press Enter on the “Complete” button
            to toggle a task.
          </span>
        </footer>
      </div>
    </div>
  );
}

export default App;
