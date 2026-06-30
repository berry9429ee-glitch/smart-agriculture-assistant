<template>
  <view class="page">
    <!-- 背景层 -->
    <view class="bg-layer">
      <view class="bg-circle circle-1"></view>
      <view class="bg-circle circle-2"></view>
      <view class="bg-circle circle-3"></view>
    </view>

    <!-- 安全区域占位 -->
    <view class="safe-area-top"></view>

    <!-- 主内容 -->
    <view class="content-area">
      <!-- Logo区域 -->
      <view class="brand-section">
        <view class="logo-wrapper glass-logo">
          <image class="logo" src="/static/app-icon-smart-agriculture-avatar.png" mode="aspectFill"></image>
        </view>
        <text class="app-name">智慧农业</text>
        <text class="app-slogan">让种植更智能</text>
      </view>

      <!-- 功能介绍 -->
      <view class="features glass-card">
        <view class="feature-item">
          <text class="feature-icon">🌱</text>
          <view class="feature-text">
            <text class="feature-title">智能监测</text>
            <text class="feature-desc">实时监控作物生长状态</text>
          </view>
        </view>
        <view class="feature-item">
          <text class="feature-icon">🤖</text>
          <view class="feature-text">
            <text class="feature-title">AI 分析</text>
            <text class="feature-desc">大模型专业种植建议</text>
          </view>
        </view>
        <view class="feature-item">
          <text class="feature-icon">📊</text>
          <view class="feature-text">
            <text class="feature-title">数据洞察</text>
            <text class="feature-desc">科学决策优化产量</text>
          </view>
        </view>
      </view>

      <!-- 登录按钮 -->
      <view class="login-section">
        <button
          class="btn-primary glass-btn-solid"
          :class="{ loading: isLoading }"
          :disabled="isLoading"
          @click="handleWechatLogin"
          hover-class="btn-hover"
        >
          <text class="btn-icon">💬</text>
          <text class="btn-label">{{ isLoading ? '登录中...' : '微信快捷登录' }}</text>
        </button>

        <button v-if="enableDemoLogin" class="btn-secondary glass-btn" @click="enterDemoMode" hover-class="btn-hover">
          <text class="btn-label">游客体验</text>
        </button>

        <button v-if="enablePhoneLogin" class="btn-secondary glass-btn" @click="goToPhoneLogin" hover-class="btn-hover">
          <text class="btn-label">手机号登录</text>
        </button>
      </view>

      <!-- 协议 -->
      <view class="agreement-section" @click="agreed = !agreed">
        <view class="check-circle" :class="{ checked: agreed }">
          <text class="check-icon" v-if="agreed">✓</text>
        </view>
        <text class="agreement-text">
          登录即表示同意
          <text class="link" @click.stop="showAgreement('user')">《用户协议》</text>
          和
          <text class="link" @click.stop="showAgreement('privacy')">《隐私政策》</text>
        </text>
      </view>
    </view>

    <!-- 底部装饰 -->
    <view class="bottom-decor">
      <text class="version">Version 1.0.0</text>
    </view>
  </view>
</template>

<script>
import config from '@/config/index.js';

export default {
  data() {
    return {
      agreed: false,
      isLoading: false
    };
  },
  computed: {
    enablePhoneLogin() {
      return config.ENABLE_PHONE_LOGIN === true;
    },
    enableDemoLogin() {
      return config.ENABLE_DEMO_LOGIN === true;
    }
  },
  methods: {
    async handleWechatLogin() {
      if (this.isLoading) return;
      if (!this.agreed) {
        uni.showToast({ title: '请先同意用户协议', icon: 'none' });
        return;
      }

      // #ifdef MP-WEIXIN
      this.isLoading = true;
      try {
        uni.showLoading({ title: '登录中...' });
        const { code } = await uni.login({ provider: 'weixin' });

        if (!code) throw new Error('获取登录凭证失败');

        const { result } = await uniCloud.callFunction({
          name: 'login',
          data: { code }
        });

        uni.hideLoading();

        if (result.success) {
          uni.removeStorageSync('demo_mode');
          uni.setStorageSync('token', result.token);
          uni.setStorageSync('userInfo', result.userInfo || {});
          uni.showToast({ title: '登录成功', icon: 'success' });
          setTimeout(() => uni.reLaunch({ url: '/pages/home/home' }), 500);
        } else {
          throw new Error(result.message || '登录失败');
        }
      } catch (err) {
        uni.hideLoading();
        uni.showToast({ title: err.message || '登录失败', icon: 'none' });
      } finally {
        this.isLoading = false;
      }
      // #endif

      // #ifndef MP-WEIXIN
      uni.showToast({ title: '请在微信中打开', icon: 'none' });
      // #endif
    },

    enterDemoMode() {
      if (!this.agreed) {
        uni.showToast({ title: '请先同意用户协议', icon: 'none' });
        return;
      }

      const demoUser = {
        id: 'demo_user',
        nickname: '演示用户',
        avatar: '/static/avatar-default.png',
        isDemo: true
      };

      uni.setStorageSync('demo_mode', true);
      uni.setStorageSync('token', 'demo_token');
      uni.setStorageSync('userInfo', demoUser);
      uni.showToast({ title: '已进入演示模式', icon: 'success' });
      setTimeout(() => uni.reLaunch({ url: '/pages/home/home' }), 500);
    },

    goToPhoneLogin() {
      if (!this.agreed) {
        uni.showToast({ title: '请先同意用户协议', icon: 'none' });
        return;
      }
      uni.navigateTo({ url: '/pages/login/phone-login' });
    },

    showAgreement(type) {
      const userAgreement = '本小程序用于智慧农业监测、设备数据查看、选苗建议和病虫害识别。用户应保证绑定设备信息、上传图片和填写资料真实合法，不得上传违法、侵权或与农业服务无关的内容。';
      const privacyPolicy = '本小程序会在你授权后收集微信登录标识、昵称、头像、手机号、设备绑定信息、传感器数据和用于病虫害识别的图片。相关数据仅用于登录识别、农业监测、AI 分析和服务改进，不会主动出售或公开给无关第三方。';
      uni.showModal({
        title: type === 'user' ? '用户协议' : '隐私政策',
        content: type === 'user' ? userAgreement : privacyPolicy,
        showCancel: false
      });
    }
  }
};
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  position: relative;
  overflow: hidden;
}

/* 背景装饰 */
.bg-layer {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 0;
}

.bg-circle {
  position: absolute;
  border-radius: 50%;
  filter: blur(80rpx);
}

.circle-1 {
  width: 500rpx;
  height: 500rpx;
  background: rgba(102, 126, 234, 0.3);
  top: -150rpx;
  right: -150rpx;
}

.circle-2 {
  width: 400rpx;
  height: 400rpx;
  background: rgba(118, 75, 162, 0.25);
  bottom: 300rpx;
  left: -120rpx;
}

.circle-3 {
  width: 300rpx;
  height: 300rpx;
  background: rgba(52, 199, 89, 0.2);
  bottom: -80rpx;
  right: 50rpx;
}

/* 安全区域 */
.safe-area-top {
  height: calc(env(safe-area-inset-top) + 20rpx);
}

/* 内容区 */
.content-area {
  padding: 40rpx;
  position: relative;
  z-index: 5;
}

/* Logo区域 */
.brand-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 60rpx;
  padding-top: 40rpx;
}

.glass-logo {
  width: 160rpx;
  height: 160rpx;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border-radius: 48rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.3);
}

.logo {
  width: 100rpx;
  height: 100rpx;
  border-radius: 24rpx;
}

.app-name {
  font-size: 48rpx;
  font-weight: 700;
  color: #fff;
  letter-spacing: 4rpx;
  margin-bottom: 8rpx;
}

.app-slogan {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 2rpx;
}

/* 玻璃卡片 */
.glass-card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(40rpx);
  -webkit-backdrop-filter: blur(40rpx);
  border-radius: 32rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.1);
  padding: 32rpx;
  margin-bottom: 48rpx;
}

/* 功能介绍 */
.features {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.feature-icon {
  font-size: 40rpx;
  width: 72rpx;
  height: 72rpx;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.feature-text {
  flex: 1;
}

.feature-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #fff;
  display: block;
  margin-bottom: 4rpx;
}

.feature-desc {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.5);
}

/* 登录按钮 */
.login-section {
  margin-bottom: 32rpx;
}

.glass-btn-solid {
  background: rgba(52, 199, 89, 0.9);
  backdrop-filter: blur(20rpx);
  border: none;
}

.glass-btn {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border: 1rpx solid rgba(255, 255, 255, 0.2);
}

.btn-primary {
  width: 100%;
  height: 100rpx;
  border-radius: 50rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 8rpx 32rpx rgba(52, 199, 89, 0.3);
}

.btn-primary::after {
  border: none;
}

.btn-secondary {
  width: 100%;
  height: 100rpx;
  border-radius: 50rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-secondary::after {
  border: none;
}

.btn-icon {
  font-size: 40rpx;
}

.btn-label {
  font-size: 32rpx;
  font-weight: 500;
  color: #fff;
}

.btn-hover {
  opacity: 0.85;
  transform: scale(0.98);
}

/* 协议 */
.agreement-section {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 0 20rpx;
}

.check-circle {
  width: 36rpx;
  height: 36rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12rpx;
  margin-top: 2rpx;
  transition: all 0.3s;
}

.check-circle.checked {
  background: rgba(52, 199, 89, 0.9);
  border-color: rgba(52, 199, 89, 0.9);
}

.check-icon {
  font-size: 22rpx;
  color: #fff;
}

.agreement-text {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.6;
}

.link {
  color: rgba(102, 126, 234, 0.9);
}

/* 底部装饰 */
.bottom-decor {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 40rpx;
  padding-bottom: calc(40rpx + env(safe-area-inset-bottom));
  display: flex;
  justify-content: center;
}

.version {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.2);
}
</style>
