import React from "react";

/**
 * PUBLIC_INTERFACE
 * TaskItem renders a single task row with actions (complete, edit, delete).
 */
export default function TaskItem({ task, onEdit, onDelete, onToggleComplete }) {
  const badgeText = task.completed ? "Completed" : "Open";

  return (
    <article className="taskItem" role="listitem" aria-label={`Task: ${task.title}`}>
      <div className="taskMain">
        <div className="taskTopRow">
          <h3
            className={`taskTitle ${task.completed ? "taskTitleCompleted" : ""}`}
          >
            {task.title}
          </h3>
          <span
            className={`badge ${task.completed ? "badge-complete" : ""}`}
            aria-label={`Status: ${badgeText}`}
          >
            {badgeText}
          </span>
        </div>

        {task.description ? (
          <p className="taskDesc">{task.description}</p>
        ) : (
          <p className="taskDesc" style={{ opacity: 0.7 }}>
            No description.
          </p>
        )}
      </div>

      <div className="taskActions" aria-label={`Actions for ${task.title}`}>
        <button
          type="button"
          className={`btn btn-small ${task.completed ? "btn-ghost" : "btn-success"}`}
          onClick={onToggleComplete}
          aria-label={task.completed ? "Mark task as incomplete" : "Mark task as complete"}
        >
          {task.completed ? "Undo" : "Complete"}
        </button>
        <button
          type="button"
          className="btn btn-small btn-ghost"
          onClick={onEdit}
          aria-label="Edit task"
        >
          Edit
        </button>
        <button
          type="button"
          className="btn btn-small btn-danger"
          onClick={onDelete}
          aria-label="Delete task"
        >
          Delete
        </button>
      </div>
    </article>
  );
}
