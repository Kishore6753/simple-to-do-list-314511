import React, { useEffect, useId, useMemo, useState } from "react";

/**
 * PUBLIC_INTERFACE
 * TaskForm allows creating a new task or editing an existing task.
 * Props:
 * - mode: "create" | "edit"
 * - initialTitle, initialDescription
 * - loading: boolean
 * - onSubmit({title, description})
 * - onCancel(): optional, shown in edit mode
 */
export default function TaskForm({
  mode,
  initialTitle,
  initialDescription,
  loading,
  onSubmit,
  onCancel,
}) {
  const titleId = useId();
  const descId = useId();

  const [title, setTitle] = useState(initialTitle || "");
  const [description, setDescription] = useState(initialDescription || "");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setTitle(initialTitle || "");
    setDescription(initialDescription || "");
    setTouched(false);
  }, [initialTitle, initialDescription, mode]);

  const trimmedTitle = useMemo(() => title.trim(), [title]);
  const canSubmit = trimmedTitle.length > 0 && !loading;

  const titleError = touched && trimmedTitle.length === 0 ? "Title is required." : "";

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (!trimmedTitle) return;
    onSubmit({ title: trimmedTitle, description: description.trim() });
    if (mode === "create") {
      setTitle("");
      setDescription("");
      setTouched(false);
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit} aria-label="Task form">
      <div className="formRow">
        <div className="field">
          <label className="label" htmlFor={titleId}>
            Title
          </label>
          <input
            id={titleId}
            className="input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="e.g., Buy groceries"
            autoComplete="off"
            aria-invalid={titleError ? "true" : "false"}
            aria-describedby={titleError ? `${titleId}-error` : undefined}
            disabled={loading}
          />
          {titleError ? (
            <div className="helper" id={`${titleId}-error`}>
              {titleError}
            </div>
          ) : (
            <div className="helper">Keep it short and actionable.</div>
          )}
        </div>

        <div className="field">
          <label className="label" htmlFor={descId}>
            Description
          </label>
          <textarea
            id={descId}
            className="textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional details…"
            disabled={loading}
          />
          <div className="helper">Optional. Add a bit more context.</div>
        </div>
      </div>

      <div className="formActions">
        <div className="btnGroup">
          <button
            type="submit"
            className={`btn ${mode === "edit" ? "btn-success" : "btn-primary"}`}
            disabled={!canSubmit}
            aria-label={mode === "edit" ? "Save task" : "Add task"}
          >
            {loading ? "Saving…" : mode === "edit" ? "Save" : "Add task"}
          </button>

          {mode === "edit" && onCancel ? (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onCancel}
              disabled={loading}
              aria-label="Cancel editing"
            >
              Cancel
            </button>
          ) : null}
        </div>

        <div className="helper" aria-hidden="true">
          {mode === "edit" ? "Editing an existing task." : "Create a new task."}
        </div>
      </div>
    </form>
  );
}
