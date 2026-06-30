<template>
  <view class="container" :style="{ paddingTop: statusBarHeight + 'px' }">
    <!-- 背景装饰 -->
    <view class="bg-decoration">
      <view class="bg-blob bg-blob-1"></view>
      <view class="bg-blob bg-blob-2"></view>
      <view class="bg-blob bg-blob-3"></view>
    </view>

    <!-- 头部区域 -->
    <view class="header">
      <view class="greeting-section">
        <text class="greeting-text">{{ greeting }}</text>
        <text class="user-name">{{ userName }}</text>
      </view>
      <view class="header-right">
        <text class="date-text">{{ currentDate }}</text>
        <view class="avatar-wrapper" @click="openProfileEditor">
          <image
            :src="userAvatar"
            class="user-avatar"
            mode="aspectFill"
          ></image>
          <view class="avatar-ring"></view>
        </view>
      </view>
    </view>

    <!-- 状态概览卡片 -->
    <view class="status-overview glass-card" @click="goToMonitor">
      <view class="status-header">
        <view class="status-title-row">
          <text class="status-icon">🌳</text>
          <text class="status-title">发财树监测</text>
        </view>
        <view class="status-badge" :class="statusClass">
          <view class="status-dot"></view>
          <text class="status-text">{{ monitorData.status }}</text>
        </view>
      </view>

      <view class="metrics-grid">
        <view class="metric-item">
          <view class="metric-icon-wrapper bg-temp">
            <text class="metric-icon">🌡️</text>
          </view>
          <view class="metric-info">
            <text class="metric-value">{{ monitorData.temperature }}<text class="metric-unit">°C</text></text>
            <text class="metric-label">温度</text>
          </view>
        </view>

        <view class="metric-item">
          <view class="metric-icon-wrapper bg-humidity">
            <text class="metric-icon">💧</text>
          </view>
          <view class="metric-info">
            <text class="metric-value">{{ monitorData.humidity }}<text class="metric-unit">%</text></text>
            <text class="metric-label">湿度</text>
          </view>
        </view>

        <view class="metric-item">
          <view class="metric-icon-wrapper bg-ph">
            <text class="metric-icon">🧪</text>
          </view>
          <view class="metric-info">
            <text class="metric-value">{{ monitorData.ph }}</text>
            <text class="metric-label">pH值</text>
          </view>
        </view>

        <view class="metric-item">
          <view class="metric-icon-wrapper bg-status">
            <text class="metric-icon">📊</text>
          </view>
          <view class="metric-info">
            <text class="metric-value status-value">{{ monitorData.status }}</text>
            <text class="metric-label">状态</text>
          </view>
        </view>
      </view>

      <view class="alert-bar" v-if="monitorData.alert" :class="alertClass">
        <text class="alert-icon">{{ monitorData.status === '正常' ? '✅' : '⚠️' }}</text>
        <text class="alert-text">{{ monitorData.alert }}</text>
      </view>

      <button class="action-btn glass-btn-primary" @click.stop="goToMonitor" hover-class="btn-hover">
        <text class="btn-text">查看详细数据</text>
        <text class="btn-arrow">→</text>
      </button>
    </view>

    <!-- 快捷功能区 -->
    <view class="quick-actions">
      <text class="section-title">快捷功能</text>
      <view class="actions-grid">
        <view class="action-card glass-card-light" @click="goToSeedling" hover-class="card-hover">
          <view class="action-icon-wrapper bg-seedling">
            <text class="action-icon">🌱</text>
          </view>
          <text class="action-title">智能选苗</text>
          <text class="action-desc">AI 分析土壤数据</text>
        </view>

        <view class="action-card glass-card-light" @click="goToPest" hover-class="card-hover">
          <view class="action-icon-wrapper bg-pest">
            <text class="action-icon">🔍</text>
          </view>
          <text class="action-title">病害检测</text>
          <text class="action-desc">图像识别分析</text>
        </view>

        <view class="action-card glass-card-light" @click="goToDeviceBind" hover-class="card-hover">
          <view class="action-icon-wrapper bg-device">
            <text class="action-icon">🔗</text>
          </view>
          <text class="action-title">设备绑定</text>
          <text class="action-desc">接入自己的硬件数据</text>
        </view>
      </view>
    </view>

    <!-- AI 助手提示 -->
    <view class="ai-tip glass-card-accent">
      <view class="ai-tip-content">
        <view class="ai-icon-wrapper">
          <text class="ai-icon">🤖</text>
        </view>
        <view class="ai-tip-text">
          <text class="ai-tip-title">通义千问 AI 助手</text>
          <text class="ai-tip-desc">点击选苗或监测页面获取智能分析建议</text>
        </view>
      </view>
    </view>

    <!-- 底部占位 -->
    <view class="tab-bar-placeholder"></view>

    <!-- 头像昵称完善 -->
    <view class="profile-mask" v-if="showProfileEditor">
      <view class="profile-panel">
        <view class="profile-header">
          <text class="profile-title">完善资料</text>
          <text class="profile-desc">选择头像和昵称，用于首页展示</text>
        </view>

        <button class="profile-avatar-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
          <image class="profile-avatar" :src="profileForm.avatar || userAvatar" mode="aspectFill"></image>
          <text class="profile-avatar-tip">点击选择头像</text>
        </button>

        <view class="profile-input-row">
          <input
            class="profile-input"
            type="nickname"
            v-model="profileForm.nickname"
            maxlength="30"
            placeholder="请输入昵称"
            placeholder-class="profile-placeholder"
          />
        </view>

        <view class="profile-actions">
          <button class="profile-secondary" @click="skipProfileEditor">稍后</button>
          <button class="profile-primary" :disabled="isSavingProfile" @click="saveUserProfile">
            {{ isSavingProfile ? '保存中' : '保存' }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import ApiService from '@/utils/api.js';

export default {
  data() {
    return {
      statusBarHeight: 88,
      currentDate: '',
      greeting: '',
      refreshTimer: null,
      userInfo: null,
      userAvatar: '/static/avatar-default.png',
      showProfileEditor: false,
      isSavingProfile: false,
      profileForm: {
        nickname: '',
        avatar: '',
        avatarFileID: ''
      },
      monitorData: {
        temperature: 0,
        humidity: 0,
        ph: 0,
        light: 0,
        status: '获取中',
        alert: ''
      }
    };
  },

  computed: {
    userName() {
      return this.userInfo?.nickname || this.userInfo?.nickName || this.userInfo?.phone?.slice(-4) || '用户';
    },
    statusClass() {
      if (this.monitorData.status === '正常') return 'status-normal';
      if (this.monitorData.status === '离线') return 'status-offline';
      return 'status-warning';
    },
    alertClass() {
      return this.monitorData.status === '正常' ? 'alert-success' : 'alert-warning';
    }
  },

  onLoad() {
    this.initStatusBar();
    this.loadUserInfo();
    this.updateDate();
    this.updateGreeting();
    this.loadMonitorData();

    this.refreshTimer = setInterval(() => {
      this.loadMonitorData();
    }, 30000);
  },

  onHide() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  },
  onShow() {
    this.loadUserInfo();
    this.loadMonitorData();
    if (!this.refreshTimer) {
      this.refreshTimer = setInterval(() => {
        this.loadMonitorData();
      }, 30000);
    }
  },
  onUnload() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  },

  methods: {
    initStatusBar() {
      // 优先从缓存获取
      const totalNavHeight = uni.getStorageSync('totalNavHeight');
      if (totalNavHeight) {
        this.statusBarHeight = totalNavHeight;
      } else {
        // 动态计算
        try {
          const systemInfo = uni.getSystemInfoSync();
          const statusBarHeight = systemInfo.statusBarHeight || 20;
          // #ifdef MP-WEIXIN
          try {
            const menuButtonInfo = uni.getMenuButtonBoundingClientRect();
            const navBarHeight = (menuButtonInfo.top - statusBarHeight) * 2 + menuButtonInfo.height;
            this.statusBarHeight = statusBarHeight + navBarHeight;
          } catch (e) {
            this.statusBarHeight = statusBarHeight + 44;
          }
          // #endif
          // #ifndef MP-WEIXIN
          this.statusBarHeight = statusBarHeight + 44;
          // #endif
        } catch (e) {
          this.statusBarHeight = 88;
        }
      }
    },

    loadUserInfo() {
      const userInfo = uni.getStorageSync('userInfo');
      if (userInfo) {
        this.userInfo = userInfo;
        this.profileForm.nickname = userInfo.nickname || userInfo.nickName || '';
        this.profileForm.avatar = userInfo.avatar || userInfo.avatarUrl || '';
        this.profileForm.avatarFileID = userInfo.avatarFileID || '';
        this.setAvatarFromUserInfo(userInfo);
        this.showProfileEditor = this.needsProfile(userInfo) && !uni.getStorageSync('profile_editor_skipped');
      }
    },

    needsProfile(userInfo = {}) {
      const nickname = userInfo.nickname || userInfo.nickName || '';
      const hasAvatar = Boolean(userInfo.avatar || userInfo.avatarUrl || userInfo.avatarFileID);
      return !nickname || nickname === '微信用户' || !hasAvatar;
    },

    async setAvatarFromUserInfo(userInfo = {}) {
      const avatar = userInfo.avatar || userInfo.avatarUrl;
      if (userInfo.avatarFileID && typeof uniCloud !== 'undefined' && uniCloud.getTempFileURL) {
        try {
          const res = await uniCloud.getTempFileURL({ fileList: [userInfo.avatarFileID] });
          const file = res.fileList && res.fileList[0];
          const tempUrl = file && (file.tempFileURL || file.url);
          if (tempUrl) {
            this.userAvatar = tempUrl;
            return;
          }
        } catch (error) {
          // 使用本地缓存头像兜底。
        }
      }

      this.userAvatar = avatar || '/static/avatar-default.png';
    },

    openProfileEditor() {
      uni.removeStorageSync('profile_editor_skipped');
      this.showProfileEditor = true;
    },

    skipProfileEditor() {
      uni.setStorageSync('profile_editor_skipped', true);
      this.showProfileEditor = false;
    },

    onChooseAvatar(event) {
      const avatarUrl = event.detail && event.detail.avatarUrl;
      if (!avatarUrl) return;
      this.profileForm.avatar = avatarUrl;
      this.profileForm.avatarFileID = '';
      this.userAvatar = avatarUrl;
    },

    isUploadDomainError(error) {
      const message = String(error?.errMsg || error?.message || error || '');
      return message.includes('url not in domain list') || message.includes('合法域名');
    },

    saveAvatarToLocalFile(filePath) {
      if (!filePath || /^https?:\/\//i.test(filePath) || filePath.startsWith('cloud://')) {
        return Promise.resolve(filePath);
      }

      return new Promise((resolve) => {
        if (!uni.saveFile) {
          resolve(filePath);
          return;
        }

        uni.saveFile({
          tempFilePath: filePath,
          success: (res) => resolve(res.savedFilePath || filePath),
          fail: () => resolve(filePath)
        });
      });
    },

    async uploadAvatarIfNeeded() {
      const avatar = this.profileForm.avatar;
      if (!avatar || /^https?:\/\//i.test(avatar) || avatar.startsWith('cloud://')) {
        return {
          avatar,
          avatarFileID: this.profileForm.avatarFileID || ''
        };
      }

      const userId = this.userInfo?.id || 'user';
      const cloudPath = `avatars/${userId}-${Date.now()}.jpg`;
      let uploadResult;
      try {
        uploadResult = await uniCloud.uploadFile({
          filePath: avatar,
          cloudPath
        });
      } catch (error) {
        if (!this.isUploadDomainError(error)) {
          throw error;
        }

        const localAvatar = await this.saveAvatarToLocalFile(avatar);
        return {
          avatar: localAvatar,
          avatarFileID: '',
          uploadSkipped: true
        };
      }

      return {
        avatar,
        avatarFileID: uploadResult.fileID || uploadResult.fileId || ''
      };
    },

    async saveUserProfile() {
      const nickname = String(this.profileForm.nickname || '').trim();
      if (!nickname) {
        uni.showToast({ title: '请输入昵称', icon: 'none' });
        return;
      }
      if (!this.profileForm.avatar && !this.profileForm.avatarFileID) {
        uni.showToast({ title: '请选择头像', icon: 'none' });
        return;
      }

      this.isSavingProfile = true;
      try {
        uni.showLoading({ title: '保存中...' });
        const token = uni.getStorageSync('token');
        const avatarData = await this.uploadAvatarIfNeeded();
        const { result } = await uniCloud.callFunction({
          name: 'login',
          data: {
            type: 'profile',
            token,
            nickname,
            avatar: avatarData.avatarFileID ? '' : avatarData.avatar,
            avatarFileID: avatarData.avatarFileID
          }
        });

        if (!result || result.success === false) {
          throw new Error(result?.message || '保存失败');
        }

        const nextUserInfo = {
          ...(this.userInfo || {}),
          ...(result.userInfo || {}),
          nickname,
          avatar: avatarData.avatar,
          avatarFileID: avatarData.avatarFileID
        };
        uni.setStorageSync('userInfo', nextUserInfo);
        uni.removeStorageSync('profile_editor_skipped');
        this.userInfo = nextUserInfo;
        this.userAvatar = avatarData.avatar || this.userAvatar;
        this.showProfileEditor = false;
        uni.hideLoading();
        if (avatarData.uploadSkipped) {
          uni.showModal({
            title: '头像已本机保存',
            content: '当前小程序没有配置 uploadFile 合法域名，头像已先在本机显示。正式体验/发布前请在微信公众平台添加 uniCloud 上传域名。',
            showCancel: false
          });
        } else {
          uni.showToast({ title: '资料已保存', icon: 'success' });
        }
      } catch (error) {
        uni.hideLoading();
        uni.showToast({ title: error.message || '保存失败', icon: 'none' });
      } finally {
        this.isSavingProfile = false;
      }
    },

    updateGreeting() {
      const hour = new Date().getHours();
      if (hour < 6) {
        this.greeting = '夜深了';
      } else if (hour < 12) {
        this.greeting = '早上好';
      } else if (hour < 14) {
        this.greeting = '中午好';
      } else if (hour < 18) {
        this.greeting = '下午好';
      } else {
        this.greeting = '晚上好';
      }
    },

    async loadMonitorData() {
      try {
        const data = await ApiService.getDeviceProperty();

        this.monitorData = {
          temperature: data.temp ?? 0,
          humidity: data.moi ?? 0,
          ph: data.PH ?? 0,
          light: '',
          status: this.evaluateStatus({
            temperature: data.temp,
            humidity: data.moi,
            ph: data.PH,
            light: null
          }),
          alert: this.generateAlert({
            temperature: data.temp,
            humidity: data.moi,
            ph: data.PH,
            light: null
          })
        };

      } catch (error) {
        this.monitorData = {
          temperature: 0,
          humidity: 0,
          ph: 0,
          light: 0,
          status: error.message && error.message.includes('绑定设备') ? '未绑定' : '离线',
          alert: error.message && error.message.includes('绑定设备') ? '请先绑定自己的硬件设备' : '数据获取失败，请检查网络连接'
        };
      }
    },

    evaluateStatus(data) {
      if (data.temperature == null && data.humidity == null && data.ph == null) return '离线';
      if (data.temperature > 30 || data.temperature < 15) return '异常';
      if (data.humidity < 40 || data.humidity > 80) return '异常';
      if (data.ph < 5.5 || data.ph > 7.5) return '异常';
      return '正常';
    },

    generateAlert(data) {
      const alerts = [];

      if (data.temperature > 30) alerts.push('温度过高');
      if (data.temperature < 15) alerts.push('温度过低');
      if (data.humidity < 40) alerts.push('湿度过低');
      if (data.humidity > 80) alerts.push('湿度过高');
      if (data.ph < 5.5) alerts.push('土壤过酸');
      if (data.ph > 7.5) alerts.push('土壤过碱');

      if (alerts.length > 0) {
        return `${alerts.join('、')}`;
      }
      return '环境适宜，生长状态良好';
    },

    updateDate() {
      const now = new Date();
      const month = now.getMonth() + 1;
      const day = now.getDate();
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      this.currentDate = `${month}月${day}日 ${weekdays[now.getDay()]}`;
    },

    goToMonitor() {
      uni.switchTab({ url: '/pages/monitor/monitor' });
    },

    goToSeedling() {
      uni.switchTab({ url: '/pages/seedling/seedling' });
    },

    goToPest() {
      uni.navigateTo({ url: '/pages/pest/pest' });
    },

    goToDeviceBind() {
      uni.navigateTo({ url: '/pages/device-bind/device-bind' });
    }
  }
};
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: linear-gradient(180deg, #1C1C1E 0%, #2C2C2E 50%, #1C1C1E 100%);
  padding: 0 32rpx;
  padding-bottom: 32rpx;
  position: relative;
  overflow-x: hidden;
}

/* 背景装饰 */
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
  background: linear-gradient(135deg, rgba(52, 199, 89, 0.35) 0%, rgba(48, 209, 88, 0.15) 100%);
  top: -80rpx;
  right: -80rpx;
}

.bg-blob-2 {
  width: 350rpx;
  height: 350rpx;
  background: linear-gradient(135deg, rgba(10, 132, 255, 0.25) 0%, rgba(64, 156, 255, 0.1) 100%);
  top: 500rpx;
  left: -100rpx;
}

.bg-blob-3 {
  width: 280rpx;
  height: 280rpx;
  background: linear-gradient(135deg, rgba(255, 159, 10, 0.2) 0%, rgba(255, 179, 64, 0.08) 100%);
  bottom: 300rpx;
  right: -60rpx;
}

/* 头部区域 */
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 40rpx;
  position: relative;
  z-index: 1;
}

.greeting-section {
  display: flex;
  flex-direction: column;
}

.greeting-text {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 8rpx;
}

.user-name {
  font-size: 52rpx;
  font-weight: 700;
  color: #FFFFFF;
  letter-spacing: 2rpx;
}

.header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 16rpx;
}

.date-text {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.4);
}

.avatar-wrapper {
  position: relative;
}

.user-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 44rpx;
  border: 3rpx solid rgba(255, 255, 255, 0.2);
}

.avatar-ring {
  position: absolute;
  top: -6rpx;
  left: -6rpx;
  right: -6rpx;
  bottom: -6rpx;
  border-radius: 50%;
  border: 2rpx solid rgba(52, 199, 89, 0.4);
}

/* 状态概览卡片 */
.status-overview {
  padding: 32rpx;
  margin-bottom: 32rpx;
  position: relative;
  z-index: 1;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32rpx;
}

.status-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.status-icon {
  font-size: 40rpx;
}

.status-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #FFFFFF;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 20rpx;
  border-radius: 24rpx;
  background: rgba(52, 199, 89, 0.2);
}

.status-badge .status-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #34C759;
  animation: pulse 2s infinite;
}

.status-badge .status-text {
  font-size: 24rpx;
  font-weight: 500;
  color: #34C759;
}

.status-normal {
  background: rgba(52, 199, 89, 0.2);
}

.status-normal .status-dot {
  background: #34C759;
}

.status-normal .status-text {
  color: #34C759;
}

.status-warning {
  background: rgba(255, 159, 10, 0.2);
}

.status-warning .status-dot {
  background: #FF9F0A;
}

.status-warning .status-text {
  color: #FF9F0A;
}

.status-offline {
  background: rgba(142, 142, 147, 0.2);
}

.status-offline .status-dot {
  background: #8E8E93;
  animation: none;
}

.status-offline .status-text {
  color: #8E8E93;
}

/* 数据网格 */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
  margin-bottom: 24rpx;
}

.metric-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.06);
}

.metric-icon-wrapper {
  width: 56rpx;
  height: 56rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.metric-icon {
  font-size: 28rpx;
}

.bg-temp {
  background: linear-gradient(135deg, rgba(255, 69, 58, 0.3) 0%, rgba(255, 69, 58, 0.1) 100%);
}

.bg-humidity {
  background: linear-gradient(135deg, rgba(10, 132, 255, 0.3) 0%, rgba(10, 132, 255, 0.1) 100%);
}

.bg-ph {
  background: linear-gradient(135deg, rgba(175, 82, 222, 0.3) 0%, rgba(175, 82, 222, 0.1) 100%);
}

.bg-status {
  background: linear-gradient(135deg, rgba(52, 199, 89, 0.3) 0%, rgba(52, 199, 89, 0.1) 100%);
}

.metric-info {
  display: flex;
  flex-direction: column;
}

.metric-value {
  font-size: 36rpx;
  font-weight: 700;
  color: #FFFFFF;
}

.metric-unit {
  font-size: 24rpx;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.5);
}

.status-value {
  font-size: 28rpx;
}

.metric-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 4rpx;
}

/* 警告条 */
.alert-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 20rpx;
  border-radius: 16rpx;
  margin-bottom: 24rpx;
}

.alert-success {
  background: rgba(52, 199, 89, 0.15);
}

.alert-warning {
  background: rgba(255, 159, 10, 0.15);
}

.alert-icon {
  font-size: 28rpx;
}

.alert-text {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.7);
  flex: 1;
}

/* 操作按钮 */
.action-btn {
  width: 100%;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  border-radius: 20rpx;
  background: linear-gradient(135deg, rgba(52, 199, 89, 0.9) 0%, rgba(48, 209, 88, 0.85) 100%);
  box-shadow: 0 8rpx 24rpx rgba(52, 199, 89, 0.25);
}

.action-btn::after {
  border: none;
}

.btn-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #FFFFFF;
}

.btn-arrow {
  font-size: 32rpx;
  color: #FFFFFF;
}

.btn-hover {
  transform: scale(0.98);
  opacity: 0.9;
}

/* 快捷功能区 */
.quick-actions {
  margin-bottom: 32rpx;
  position: relative;
  z-index: 1;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #FFFFFF;
  margin-bottom: 20rpx;
  display: block;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.action-card {
  padding: 28rpx;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
}

.card-hover {
  transform: scale(0.97);
  opacity: 0.9;
}

.action-icon-wrapper {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
}

.action-icon {
  font-size: 36rpx;
}

.bg-seedling {
  background: linear-gradient(135deg, rgba(255, 159, 10, 0.4) 0%, rgba(255, 159, 10, 0.15) 100%);
}

.bg-pest {
  background: linear-gradient(135deg, rgba(10, 132, 255, 0.4) 0%, rgba(10, 132, 255, 0.15) 100%);
}

.bg-device {
  background: linear-gradient(135deg, rgba(100, 210, 255, 0.35) 0%, rgba(52, 199, 89, 0.16) 100%);
}

.action-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #FFFFFF;
  margin-bottom: 8rpx;
}

.action-desc {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.4);
}

/* AI 提示卡片 */
.ai-tip {
  padding: 24rpx;
  position: relative;
  z-index: 1;
}

.ai-tip-content {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.ai-icon-wrapper {
  width: 64rpx;
  height: 64rpx;
  background: linear-gradient(135deg, rgba(52, 199, 89, 0.4) 0%, rgba(52, 199, 89, 0.2) 100%);
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ai-icon {
  font-size: 32rpx;
}

.ai-tip-text {
  flex: 1;
}

.ai-tip-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #FFFFFF;
  display: block;
  margin-bottom: 4rpx;
}

.ai-tip-desc {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.5);
}

/* 资料完善 */
.profile-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 99;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
  background: rgba(0, 0, 0, 0.55);
}

.profile-panel {
  width: 100%;
  max-width: 640rpx;
  padding: 36rpx;
  border-radius: 28rpx;
  background: rgba(31, 41, 55, 0.96);
  border: 1rpx solid rgba(255, 255, 255, 0.12);
}

.profile-header {
  margin-bottom: 28rpx;
}

.profile-title {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: #fff;
  margin-bottom: 8rpx;
}

.profile-desc {
  display: block;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.55);
}

.profile-avatar-btn {
  width: 100%;
  padding: 24rpx 0;
  margin: 0 0 24rpx;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.profile-avatar-btn::after {
  border: none;
}

.profile-avatar {
  width: 132rpx;
  height: 132rpx;
  border-radius: 66rpx;
  border: 3rpx solid rgba(255, 255, 255, 0.18);
}

.profile-avatar-tip {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.68);
}

.profile-input-row {
  height: 88rpx;
  border-radius: 18rpx;
  padding: 0 24rpx;
  background: rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  margin-bottom: 28rpx;
}

.profile-input {
  width: 100%;
  font-size: 30rpx;
  color: #fff;
}

.profile-placeholder {
  color: rgba(255, 255, 255, 0.35);
}

.profile-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18rpx;
}

.profile-secondary,
.profile-primary {
  height: 84rpx;
  border-radius: 18rpx;
  font-size: 28rpx;
  font-weight: 600;
}

.profile-secondary::after,
.profile-primary::after {
  border: none;
}

.profile-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.72);
}

.profile-primary {
  background: #34C759;
  color: #fff;
}

/* 底部占位 */
.tab-bar-placeholder {
  height: calc(120rpx + env(safe-area-inset-bottom));
}

/* 动画 */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
