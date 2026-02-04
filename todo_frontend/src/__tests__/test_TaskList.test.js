import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TaskList from "../components/TaskList";

function makeTask(overrides = {}) {
  return {
    id: overrides.id ?? "t1",
    title: overrides.title ?? "Task",
    description: overrides.description ?? "",
    completed: overrides.completed ?? false,
    createdAt: overrides.createdAt ?? 1,
    updatedAt: overrides.updatedAt ?? 2,
  };
}

describe("TaskList", () => {
  test("shows loading state", () => {
    render(
      <TaskList
        tasks={[]}
        loading={true}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        onToggleComplete={jest.fn()}
      />
    );

    const region = screen.getByRole("region", { name: /task list/i });
    expect(within(region).getByText(/loading tasks/i)).toBeInTheDocument();
  });

  test("shows empty state when no tasks", () => {
    render(
      <TaskList
        tasks={[]}
        loading={false}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        onToggleComplete={jest.fn()}
      />
    );

    const region = screen.getByRole("region", { name: /task list/i });
    expect(within(region).getByText(/no tasks yet/i)).toBeInTheDocument();
  });

  test("renders tasks as listitems and wires action handlers", async () => {
    const user = userEvent.setup();
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    const onToggleComplete = jest.fn();

    const tasks = [
      makeTask({ id: "a", title: "First", description: "Desc 1", completed: false }),
      makeTask({ id: "b", title: "Second", description: "", completed: true }),
    ];

    render(
      <TaskList
        tasks={tasks}
        loading={false}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleComplete={onToggleComplete}
      />
    );

    const list = screen.getByRole("list", { name: /task list/i });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(2);

    const firstRow = screen.getByRole("listitem", { name: /task: first/i });
    await user.click(within(firstRow).getByRole("button", { name: /mark task as complete/i }));
    await user.click(within(firstRow).getByRole("button", { name: /edit task/i }));
    await user.click(within(firstRow).getByRole("button", { name: /delete task/i }));

    expect(onToggleComplete).toHaveBeenCalledWith(tasks[0]);
    expect(onEdit).toHaveBeenCalledWith(tasks[0]);
    expect(onDelete).toHaveBeenCalledWith(tasks[0]);
  });
});
