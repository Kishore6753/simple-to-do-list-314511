/**
 * Service-layer unit tests: offline/localStorage behavior.
 *
 * Note: tasks.js computes ENV_BASE_URL at module init, so tests that depend on env
 * should use jest.resetModules + dynamic import. These tests focus on offline mode.
 */
describe("tasks service - offline/local", () => {
  function importFresh() {
    jest.resetModules();
    return require("../tasks");
  }

  test("listTasks reads from localStorage and sorts by updatedAt desc", async () => {
    const { setServiceOnlineOverride, listTasks } = importFresh();
    setServiceOnlineOverride(false);

    // Seed storage with unsorted tasks
    const key = "todo_frontend.tasks.v1";
    const seed = [
      { id: "1", title: "A", description: "", completed: false, updatedAt: 10, createdAt: 1 },
      { id: "2", title: "B", description: "", completed: true, updatedAt: 50, createdAt: 2 },
      { id: "3", title: "C", description: "", completed: false, updatedAt: 30, createdAt: 3 },
    ];
    localStorage.setItem(key, JSON.stringify(seed));

    const tasks = await listTasks();
    expect(tasks.map((t) => t.id)).toEqual(["2", "3", "1"]);
    expect(tasks[0]).toEqual(expect.objectContaining({ title: "B", completed: true }));
  });

  test("createTask persists to localStorage and returns normalized task", async () => {
    const { setServiceOnlineOverride, createTask, listTasks } = importFresh();
    setServiceOnlineOverride(false);

    const created = await createTask({
      title: "New task",
      description: "Desc",
      completed: false,
    });

    expect(created).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        title: "New task",
        description: "Desc",
        completed: false,
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
      })
    );

    const tasks = await listTasks();
    expect(tasks[0].title).toBe("New task");
  });

  test("updateTask updates the stored item and bumps updatedAt", async () => {
    const { setServiceOnlineOverride, createTask, updateTask } = importFresh();
    setServiceOnlineOverride(false);

    const created = await createTask({
      title: "To update",
      description: "",
      completed: false,
    });

    const beforeUpdatedAt = created.updatedAt;
    const updated = await updateTask(created.id, { completed: true, title: "Updated title" });

    expect(updated.completed).toBe(true);
    expect(updated.title).toBe("Updated title");
    expect(updated.updatedAt).toEqual(expect.any(Number));
    expect(updated.updatedAt).toBeGreaterThanOrEqual(beforeUpdatedAt);
  });

  test("updateTask throws if task not found in local storage", async () => {
    const { setServiceOnlineOverride, updateTask } = importFresh();
    setServiceOnlineOverride(false);

    await expect(updateTask("missing", { title: "X" })).rejects.toThrow(/task not found/i);
  });

  test("deleteTask removes from localStorage", async () => {
    const { setServiceOnlineOverride, createTask, deleteTask, listTasks } = importFresh();
    setServiceOnlineOverride(false);

    const created = await createTask({ title: "Delete me", description: "", completed: false });
    await deleteTask(created.id);

    const tasks = await listTasks();
    expect(tasks.find((t) => t.id === created.id)).toBeUndefined();
  });
});
