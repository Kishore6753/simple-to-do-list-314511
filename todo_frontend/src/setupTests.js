/**
 * Jest/RTL test setup.
 *
 * - Adds jest-dom matchers.
 * - Installs stable localStorage + fetch mocks for deterministic tests.
 * - Provides small polyfills for jsdom (TextEncoder/TextDecoder) when missing.
 */
import "@testing-library/jest-dom";

// Polyfills (only if missing in the Jest runtime)
if (typeof global.TextEncoder === "undefined") {
  // eslint-disable-next-line global-require
  const { TextEncoder } = require("util");
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === "undefined") {
  // eslint-disable-next-line global-require
  const { TextDecoder } = require("util");
  global.TextDecoder = TextDecoder;
}

/**
 * A small, deterministic localStorage mock.
 * We install it on globalThis to match browser usage.
 */
function createLocalStorageMock() {
  let store = {};
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
    // helper for tests
    __getStore: () => store,
  };
}

beforeEach(() => {
  // Ensure each test starts with clean storage and no leaked fetch mocks.
  Object.defineProperty(globalThis, "localStorage", {
    value: createLocalStorageMock(),
    configurable: true,
    writable: true,
  });

  // Provide a default fetch mock. Individual tests can override implementation.
  globalThis.fetch = jest.fn(async () => {
    throw new Error("fetch() was called but not mocked for this test.");
  });
});

afterEach(() => {
  jest.clearAllMocks();
});
