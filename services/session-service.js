import config from '../config/index.js';
import { STORAGE_KEYS, readStorage, removeStorage, writeStorage } from '../core/storage.js';

const DEMO_USER = Object.freeze({
  id: 'demo_user',
  nickname: '演示用户',
  avatar: '/static/avatar-default.png',
  isDemo: true
});

export function isDemoMode() {
  return config.USE_MOCK === true || readStorage(STORAGE_KEYS.demoMode, false) === true;
}

export function isAuthenticated() {
  return Boolean(readStorage(STORAGE_KEYS.token, ''));
}

export function getToken() {
  return readStorage(STORAGE_KEYS.token, '');
}

export function getUserInfo() {
  return readStorage(STORAGE_KEYS.userInfo, null);
}

export function saveSession({ token, userInfo = {}, demo = false }) {
  if (!token) throw new Error('登录结果缺少 token');
  writeStorage(STORAGE_KEYS.token, token);
  writeStorage(STORAGE_KEYS.userInfo, userInfo);
  if (demo) writeStorage(STORAGE_KEYS.demoMode, true);
  else removeStorage(STORAGE_KEYS.demoMode);
  return userInfo;
}

export function startDemoSession() {
  saveSession({ token: 'demo_token', userInfo: { ...DEMO_USER }, demo: true });
  return { ...DEMO_USER };
}

export function updateUserInfo(userInfo = {}) {
  writeStorage(STORAGE_KEYS.userInfo, userInfo);
  return userInfo;
}

export function clearSession() {
  removeStorage(STORAGE_KEYS.token);
  removeStorage(STORAGE_KEYS.userInfo);
  removeStorage(STORAGE_KEYS.demoMode);
  removeStorage(STORAGE_KEYS.profileEditorSkipped);
}

export function isProfileEditorSkipped() {
  return readStorage(STORAGE_KEYS.profileEditorSkipped, false) === true;
}

export function setProfileEditorSkipped(skipped) {
  if (skipped) writeStorage(STORAGE_KEYS.profileEditorSkipped, true);
  else removeStorage(STORAGE_KEYS.profileEditorSkipped);
}

export default {
  isDemoMode,
  isAuthenticated,
  getToken,
  getUserInfo,
  saveSession,
  startDemoSession,
  updateUserInfo,
  clearSession,
  isProfileEditorSkipped,
  setProfileEditorSkipped
};
