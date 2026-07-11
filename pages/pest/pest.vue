<template>
  <view class="container" :style="{ paddingTop: statusBarHeight + 'px' }">
    <!-- 背景装饰 -->
    <view class="bg-decoration">
      <view class="bg-blob bg-blob-1"></view>
      <view class="bg-blob bg-blob-2"></view>
    </view>

    <!-- 页面头部 -->
    <view class="page-header">
      <view class="back-btn" @click="goToHome">
        <text class="back-icon">←</text>
      </view>
      <text class="page-title">病害检测</text>
      <view class="header-spacer"></view>
    </view>

    <!-- 今日统计 -->
    <view class="stats-card glass-card">
      <view class="stats-header">
        <text class="stats-title">今日检测</text>
        <text class="stats-date">{{ currentDate }}</text>
      </view>
      <view class="stats-grid">
        <view class="stat-item">
          <view class="stat-icon-bg bg-scan">
            <text class="stat-icon">🔍</text>
          </view>
          <view class="stat-info">
            <text class="stat-value">{{ detectionCount }}</text>
            <text class="stat-label">检测次数</text>
          </view>
        </view>
        <view class="stat-item">
          <view class="stat-icon-bg bg-pest">
            <text class="stat-icon">🐛</text>
          </view>
          <view class="stat-info">
            <text class="stat-value">{{ pestCount }}</text>
            <text class="stat-label">发现虫害</text>
          </view>
        </view>
        <view class="stat-item">
          <view class="stat-icon-bg bg-accuracy">
            <text class="stat-icon">📊</text>
          </view>
          <view class="stat-info">
            <text class="stat-value">{{ accuracyRate }}%</text>
            <text class="stat-label">准确率</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 快捷操作 -->
    <view class="action-card glass-card">
      <view class="card-header">
        <text class="card-title">快捷操作</text>
      </view>
      <view class="action-buttons">
        <view class="action-btn primary" @click="startScan" hover-class="btn-hover">
          <view class="action-icon-bg">
            <text class="action-icon">📸</text>
          </view>
          <text class="action-text">拍照扫描</text>
        </view>
        <view class="action-btn secondary" @click="uploadImage" hover-class="btn-hover">
          <view class="action-icon-bg">
            <text class="action-icon">🖼️</text>
          </view>
          <text class="action-text">上传图片</text>
        </view>
      </view>
    </view>

    <!-- 检测记录 -->
    <view class="history-card glass-card">
      <view class="card-header">
        <text class="card-title">检测记录</text>
        <text class="view-more" @click="viewMore">查看更多</text>
      </view>

      <view class="history-list">
        <view class="history-item" v-for="(item, index) in detectionHistory" :key="index">
          <view class="history-image-wrapper">
            <image class="history-image" :src="item.image" mode="aspectFill"></image>
            <view class="history-badge" :class="item.status === '需处理' ? 'warning' : 'success'">
              {{ item.status }}
            </view>
          </view>
          <view class="history-info">
            <text class="history-title">{{ item.title }}</text>
            <text class="history-time">{{ item.time }}</text>
          </view>
          <view class="history-arrow">→</view>
        </view>
      </view>

      <view class="empty-state" v-if="detectionHistory.length === 0">
        <text class="empty-icon">📋</text>
        <text class="empty-text">暂无检测记录</text>
      </view>
    </view>

    <!-- AI 提示 -->
    <view class="ai-tip glass-card-accent">
      <view class="ai-tip-content">
        <view class="ai-icon-wrapper">
          <text class="ai-icon">🤖</text>
        </view>
        <view class="ai-tip-text">
          <text class="ai-tip-title">AI 图像识别</text>
          <text class="ai-tip-desc">拍照或上传图片，智能识别作物病虫害</text>
        </view>
      </view>
    </view>

    <!-- 底部占位 -->
    <view class="safe-area-bottom"></view>
  </view>
</template>

<script>
import { STORAGE_KEYS, readStorage, writeStorage } from '@/core/storage.js';
import pestService from '@/services/pest-service.js';
import { getNavigationHeight } from '@/utils/navigation.js';

export default {
  data() {
    return {
      statusBarHeight: 88,
      currentDate: '',
      detectionCount: 12,
      pestCount: 3,
      accuracyRate: 95,
      detectionHistory: [
        {
          image: '/static/pest-default.png',
          title: '水稻叶枯病',
          time: '今天 14:30',
          status: '需处理'
        },
        {
          image: '/static/pest-default.png',
          title: '玉米螟虫',
          time: '今天 10:15',
          status: '已处理'
        },
        {
          image: '/static/pest-default.png',
          title: '小麦锈病',
          time: '昨天 16:45',
          status: '已处理'
        }
      ]
    }
  },

  onLoad() {
    this.initStatusBar();
    this.updateDate();
    this.loadPestHistory();
  },

  methods: {
    initStatusBar() {
      this.statusBarHeight = getNavigationHeight();
    },

    goToHome() {
      uni.switchTab({ url: '/pages/home/home' });
    },

    updateDate() {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const day = now.getDate();
      this.currentDate = `${year}年${month}月${day}日`;
    },

    async startScan() {
      try {
        const res = await uni.chooseImage({
          count: 1,
          sourceType: ['camera'],
          sizeType: ['compressed']
        });
        if (res.tempFilePaths && res.tempFilePaths.length > 0) {
          await this.analyzePestImage(res.tempFilePaths[0]);
        }
      } catch (error) {
        if (error.errMsg && error.errMsg.includes('cancel')) return;
        uni.showToast({ title: '拍照失败，请重试', icon: 'none' });
      }
    },

    async uploadImage() {
      try {
        const res = await uni.chooseImage({
          count: 1,
          sourceType: ['album'],
          sizeType: ['compressed']
        });
        if (res.tempFilePaths && res.tempFilePaths.length > 0) {
          await this.analyzePestImage(res.tempFilePaths[0]);
        }
      } catch (error) {
        if (error.errMsg && error.errMsg.includes('cancel')) return;
        uni.showToast({ title: '选择图片失败，请重试', icon: 'none' });
      }
    },

    async analyzePestImage(imagePath) {
      try {
        uni.showLoading({ title: 'AI 分析中...' });
        const result = await pestService.analyzeImage(imagePath);

        uni.hideLoading();
        this.processAnalysisResult(result);

      } catch (error) {
        uni.hideLoading();
        uni.showToast({ title: error.message || '分析失败，请重试', icon: 'none' });
      }
    },

    processAnalysisResult(result) {
      this.detectionCount++;

      if (result.hasPest) {
        this.pestCount++;
        uni.showModal({
          title: '发现病虫害',
          content: `检测到：${result.pestName}\n危害等级：${result.severity}\n置信度：${result.confidence || 0}%\n建议措施：${result.suggestion}`,
          confirmText: '知道了',
          showCancel: false
        });
      } else {
        uni.showToast({
          title: '未发现病虫害',
          icon: 'success',
          duration: 2000
        });
      }

      this.savePestHistory(result);
    },

    savePestHistory(result) {
      const newItem = {
        id: Date.now(),
        image: result.imagePath || '/static/pest-default.png',
        title: result.hasPest ? result.pestName : '健康',
        time: new Date().toLocaleString('zh-CN', {
          month: 'numeric',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        status: result.hasPest ? '需处理' : '已处理',
        detail: result
      };

      this.detectionHistory.unshift(newItem);

      if (this.detectionHistory.length > 10) {
        this.detectionHistory.pop();
      }

      writeStorage(STORAGE_KEYS.pestHistory, this.detectionHistory);
    },

    loadPestHistory() {
      const history = readStorage(STORAGE_KEYS.pestHistory, []);
      if (history && Array.isArray(history)) {
        this.detectionHistory = history;
      }
    },

    viewMore() {
      uni.showToast({ title: '查看更多记录', icon: 'none' });
    }
  }
}
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
  background: linear-gradient(135deg, rgba(10, 132, 255, 0.3) 0%, rgba(10, 132, 255, 0.1) 100%);
  top: -80rpx;
  right: -80rpx;
}

.bg-blob-2 {
  width: 350rpx;
  height: 350rpx;
  background: linear-gradient(135deg, rgba(255, 69, 58, 0.2) 0%, rgba(255, 69, 58, 0.08) 100%);
  bottom: 300rpx;
  left: -100rpx;
}

/* 页面头部 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32rpx;
  position: relative;
  z-index: 1;
}

.back-btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.back-btn:active {
  transform: scale(0.95);
  background: rgba(255, 255, 255, 0.15);
}

.back-icon {
  font-size: 36rpx;
  color: #FFFFFF;
}

.page-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #FFFFFF;
}

.header-spacer {
  width: 72rpx;
}

/* 通用卡片头部 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #FFFFFF;
}

/* 统计卡片 */
.stats-card {
  padding: 28rpx;
  margin-bottom: 24rpx;
  position: relative;
  z-index: 1;
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.stats-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #FFFFFF;
}

.stats-date {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.5);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 12rpx;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20rpx;
}

.stat-icon-bg {
  width: 52rpx;
  height: 52rpx;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon {
  font-size: 26rpx;
}

.bg-scan { background: linear-gradient(135deg, rgba(10, 132, 255, 0.4) 0%, rgba(10, 132, 255, 0.15) 100%); }
.bg-pest { background: linear-gradient(135deg, rgba(255, 69, 58, 0.4) 0%, rgba(255, 69, 58, 0.15) 100%); }
.bg-accuracy { background: linear-gradient(135deg, rgba(52, 199, 89, 0.4) 0%, rgba(52, 199, 89, 0.15) 100%); }

.stat-info {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 36rpx;
  font-weight: 700;
  color: #FFFFFF;
}

.stat-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 4rpx;
}

/* 快捷操作 */
.action-card {
  padding: 28rpx;
  margin-bottom: 24rpx;
  position: relative;
  z-index: 1;
}

.action-buttons {
  display: flex;
  gap: 16rpx;
}

.action-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 28rpx 20rpx;
  border-radius: 20rpx;
  transition: all 0.3s;
}

.action-btn.primary {
  background: linear-gradient(135deg, rgba(52, 199, 89, 0.25) 0%, rgba(52, 199, 89, 0.1) 100%);
  border: 1rpx solid rgba(52, 199, 89, 0.3);
}

.action-btn.secondary {
  background: rgba(255, 255, 255, 0.06);
  border: 1rpx solid rgba(255, 255, 255, 0.1);
}

.btn-hover {
  transform: scale(0.97);
  opacity: 0.8;
}

.action-icon-bg {
  width: 64rpx;
  height: 64rpx;
  border-radius: 18rpx;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-icon {
  font-size: 32rpx;
}

.action-text {
  font-size: 28rpx;
  color: #FFFFFF;
  font-weight: 500;
}

/* 检测记录 */
.history-card {
  padding: 28rpx;
  margin-bottom: 24rpx;
  position: relative;
  z-index: 1;
}

.view-more {
  font-size: 26rpx;
  color: #34C759;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20rpx;
  transition: all 0.3s;
}

.history-item:active {
  background: rgba(255, 255, 255, 0.08);
}

.history-image-wrapper {
  position: relative;
  width: 120rpx;
  height: 120rpx;
  border-radius: 16rpx;
  overflow: hidden;
  flex-shrink: 0;
}

.history-image {
  width: 100%;
  height: 100%;
}

.history-badge {
  position: absolute;
  bottom: 8rpx;
  left: 8rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  font-size: 20rpx;
  font-weight: 500;
}

.history-badge.warning {
  background: rgba(255, 159, 10, 0.9);
  color: #FFFFFF;
}

.history-badge.success {
  background: rgba(52, 199, 89, 0.9);
  color: #FFFFFF;
}

.history-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.history-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #FFFFFF;
}

.history-time {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.4);
}

.history-arrow {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.3);
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60rpx 0;
  gap: 16rpx;
}

.empty-icon {
  font-size: 48rpx;
}

.empty-text {
  font-size: 26rpx;
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

/* 底部安全区域 */
.safe-area-bottom {
  height: calc(env(safe-area-inset-bottom) + 40rpx);
}
</style>
