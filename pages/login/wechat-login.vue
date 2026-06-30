<template>
  <view class="page">
    <!-- 背景层 -->
    <view class="bg-layer">
      <view class="bg-circle circle-1"></view>
      <view class="bg-circle circle-2"></view>
    </view>

    <!-- 安全区域占位 -->
    <view class="safe-area-top"></view>

    <!-- 导航栏 -->
    <view class="nav-bar glass-nav">
      <view class="nav-back" @click="goBack">
        <text class="nav-icon">‹</text>
      </view>
      <text class="nav-title">授权登录</text>
      <view class="nav-placeholder"></view>
    </view>

    <!-- 主内容 -->
    <view class="content-area">
      <!-- 头像卡片 -->
      <view class="avatar-card glass-card">
        <view class="avatar-wrapper">
          <image class="avatar" src="/static/app-icon-smart-agriculture-avatar.png" mode="aspectFill"></image>
        </view>
        <text class="app-name">智慧农业</text>
        <text class="app-desc">申请获取你的公开信息</text>
      </view>

      <!-- 权限列表 -->
      <view class="permission-card glass-card">
        <view class="permission-item">
          <view class="perm-icon">👤</view>
          <view class="perm-info">
            <text class="perm-title">昵称和头像</text>
            <text class="perm-desc">用于展示个人信息</text>
          </view>
          <view class="perm-check">✓</view>
        </view>
      </view>

      <!-- 按钮区 -->
      <view class="btn-area">
        <button
          class="allow-btn"
          :class="{ loading: isLoading }"
          :disabled="isLoading"
          @click="loginWithWechat"
          hover-class="btn-hover"
        >
          <text class="btn-text">{{ isLoading ? '授权中...' : '允许' }}</text>
        </button>

        <view class="refuse-btn" @click="goBack">
          <text class="refuse-text">拒绝</text>
        </view>
      </view>

      <!-- 协议 -->
      <view class="agreement-area">
        <text class="agree-text">登录即表示同意</text>
        <text class="agree-link" @click="showAgreement">《用户协议》</text>
        <text class="agree-text">和</text>
        <text class="agree-link" @click="showPrivacy">《隐私政策》</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      isLoading: false
    }
  },
  methods: {
    goBack() {
      uni.navigateBack();
    },

    async loginWithWechat() {
      // #ifndef MP-WEIXIN
      uni.showToast({ title: '请在微信中打开', icon: 'none' });
      return;
      // #endif

      if (this.isLoading) return;
      this.isLoading = true;

      try {
        // #ifdef MP-WEIXIN
        const { code } = await uni.login({ provider: 'weixin' });
        if (!code) throw new Error('获取登录凭证失败');

        const { result } = await uniCloud.callFunction({
          name: 'login',
          data: { code }
        });

        if (result.success) {
          uni.removeStorageSync('demo_mode');
          uni.setStorageSync('token', result.token);
          uni.setStorageSync('userInfo', result.userInfo || {});
          uni.showToast({ title: '登录成功', icon: 'success' });
          setTimeout(() => uni.reLaunch({ url: '/pages/home/home' }), 500);
        } else {
          throw new Error(result.message || '登录失败');
        }
        // #endif
      } catch (err) {
        uni.showToast({ title: err.message || '登录失败', icon: 'none' });
      } finally {
        this.isLoading = false;
      }
    },

    showAgreement() {
      uni.showModal({
        title: '用户协议',
        content: '本小程序用于智慧农业监测、设备数据查看、选苗建议和病虫害识别。用户应保证绑定设备信息、上传图片和填写资料真实合法。',
        showCancel: false
      });
    },

    showPrivacy() {
      uni.showModal({
        title: '隐私政策',
        content: '本小程序会在你授权后收集微信登录标识、昵称、头像、手机号、设备绑定信息、传感器数据和用于病虫害识别的图片，仅用于提供智慧农业相关功能。',
        showCancel: false
      });
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(160deg, #0f3460 0%, #16213e 50%, #1a1a2e 100%);
  position: relative;
  overflow: hidden;
}

/* 背景 */
.bg-layer {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.bg-circle {
  position: absolute;
  border-radius: 50%;
  filter: blur(80rpx);
}

.circle-1 {
  width: 400rpx;
  height: 400rpx;
  background: rgba(7, 193, 96, 0.25);
  top: -100rpx;
  left: -100rpx;
}

.circle-2 {
  width: 350rpx;
  height: 350rpx;
  background: rgba(102, 126, 234, 0.2);
  bottom: 100rpx;
  right: -80rpx;
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
}

.glass-nav {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border: 1rpx solid rgba(255, 255, 255, 0.15);
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
  padding: 40rpx;
  position: relative;
  z-index: 5;
}

/* 玻璃卡片 */
.glass-card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(40rpx);
  -webkit-backdrop-filter: blur(40rpx);
  border-radius: 32rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.12);
  margin-bottom: 32rpx;
}

/* 头像卡片 */
.avatar-card {
  padding: 48rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.avatar-wrapper {
  width: 140rpx;
  height: 140rpx;
  border-radius: 40rpx;
  background: rgba(255, 255, 255, 0.15);
  padding: 8rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.2);
}

.avatar {
  width: 100%;
  height: 100%;
  border-radius: 32rpx;
}

.app-name {
  font-size: 40rpx;
  font-weight: 600;
  color: #fff;
  margin-bottom: 8rpx;
}

.app-desc {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.5);
}

/* 权限卡片 */
.permission-card {
  padding: 28rpx 32rpx;
}

.permission-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.perm-icon {
  width: 64rpx;
  height: 64rpx;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
}

.perm-info {
  flex: 1;
}

.perm-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #fff;
  display: block;
  margin-bottom: 4rpx;
}

.perm-desc {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.5);
}

.perm-check {
  width: 48rpx;
  height: 48rpx;
  background: rgba(52, 199, 89, 0.8);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: #fff;
}

/* 按钮区 */
.btn-area {
  margin-top: 24rpx;
}

.allow-btn {
  width: 100%;
  height: 100rpx;
  background: rgba(52, 199, 89, 0.9);
  border-radius: 50rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  box-shadow: 0 8rpx 32rpx rgba(52, 199, 89, 0.3);
  margin-bottom: 20rpx;
}

.allow-btn::after {
  border: none;
}

.allow-btn.loading {
  opacity: 0.7;
}

.btn-text {
  font-size: 34rpx;
  color: #fff;
  font-weight: 600;
}

.btn-hover {
  opacity: 0.85;
  transform: scale(0.98);
}

.refuse-btn {
  display: flex;
  justify-content: center;
  padding: 24rpx;
}

.refuse-text {
  font-size: 30rpx;
  color: rgba(255, 255, 255, 0.5);
}

/* 协议 */
.agreement-area {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 40rpx;
  padding-bottom: calc(40rpx + env(safe-area-inset-bottom));
}

.agree-text {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.4);
}

.agree-link {
  font-size: 24rpx;
  color: rgba(102, 126, 234, 0.9);
}
</style>
