import React from "react";
import TaskItem from "./TaskItem";

/**
 * PUBLIC_INTERFACE
 * TaskList renders a scrollable list of tasks.
 */
export default function TaskList({ tasks, onEdit, onDelete, onToggleComplete, loading }) {
  if (loading) {
    return (
      <div className="taskList" role="region" aria-label="Task list">
        <div className="empty">Loading tasks…</div>
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="taskList" role="region" aria-label="Task list">
        <div className="empty">
          No tasks yet. Add one above to get started.
        </div>
      </div>
    );
  }

  return (
    <div className="taskList" role="list" aria-label="Task list">
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
  );
}
