export const STORAGE_KEYS = Object.freeze({
  token: 'token',
  userInfo: 'userInfo',
  demoMode: 'demo_mode',
  profileEditorSkipped: 'profile_editor_skipped',
  statusBarHeight: 'statusBarHeight',
  navigationHeight: 'totalNavHeight',
  pestHistory: 'pest_history'
});

function getStorageApi() {
  if (typeof uni === 'undefined') {
    throw new Error('当前环境不支持本地存储');
  }
  return uni;
}

export function readStorage(key, fallbackValue = null) {
  try {
    const value = getStorageApi().getStorageSync(key);
    return value === undefined || value === null || value === '' ? fallbackValue : value;
  } catch (error) {
    return fallbackValue;
  }
}

export function writeStorage(key, value) {
  getStorageApi().setStorageSync(key, value);
  return value;
}

export function removeStorage(key) {
  getStorageApi().removeStorageSync(key);
}
