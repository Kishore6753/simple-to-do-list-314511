import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TaskItem from "../components/TaskItem";

function makeTask(overrides = {}) {
  return {
    id: overrides.id ?? "t1",
    title: overrides.title ?? "Task 1",
    description: overrides.description ?? "",
    completed: overrides.completed ?? false,
    createdAt: overrides.createdAt ?? 1,
    updatedAt: overrides.updatedAt ?? 2,
  };
}

describe("TaskItem", () => {
  test("renders title, status, and default description when missing", () => {
    const task = makeTask({ title: "Hello", description: "", completed: false });
    render(
      <TaskItem task={task} onEdit={jest.fn()} onDelete={jest.fn()} onToggleComplete={jest.fn()} />
    );

    const row = screen.getByRole("listitem", { name: /task: hello/i });
    expect(within(row).getByText("Hello")).toBeInTheDocument();
    expect(within(row).getByLabelText(/status: open/i)).toBeInTheDocument();
    expect(within(row).getByText(/no description/i)).toBeInTheDocument();
  });

  test("toggle completion button invokes callback", async () => {
    const user = userEvent.setup();
    const onToggleComplete = jest.fn();
    const task = makeTask({ completed: false });

    render(
      <TaskItem task={task} onEdit={jest.fn()} onDelete={jest.fn()} onToggleComplete={onToggleComplete} />
    );

    const row = screen.getByRole("listitem", { name: /task: task 1/i });
    await user.click(within(row).getByRole("button", { name: /mark task as complete/i }));
    expect(onToggleComplete).toHaveBeenCalledTimes(1);
  });

  test("edit invokes callback", async () => {
    const user = userEvent.setup();
    const onEdit = jest.fn();
    const task = makeTask({ title: "Editable" });

    render(<TaskItem task={task} onEdit={onEdit} onDelete={jest.fn()} onToggleComplete={jest.fn()} />);

    const row = screen.getByRole("listitem", { name: /task: editable/i });
    await user.click(within(row).getByRole("button", { name: /edit task/i }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  test("delete invokes callback", async () => {
    const user = userEvent.setup();
    const onDelete = jest.fn();
    const task = makeTask({ title: "Deletable" });

    render(<TaskItem task={task} onEdit={jest.fn()} onDelete={onDelete} onToggleComplete={jest.fn()} />);

    const row = screen.getByRole("listitem", { name: /task: deletable/i });
    await user.click(within(row).getByRole("button", { name: /delete task/i }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  test("shows completed status and 'Undo' button label when completed", () => {
    const task = makeTask({ completed: true, title: "Done" });
    render(
      <TaskItem task={task} onEdit={jest.fn()} onDelete={jest.fn()} onToggleComplete={jest.fn()} />
    );

    const row = screen.getByRole("listitem", { name: /task: done/i });
    expect(within(row).getByLabelText(/status: completed/i)).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: /mark task as incomplete/i })).toBeInTheDocument();
    expect(within(row).getByText(/undo/i)).toBeInTheDocument();
  });
});
