import React from "react";

/**
 * PUBLIC_INTERFACE
 * Header renders the app title/subtitle and small actions (offline/auto mode).
 */
export default function Header({
  totalCount,
  completedCount,
  onForceOffline,
  onForceOnlineAuto,
}) {
  return (
    <header className="header">
      <div className="brand">
        <h1 className="title">To‑Do List</h1>
        <p className="subtitle">
          Add, edit, and complete tasks. Your tasks persist in your browser.
          {typeof totalCount === "number" ? (
            <>
              {" "}
              <span aria-label="Task summary">
                ({completedCount}/{totalCount} completed)
              </span>
            </>
          ) : null}
        </p>
      </div>

      <div className="headerActions" aria-label="App actions">
        <button
          type="button"
          className="btn btn-small btn-ghost"
          onClick={onForceOnlineAuto}
          aria-label="Use auto mode (try backend if reachable)"
        >
          Auto
        </button>
        <button
          type="button"
          className="btn btn-small btn-ghost"
          onClick={onForceOffline}
          aria-label="Force offline mode (local storage only)"
        >
          Offline
        </button>
      </div>
    </header>
  );
}
