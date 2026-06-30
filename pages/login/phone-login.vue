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

    <!-- 导航栏 -->
    <view class="nav-bar glass-effect">
      <view class="nav-back" @click="goBack">
        <text class="nav-icon">‹</text>
      </view>
      <text class="nav-title">手机号登录</text>
      <view class="nav-placeholder"></view>
    </view>

    <!-- 主内容区 -->
    <view class="content-area">
      <!-- 欢迎文字 -->
      <view class="welcome-section">
        <text class="welcome-title">欢迎回来</text>
        <text class="welcome-desc">使用手机号快速登录</text>
      </view>

      <!-- 登录表单卡片 -->
      <view class="form-card glass-card">
        <!-- 手机号输入 -->
        <view class="input-wrapper">
          <view class="input-icon">
            <text class="icon-text">📱</text>
          </view>
          <view class="input-content">
            <text class="input-label">手机号</text>
            <view class="input-row">
              <text class="country-code">+86</text>
              <input
                type="number"
                v-model="phone"
                maxlength="11"
                placeholder="请输入手机号"
                class="input-field"
                placeholder-class="input-placeholder"
              />
              <view class="clear-btn" v-if="phone" @click="phone = ''">
                <text class="clear-icon">×</text>
              </view>
            </view>
          </view>
        </view>

        <view class="divider"></view>

        <!-- 验证码输入 -->
        <view class="input-wrapper">
          <view class="input-icon">
            <text class="icon-text">🔐</text>
          </view>
          <view class="input-content">
            <text class="input-label">验证码</text>
            <view class="input-row">
              <input
                type="number"
                v-model="code"
                maxlength="6"
                placeholder="请输入验证码"
                class="input-field"
                placeholder-class="input-placeholder"
              />
              <view
                class="code-btn glass-btn"
                :class="{ disabled: countdown > 0 || !canSendCode || isSending }"
                @click="sendCode"
              >
                <text class="code-text">{{ codeButtonText }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 协议 -->
      <view class="agreement-row" @click="agreed = !agreed">
        <view class="check-box" :class="{ checked: agreed }">
          <text class="check-mark" v-if="agreed">✓</text>
        </view>
        <text class="agreement-text">
          我已阅读并同意
          <text class="link" @click.stop="showAgreement">《服务协议》</text>
          与
          <text class="link" @click.stop="showPrivacy">《隐私政策》</text>
        </text>
      </view>

      <!-- 登录按钮 -->
      <button
        class="login-btn"
        :class="{ active: canLogin }"
        :disabled="!canLogin"
        @click="login"
      >
        <text class="btn-text">登录</text>
      </button>

      <!-- 其他登录 -->
      <view class="other-section">
        <view class="other-divider">
          <view class="line"></view>
          <text class="other-text">其他方式</text>
          <view class="line"></view>
        </view>
        <view class="other-icons">
          <view class="icon-btn glass-icon" @click="wechatLogin">
            <text class="social-icon">💬</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import config from '@/config/index.js';
import smsService from '@/utils/sms.js';

export default {
  data() {
    return {
      phone: '',
      code: '',
      agreed: false,
      countdown: 0,
      countdownTimer: null,
      isSending: false,
      isLoading: false
    }
  },

  computed: {
    canSendCode() {
      return this.phone.length === 11 && /^1[3-9]\d{9}$/.test(this.phone);
    },
    canLogin() {
      return this.canSendCode && this.code.length === 6 && this.agreed;
    },
    codeButtonText() {
      if (this.isSending) return '发送中';
      return this.countdown > 0 ? this.countdown + 's' : '获取';
    }
  },

  onLoad() {
    if (config.ENABLE_PHONE_LOGIN !== true) {
      uni.showModal({
        title: '暂未开放',
        content: '当前版本先使用微信一键登录，手机号登录将在短信服务配置完成后开放。',
        showCancel: false,
        success: () => {
          uni.navigateBack({
            fail: () => uni.reLaunch({ url: '/pages/login/login' })
          });
        }
      });
    }
  },

  beforeDestroy() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  },
  onHide() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  },

  methods: {
    goBack() {
      uni.navigateBack();
    },

    async sendCode() {
      if (!this.canSendCode) {
        uni.showToast({ title: '请输入正确手机号', icon: 'none' });
        return;
      }
      if (this.countdown > 0 || this.isSending) return;

      this.isSending = true;

      try {
        uni.showLoading({ title: '发送中...' });
        const result = await smsService.sendCode(this.phone);
        uni.hideLoading();

        if (result.success) {
          this.startCountdown();
          if (result.code) {
            uni.showModal({
              title: '测试验证码',
              content: `本次验证码：${result.code}`,
              showCancel: false
            });
          } else {
            uni.showToast({ title: result.message || '已发送', icon: 'success' });
          }
        }
      } catch (error) {
        uni.hideLoading();
        uni.showToast({ title: error.message || '发送失败', icon: 'none' });
      } finally {
        this.isSending = false;
      }
    },

    startCountdown() {
      this.countdown = 60;
      this.countdownTimer = setInterval(() => {
        this.countdown--;
        if (this.countdown <= 0) {
          clearInterval(this.countdownTimer);
          this.countdownTimer = null;
        }
      }, 1000);
    },

    async login() {
      if (!this.canLogin || this.isLoading) return;

      this.isLoading = true;

      try {
        uni.showLoading({ title: '登录中...' });
        const user = await smsService.phoneLogin(this.phone, this.code);
        uni.hideLoading();

        uni.removeStorageSync('demo_mode');
        uni.setStorageSync('token', user.token);
        uni.setStorageSync('userInfo', user);

        uni.showToast({ title: '登录成功', icon: 'success' });

        setTimeout(() => {
          uni.reLaunch({ url: '/pages/home/home' });
        }, 500);

      } catch (error) {
        uni.hideLoading();
        uni.showToast({
          title: typeof error === 'string' ? error : (error.message || '登录失败'),
          icon: 'none'
        });
      } finally {
        this.isLoading = false;
      }
    },

    wechatLogin() {
      uni.navigateTo({ url: '/pages/login/wechat-login' });
    },

    showAgreement() {
      uni.showModal({
        title: '服务协议',
        content: '本小程序用于智慧农业监测、设备数据查看、选苗建议和病虫害识别。用户应保证绑定设备信息、上传图片和填写资料真实合法。',
        showCancel: false
      });
    },

    showPrivacy() {
      uni.showModal({
        title: '隐私政策',
        content: '本小程序会在你授权后收集手机号、昵称、头像、设备绑定信息、传感器数据和用于病虫害识别的图片，仅用于登录识别和智慧农业相关功能。',
        showCancel: false
      });
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
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
  filter: blur(60rpx);
}

.circle-1 {
  width: 400rpx;
  height: 400rpx;
  background: rgba(255, 255, 255, 0.15);
  top: -100rpx;
  right: -100rpx;
}

.circle-2 {
  width: 300rpx;
  height: 300rpx;
  background: rgba(255, 182, 193, 0.2);
  bottom: 200rpx;
  left: -80rpx;
}

.circle-3 {
  width: 200rpx;
  height: 200rpx;
  background: rgba(135, 206, 250, 0.2);
  bottom: -50rpx;
  right: 100rpx;
}

/* 安全区域 */
.safe-area-top {
  height: env(safe-area-inset-top);
}

/* 导航栏 */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 32rpx;
  margin: 20rpx 32rpx;
  border-radius: 44rpx;
  position: relative;
  z-index: 10;
}

.glass-effect {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border: 1rpx solid rgba(255, 255, 255, 0.2);
}

.nav-back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-icon {
  font-size: 48rpx;
  color: #fff;
  font-weight: 300;
}

.nav-title {
  font-size: 32rpx;
  font-weight: 500;
  color: #fff;
}

.nav-placeholder {
  width: 64rpx;
}

/* 内容区 */
.content-area {
  padding: 40rpx 40rpx;
  position: relative;
  z-index: 5;
}

/* 欢迎区 */
.welcome-section {
  margin-bottom: 60rpx;
  padding-left: 8rpx;
}

.welcome-title {
  font-size: 56rpx;
  font-weight: 700;
  color: #fff;
  display: block;
  margin-bottom: 12rpx;
  letter-spacing: 2rpx;
}

.welcome-desc {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.7);
}

/* 玻璃卡片 */
.glass-card {
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(40rpx);
  -webkit-backdrop-filter: blur(40rpx);
  border-radius: 32rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.3);
  padding: 8rpx 0;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.1);
}

.form-card {
  margin-bottom: 32rpx;
}

/* 输入框 */
.input-wrapper {
  display: flex;
  align-items: center;
  padding: 28rpx 32rpx;
}

.input-icon {
  width: 80rpx;
  height: 80rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
}

.icon-text {
  font-size: 36rpx;
}

.input-content {
  flex: 1;
}

.input-label {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 8rpx;
  display: block;
}

.input-row {
  display: flex;
  align-items: center;
}

.country-code {
  font-size: 32rpx;
  color: #fff;
  margin-right: 16rpx;
  font-weight: 500;
}

.input-field {
  flex: 1;
  font-size: 32rpx;
  color: #fff;
  background: transparent;
}

.input-placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.clear-btn {
  width: 48rpx;
  height: 48rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-icon {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
}

.divider {
  height: 1rpx;
  background: rgba(255, 255, 255, 0.15);
  margin: 0 32rpx;
}

/* 验证码按钮 */
.glass-btn {
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(10rpx);
  padding: 12rpx 28rpx;
  border-radius: 32rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.3);
}

.glass-btn.disabled {
  opacity: 0.5;
}

.code-text {
  font-size: 26rpx;
  color: #fff;
  font-weight: 500;
}

/* 协议 */
.agreement-row {
  display: flex;
  align-items: flex-start;
  padding: 0 8rpx;
  margin-bottom: 48rpx;
}

.check-box {
  width: 40rpx;
  height: 40rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.5);
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
  margin-top: 4rpx;
  transition: all 0.3s;
}

.check-box.checked {
  background: rgba(255, 255, 255, 0.9);
  border-color: rgba(255, 255, 255, 0.9);
}

.check-mark {
  font-size: 24rpx;
  color: #667eea;
  font-weight: 700;
}

.agreement-text {
  flex: 1;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
}

.link {
  color: #fff;
  font-weight: 500;
}

/* 登录按钮 */
.login-btn {
  width: 100%;
  height: 100rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s;
}

.login-btn::after {
  border: none;
}

.login-btn.active {
  background: rgba(255, 255, 255, 0.95);
  border-color: transparent;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.15);
}

.btn-text {
  font-size: 34rpx;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
}

.login-btn.active .btn-text {
  color: #667eea;
}

/* 其他登录 */
.other-section {
  margin-top: 80rpx;
}

.other-divider {
  display: flex;
  align-items: center;
  margin-bottom: 40rpx;
}

.line {
  flex: 1;
  height: 1rpx;
  background: rgba(255, 255, 255, 0.2);
}

.other-text {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.5);
  padding: 0 24rpx;
}

.other-icons {
  display: flex;
  justify-content: center;
}

.glass-icon {
  width: 100rpx;
  height: 100rpx;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20rpx);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid rgba(255, 255, 255, 0.2);
}

.social-icon {
  font-size: 44rpx;
}
</style>
