/**
 * Service-layer unit tests: online + auto modes.
 *
 * Important: tasks.js captures ENV_BASE_URL at module init. These tests must set
 * process.env before importing the module.
 */
describe("tasks service - online/auto", () => {
  const KEY = "todo_frontend.tasks.v1";

  function setEnvBase(url) {
    process.env.REACT_APP_API_BASE = url;
    delete process.env.REACT_APP_BACKEND_URL;
  }

  function importFresh() {
    jest.resetModules();
    return require("../tasks");
  }

  function mockJsonResponse(body, { ok = true, status = 200, headers = {} } = {}) {
    return {
      ok,
      status,
      headers: {
        get: (name) => {
          const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
          return key ? headers[key] : "application/json";
        },
      },
      json: async () => body,
      text: async () => JSON.stringify(body),
    };
  }

  test("force online uses REST (list/create/update/delete) when base URL exists", async () => {
    setEnvBase("https://api.example.com/");
    const { setServiceOnlineOverride, listTasks, createTask, updateTask, deleteTask } = importFresh();

    setServiceOnlineOverride(true);

    fetch
      // reachability probe GET /tasks
      .mockResolvedValueOnce(mockJsonResponse([]))
      // listTasks GET /tasks
      .mockResolvedValueOnce(mockJsonResponse([{ id: 1, title: "A", description: "", completed: false, updatedAt: 5 }]))
      // createTask POST /tasks
      .mockResolvedValueOnce(mockJsonResponse({ id: 2, title: "B", description: "", completed: false, updatedAt: 6 }))
      // updateTask PATCH /tasks/2
      .mockResolvedValueOnce(mockJsonResponse({ id: 2, title: "B", description: "", completed: true, updatedAt: 7 }))
      // deleteTask DELETE /tasks/2 (204)
      .mockResolvedValueOnce({ ok: true, status: 204, headers: { get: () => "" }, text: async () => "" });

    const listed = await listTasks();
    expect(listed).toHaveLength(1);
    expect(listed[0]).toEqual(expect.objectContaining({ id: "1", title: "A" }));
    expect(fetch).toHaveBeenCalledWith("https://api.example.com/tasks", expect.objectContaining({ method: "GET" }));

    const created = await createTask({ title: "B", description: "", completed: false });
    expect(created).toEqual(expect.objectContaining({ id: "2", title: "B" }));
    expect(fetch).toHaveBeenCalledWith("https://api.example.com/tasks", expect.objectContaining({ method: "POST" }));

    const updated = await updateTask("2", { completed: true });
    expect(updated.completed).toBe(true);
    expect(fetch).toHaveBeenCalledWith("https://api.example.com/tasks/2", expect.objectContaining({ method: "PATCH" }));

    await deleteTask("2");
    expect(fetch).toHaveBeenCalledWith("https://api.example.com/tasks/2", expect.objectContaining({ method: "DELETE" }));
  });

  test("auto mode falls back to localStorage when backend probe fails", async () => {
    setEnvBase("https://api.example.com");
    const { setServiceOnlineOverride, listTasks } = importFresh();

    setServiceOnlineOverride(null); // auto

    // Seed local data
    localStorage.setItem(KEY, JSON.stringify([{ id: "l1", title: "Local", description: "", completed: false, updatedAt: 10 }]));

    // reachability probe fails (e.g., network error)
    fetch.mockRejectedValueOnce(new Error("Network down"));

    const tasks = await listTasks();

    // Should return local tasks and not throw
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toEqual(expect.objectContaining({ id: "l1", title: "Local" }));
  });

  test("auto mode uses REST when probe succeeds", async () => {
    setEnvBase("https://api.example.com");
    const { setServiceOnlineOverride, listTasks } = importFresh();

    setServiceOnlineOverride(null); // auto

    fetch
      // probe
      .mockResolvedValueOnce(mockJsonResponse([]))
      // list
      .mockResolvedValueOnce(mockJsonResponse([{ id: "r1", title: "Remote", description: "", completed: false, updatedAt: 1 }]));

    const tasks = await listTasks();
    expect(tasks[0]).toEqual(expect.objectContaining({ id: "r1", title: "Remote" }));

    // two GETs: probe + listTasks
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  test("reachability probe aborts after timeout (simulated) and falls back to local", async () => {
    jest.useFakeTimers();

    setEnvBase("https://api.example.com");
    const { setServiceOnlineOverride, listTasks } = importFresh();
    setServiceOnlineOverride(null);

    localStorage.setItem(KEY, JSON.stringify([{ id: "l1", title: "Local", description: "", completed: false, updatedAt: 10 }]));

    // Simulate a fetch that only rejects when aborted.
    fetch.mockImplementationOnce((url, options) => {
      return new Promise((resolve, reject) => {
        const signal = options?.signal;
        if (signal) {
          signal.addEventListener("abort", () => reject(new Error("Aborted")));
        }
      });
    });

    const promise = listTasks();
    // advance time to trigger abort in checkBackendReachable (1200ms)
    jest.advanceTimersByTime(1300);

    const tasks = await promise;
    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toBe("l1");

    jest.useRealTimers();
  });

  test("when forced offline, it does not call fetch even if env base is set", async () => {
    setEnvBase("https://api.example.com");
    const { setServiceOnlineOverride, listTasks } = importFresh();
    setServiceOnlineOverride(false);

    localStorage.setItem(KEY, JSON.stringify([{ id: "l1", title: "Local only", description: "", completed: false, updatedAt: 10 }]));
    const tasks = await listTasks();

    expect(tasks[0].title).toBe("Local only");
    expect(fetch).not.toHaveBeenCalled();
  });
});
