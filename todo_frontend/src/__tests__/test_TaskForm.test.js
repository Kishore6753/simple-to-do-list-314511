import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TaskForm from "../components/TaskForm";

describe("TaskForm", () => {
  test("requires title (button disabled; blur shows validation message)", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();

    render(
      <TaskForm
        mode="create"
        initialTitle=""
        initialDescription=""
        loading={false}
        onSubmit={onSubmit}
      />
    );

    const addButton = screen.getByRole("button", { name: /add task/i });
    expect(addButton).toBeDisabled();

    const titleInput = screen.getByLabelText(/title/i);
    await user.click(titleInput);
    await user.tab(); // blur

    expect(await screen.findByText(/title is required/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("submit in create mode calls onSubmit and clears fields", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();

    render(
      <TaskForm
        mode="create"
        initialTitle=""
        initialDescription=""
        loading={false}
        onSubmit={onSubmit}
      />
    );

    await user.type(screen.getByLabelText(/title/i), "  Buy eggs  ");
    await user.type(screen.getByLabelText(/description/i), "  Free range  ");

    await user.click(screen.getByRole("button", { name: /add task/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      title: "Buy eggs",
      description: "Free range",
    });

    // In create mode, it clears after submit
    expect(screen.getByLabelText(/title/i)).toHaveValue("");
    expect(screen.getByLabelText(/description/i)).toHaveValue("");
  });

  test("submit in edit mode calls onSubmit but does not clear fields; shows cancel button", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    const onCancel = jest.fn();

    render(
      <TaskForm
        mode="edit"
        initialTitle="Existing"
        initialDescription="Existing desc"
        loading={false}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );

    expect(screen.getByRole("button", { name: /save task/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel editing/i })).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/title/i));
    await user.type(screen.getByLabelText(/title/i), "Updated");
    await user.click(screen.getByRole("button", { name: /save task/i }));

    expect(onSubmit).toHaveBeenCalledWith({ title: "Updated", description: "Existing desc" });

    // In edit mode, it should not clear the input fields automatically
    expect(screen.getByLabelText(/title/i)).toHaveValue("Updated");
  });

  test("cancel in edit mode calls onCancel", async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();

    render(
      <TaskForm
        mode="edit"
        initialTitle="Existing"
        initialDescription=""
        loading={false}
        onSubmit={jest.fn()}
        onCancel={onCancel}
      />
    );

    await user.click(screen.getByRole("button", { name: /cancel editing/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test("loading disables inputs and prevents submission", async () => {
    const onSubmit = jest.fn();
    render(
      <TaskForm
        mode="create"
        initialTitle="X"
        initialDescription=""
        loading={true}
        onSubmit={onSubmit}
      />
    );

    expect(screen.getByLabelText(/title/i)).toBeDisabled();
    expect(screen.getByLabelText(/description/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: /add task/i })).toBeDisabled();
  });
});
