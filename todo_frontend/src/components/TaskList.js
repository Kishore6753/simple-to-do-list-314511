import React from "react";
import TaskItem from "./TaskItem";

/**
 * PUBLIC_INTERFACE
 * TaskList renders a scrollable list of tasks.
 *
 * Accessibility contract:
 * - Always renders an outer landmark (role="region", aria-label="Task list") so
 *   tests/users have a stable container to query.
 * - When tasks exist, renders exactly one child with role="list" and the SAME
 *   accessible name ("Task list") containing role="listitem" children.
 * - When loading/empty, renders non-list content inside the region.
 */
export default function TaskList({
  tasks,
  onEdit,
  onDelete,
  onToggleComplete,
  loading,
}) {
  const hasTasks = Array.isArray(tasks) && tasks.length > 0;

  return (
    <div className="taskList" role="region" aria-label="Task list">
      {loading ? (
        <div className="empty">Loading tasks…</div>
      ) : !hasTasks ? (
        <div className="empty">No tasks yet. Add one above to get started.</div>
      ) : (
        <div role="list" aria-label="Task list">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onEdit={() => onEdit(task)}
              onDelete={() => onDelete(task)}
              onToggleComplete={() => onToggleComplete(task)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
