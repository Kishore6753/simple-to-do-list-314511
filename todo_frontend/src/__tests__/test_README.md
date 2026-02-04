# Frontend test suite

This folder contains React Testing Library tests for UI components and Jest unit tests for the service layer.

## Run tests (CI / non-interactive)

```bash
npm test -- --watchAll=false
```

## What is covered

- **App** integration behavior (mocked service layer):
  - initial render + empty state
  - add/edit/cancel edit/delete/toggle complete
  - Auto/Offline mode buttons call `setServiceOnlineOverride`
- **Component unit tests**:
  - `TaskForm` validation + submit behavior
  - `TaskList` loading/empty/list states + handler wiring
  - `TaskItem` action callbacks + a11y labels
- **Service layer** (`src/services/tasks.js`) unit tests:
  - offline/localStorage CRUD + sorting
  - online/auto behavior with reachability probe + fallback

All tests use role/name queries wherever possible to encourage accessible UI.
