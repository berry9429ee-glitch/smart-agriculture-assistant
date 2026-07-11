import { STORAGE_KEYS, readStorage, writeStorage } from '../core/storage.js';

export function getNavigationMetrics() {
  const fallback = { statusBarHeight: 20, navBarHeight: 44, totalNavHeight: 64 };
  try {
    const systemInfo = uni.getSystemInfoSync();
    const statusBarHeight = Number(systemInfo.statusBarHeight) || fallback.statusBarHeight;
    let navBarHeight = fallback.navBarHeight;

    if (typeof uni.getMenuButtonBoundingClientRect === 'function') {
      try {
        const menuButton = uni.getMenuButtonBoundingClientRect();
        if (menuButton?.height && Number.isFinite(menuButton.top)) {
          navBarHeight = (menuButton.top - statusBarHeight) * 2 + menuButton.height;
        }
      } catch (error) {
        navBarHeight = fallback.navBarHeight;
      }
    }

    return {
      statusBarHeight,
      navBarHeight,
      totalNavHeight: statusBarHeight + navBarHeight
    };
  } catch (error) {
    return fallback;
  }
}

export function initializeNavigationMetrics() {
  const metrics = getNavigationMetrics();
  writeStorage(STORAGE_KEYS.statusBarHeight, metrics.statusBarHeight);
  writeStorage(STORAGE_KEYS.navigationHeight, metrics.totalNavHeight);
  return metrics;
}

export function getNavigationHeight(fallback = 88) {
  const cached = Number(readStorage(STORAGE_KEYS.navigationHeight, 0));
  if (cached > 0) return cached;
  return getNavigationMetrics().totalNavHeight || fallback;
}
