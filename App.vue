<script>
import sessionService from '@/services/session-service.js';
import { initializeNavigationMetrics } from '@/utils/navigation.js';

export default {
  globalData: {
    statusBarHeight: 20,
    navBarHeight: 44,
    totalNavHeight: 88
  },
  onLaunch() {
    this.initSystemInfo();
    this.checkLoginStatus();
  },
  onShow() {},
  onHide() {},
  methods: {
    initSystemInfo() {
      const metrics = initializeNavigationMetrics();
      this.globalData.statusBarHeight = metrics.statusBarHeight;
      this.globalData.navBarHeight = metrics.navBarHeight;
      this.globalData.totalNavHeight = metrics.totalNavHeight;
    },

    checkLoginStatus() {
      if (sessionService.isAuthenticated()) return;

      setTimeout(() => {
        const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
        const currentRoute = pages.length ? pages[pages.length - 1].route : '';

        if (currentRoute && currentRoute.startsWith('pages/login/')) {
          return;
        }

        uni.reLaunch({
          url: '/pages/login/login',
          fail: (err) => {
            console.warn('跳转登录页失败:', err);
          }
        });
      }, 500);
    }
  }
};
</script>

<style>
/* ============================================
   Apple Style Design System
   玻璃拟态 + 简约风格 + 微信小程序适配
   ============================================ */

/* 全局基础样式 */
page {
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  background: linear-gradient(180deg, #1C1C1E 0%, #2C2C2E 50%, #1C1C1E 100%);
  color: #FFFFFF;
  font-size: 28rpx;
  line-height: 1.5;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ============================================
   玻璃拟态效果 (Glassmorphism)
   ============================================ */

.glass-card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(40rpx) saturate(180%);
  -webkit-backdrop-filter: blur(40rpx) saturate(180%);
  border-radius: 32rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.3),
              inset 0 1rpx 0 rgba(255, 255, 255, 0.1);
}

.glass-card-light {
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(40rpx) saturate(180%);
  -webkit-backdrop-filter: blur(40rpx) saturate(180%);
  border-radius: 24rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.2);
}

.glass-card-accent {
  background: linear-gradient(135deg, rgba(52, 199, 89, 0.15) 0%, rgba(48, 209, 88, 0.08) 100%);
  backdrop-filter: blur(40rpx) saturate(180%);
  -webkit-backdrop-filter: blur(40rpx) saturate(180%);
  border-radius: 24rpx;
  border: 1rpx solid rgba(52, 199, 89, 0.2);
  box-shadow: 0 4rpx 16rpx rgba(52, 199, 89, 0.15);
}

.glass-btn {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border: 1rpx solid rgba(255, 255, 255, 0.15);
  border-radius: 20rpx;
  color: #FFFFFF;
  transition: all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
}

.glass-btn:active {
  transform: scale(0.97);
  background: rgba(255, 255, 255, 0.15);
}

.glass-btn-primary {
  background: linear-gradient(135deg, rgba(52, 199, 89, 0.9) 0%, rgba(48, 209, 88, 0.85) 100%);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border: none;
  border-radius: 20rpx;
  color: #FFFFFF;
  box-shadow: 0 8rpx 24rpx rgba(52, 199, 89, 0.3);
  transition: all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
}

.glass-btn-primary:active {
  transform: scale(0.97);
  box-shadow: 0 4rpx 12rpx rgba(52, 199, 89, 0.4);
}

/* ============================================
   苹果风格颜色系统
   ============================================ */
.text-primary { color: #34C759; }
.text-secondary { color: rgba(255, 255, 255, 0.6); }
.text-tertiary { color: rgba(255, 255, 255, 0.4); }
.text-white { color: #FFFFFF; }
.text-warning { color: #FF9F0A; }
.text-danger { color: #FF453A; }
.text-info { color: #64D2FF; }

.bg-primary { background: linear-gradient(135deg, #34C759 0%, #30D158 100%); }
.bg-warning { background: linear-gradient(135deg, #FF9F0A 0%, #FFB340 100%); }
.bg-danger { background: linear-gradient(135deg, #FF453A 0%, #FF6961 100%); }
.bg-info { background: linear-gradient(135deg, #0A84FF 0%, #409CFF 100%); }

/* ============================================
   底部安全区域
   ============================================ */
.safe-area-bottom {
  height: calc(env(safe-area-inset-bottom, 0px) + 20rpx);
  width: 100%;
}

.tab-bar-placeholder {
  height: calc(100rpx + env(safe-area-inset-bottom, 0px));
}

/* ============================================
   背景装饰
   ============================================ */
.bg-decoration {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.bg-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(100rpx);
  opacity: 0.5;
}

.bg-blob-1 {
  width: 400rpx;
  height: 400rpx;
  background: linear-gradient(135deg, rgba(52, 199, 89, 0.3) 0%, rgba(48, 209, 88, 0.1) 100%);
  top: -100rpx;
  right: -100rpx;
}

.bg-blob-2 {
  width: 350rpx;
  height: 350rpx;
  background: linear-gradient(135deg, rgba(10, 132, 255, 0.25) 0%, rgba(64, 156, 255, 0.1) 100%);
  bottom: 200rpx;
  left: -80rpx;
}

.bg-blob-3 {
  width: 300rpx;
  height: 300rpx;
  background: linear-gradient(135deg, rgba(255, 159, 10, 0.2) 0%, rgba(255, 179, 64, 0.1) 100%);
  bottom: -50rpx;
  right: 50rpx;
}

/* ============================================
   动画效果
   ============================================ */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.animate-pulse {
  animation: pulse 2s ease-in-out infinite;
}

/* 滚动条隐藏 */
::-webkit-scrollbar {
  width: 0;
  height: 0;
  background: transparent;
}
</style>
