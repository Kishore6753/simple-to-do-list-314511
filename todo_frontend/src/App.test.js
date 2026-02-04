import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

// We mock the service layer so App tests focus on UI + state transitions.
jest.mock("./services/tasks", () => ({
  listTasks: jest.fn(),
  createTask: jest.fn(),
  updateTask: jest.fn(),
  deleteTask: jest.fn(),
  setServiceOnlineOverride: jest.fn(),
}));

const tasksService = require("./services/tasks");

function makeTask(overrides = {}) {
  return {
    id: overrides.id ?? "t1",
    title: overrides.title ?? "Write tests",
    description: overrides.description ?? "Ensure the app works",
    completed: overrides.completed ?? false,
    createdAt: overrides.createdAt ?? 1000,
    updatedAt: overrides.updatedAt ?? 2000,
  };
}

async function renderAppWithInitialTasks(initialTasks = []) {
  tasksService.listTasks.mockResolvedValueOnce(initialTasks);
  render(<App />);
  // Wait for the list area to render post-refresh (loading -> not loading).
  await screen.findByRole("heading", { name: /your tasks/i });
}

describe("App", () => {
  test("renders header, form, and list; shows empty state when no tasks", async () => {
    await renderAppWithInitialTasks([]);

    // Header
    expect(screen.getByRole("heading", { name: /to‑do list/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /auto mode/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /force offline mode/i })).toBeInTheDocument();

    // Form
    expect(screen.getByRole("region", { name: /task editor/i })).toBeInTheDocument();
    expect(screen.getByRole("form", { name: /task form/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add task/i })).toBeDisabled();

    // List + empty state
    const listRegion = screen.getByRole("region", { name: /task list/i });
    expect(
      within(listRegion).getByText(/no tasks yet\. add one above/i)
    ).toBeInTheDocument();

    // Accessibility: the list status pills exist
    expect(screen.getByLabelText(/0 total tasks/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/0 completed tasks/i)).toBeInTheDocument();
  });

  test("can add a task via the form", async () => {
    await renderAppWithInitialTasks([]);

    const user = userEvent.setup();
    const titleInput = screen.getByLabelText(/title/i);
    const descInput = screen.getByLabelText(/description/i);

    const created = makeTask({
      id: "new1",
      title: "Buy milk",
      description: "2% if possible",
      completed: false,
      createdAt: 10,
      updatedAt: 10,
    });
    tasksService.createTask.mockResolvedValueOnce(created);

    await user.type(titleInput, "Buy milk");
    await user.type(descInput, "2% if possible");

    const addButton = screen.getByRole("button", { name: /add task/i });
    expect(addButton).toBeEnabled();
    await user.click(addButton);

    // Ensure the service layer was called with correct payload
    expect(tasksService.createTask).toHaveBeenCalledTimes(1);
    expect(tasksService.createTask).toHaveBeenCalledWith({
      title: "Buy milk",
      description: "2% if possible",
      completed: false,
    });

    // Newly created task appears at top
    expect(await screen.findByRole("listitem", { name: /task: buy milk/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/1 total tasks/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/0 completed tasks/i)).toBeInTheDocument();
  });

  test("can edit a task (enter edit mode, save, and return to create mode)", async () => {
    const initial = makeTask({ id: "t1", title: "Old title", description: "Old desc" });
    await renderAppWithInitialTasks([initial]);

    const user = userEvent.setup();

    const taskRow = screen.getByRole("listitem", { name: /task: old title/i });
    await user.click(within(taskRow).getByRole("button", { name: /edit task/i }));

    // Form should be in edit mode with Save + Cancel
    expect(screen.getByRole("button", { name: /save task/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel editing/i })).toBeInTheDocument();

    const titleInput = screen.getByLabelText(/title/i);
    const descInput = screen.getByLabelText(/description/i);

    // Inputs prefilled
    expect(titleInput).toHaveValue("Old title");
    expect(descInput).toHaveValue("Old desc");

    const updated = makeTask({
      id: "t1",
      title: "New title",
      description: "New desc",
      updatedAt: 999,
    });
    tasksService.updateTask.mockResolvedValueOnce(updated);

    await user.clear(titleInput);
    await user.type(titleInput, "New title");
    await user.clear(descInput);
    await user.type(descInput, "New desc");

    await user.click(screen.getByRole("button", { name: /save task/i }));

    expect(tasksService.updateTask).toHaveBeenCalledTimes(1);
    expect(tasksService.updateTask).toHaveBeenCalledWith("t1", {
      title: "New title",
      description: "New desc",
    });

    // Updated task is visible; edit mode is exited (back to Add task button)
    expect(await screen.findByRole("listitem", { name: /task: new title/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add task/i })).toBeInTheDocument();

    // Info banner appears
    expect(screen.getByRole("status")).toHaveTextContent(/task updated/i);
  });

  test("can cancel editing (resets to create mode, does not call update)", async () => {
    const initial = makeTask({ id: "t1", title: "Task A", description: "Desc A" });
    await renderAppWithInitialTasks([initial]);

    const user = userEvent.setup();
    const taskRow = screen.getByRole("listitem", { name: /task: task a/i });
    await user.click(within(taskRow).getByRole("button", { name: /edit task/i }));

    await user.click(screen.getByRole("button", { name: /cancel editing/i }));

    expect(tasksService.updateTask).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /add task/i })).toBeInTheDocument();

    // Form should no longer be pre-filled (create mode resets to empty initial values)
    expect(screen.getByLabelText(/title/i)).toHaveValue("");
    expect(screen.getByLabelText(/description/i)).toHaveValue("");
  });

  test("can delete a task and shows info message", async () => {
    const initial = makeTask({ id: "t1", title: "Delete me" });
    await renderAppWithInitialTasks([initial]);

    const user = userEvent.setup();
    tasksService.deleteTask.mockResolvedValueOnce();

    const taskRow = screen.getByRole("listitem", { name: /task: delete me/i });
    await user.click(within(taskRow).getByRole("button", { name: /delete task/i }));

    expect(tasksService.deleteTask).toHaveBeenCalledTimes(1);
    expect(tasksService.deleteTask).toHaveBeenCalledWith("t1");

    // Removed from UI
    expect(screen.queryByRole("listitem", { name: /task: delete me/i })).not.toBeInTheDocument();

    // Info banner
    expect(screen.getByRole("status")).toHaveTextContent(/task deleted/i);
  });

  test("can toggle completion (optimistic) and updates completed count", async () => {
    const initial = makeTask({ id: "t1", title: "Toggle", completed: false });
    await renderAppWithInitialTasks([initial]);

    const user = userEvent.setup();

    // Service resolves with updated completion
    const updated = makeTask({ id: "t1", title: "Toggle", completed: true, updatedAt: 777 });
    tasksService.updateTask.mockResolvedValueOnce(updated);

    const taskRow = screen.getByRole("listitem", { name: /task: toggle/i });

    // Before
    expect(within(taskRow).getByLabelText(/status: open/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/0 completed tasks/i)).toBeInTheDocument();

    // Click complete
    await user.click(within(taskRow).getByRole("button", { name: /mark task as complete/i }));

    // Optimistic UI: completed count should become 1 quickly
    expect(await screen.findByLabelText(/1 completed tasks/i)).toBeInTheDocument();

    // And service called correctly
    expect(tasksService.updateTask).toHaveBeenCalledWith("t1", { completed: true });

    // Final UI state should be completed
    expect(await screen.findByLabelText(/status: completed/i)).toBeInTheDocument();
  });

  test("mode buttons call service override appropriately and refresh on Auto", async () => {
    tasksService.listTasks.mockResolvedValueOnce([]); // initial refresh
    render(<App />);
    await screen.findByRole("heading", { name: /your tasks/i });

    const user = userEvent.setup();

    // Offline: just sets override + shows status message (no refresh called directly)
    await user.click(screen.getByRole("button", { name: /force offline mode/i }));
    expect(tasksService.setServiceOnlineOverride).toHaveBeenCalledWith(false);
    expect(screen.getByRole("status")).toHaveTextContent(/offline mode enabled/i);

    // Auto: sets override null and refreshes (listTasks called again)
    tasksService.listTasks.mockResolvedValueOnce([]); // refresh triggered by Auto
    await user.click(screen.getByRole("button", { name: /use auto mode/i }));
    expect(tasksService.setServiceOnlineOverride).toHaveBeenCalledWith(null);
    expect(await screen.findByRole("status")).toHaveTextContent(/auto mode enabled/i);

    expect(tasksService.listTasks).toHaveBeenCalledTimes(2);
  });
});
