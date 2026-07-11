import test from 'node:test';
import assert from 'node:assert/strict';

import sessionService from '../services/session-service.js';

function installStorageRuntime() {
  const values = new Map();
  globalThis.uni = {
    getStorageSync: (key) => values.has(key) ? values.get(key) : '',
    setStorageSync: (key, value) => values.set(key, value),
    removeStorageSync: (key) => values.delete(key)
  };
  return values;
}

test('stores and clears a real user session through one boundary', () => {
  const values = installStorageRuntime();
  sessionService.saveSession({ token: 'token-value', userInfo: { id: 'user-1' } });

  assert.equal(sessionService.isAuthenticated(), true);
  assert.deepEqual(sessionService.getUserInfo(), { id: 'user-1' });
  assert.equal(values.has('demo_mode'), false);

  sessionService.clearSession();
  assert.equal(sessionService.isAuthenticated(), false);
  delete globalThis.uni;
});

test('creates a complete demo session without external services', () => {
  installStorageRuntime();
  const user = sessionService.startDemoSession();

  assert.equal(sessionService.isDemoMode(), true);
  assert.equal(sessionService.getToken(), 'demo_token');
  assert.equal(user.isDemo, true);
  delete globalThis.uni;
});
