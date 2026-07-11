<template>
  <view class="container" :style="{ paddingTop: statusBarHeight + 'px' }">
    <!-- 背景装饰 -->
    <view class="bg-decoration">
      <view class="bg-blob bg-blob-1"></view>
      <view class="bg-blob bg-blob-2"></view>
    </view>

    <!-- 页面头部 -->
    <view class="page-header">
      <text class="page-title">智能选苗</text>
      <view class="device-badge" :class="deviceStatus === 'online' ? 'online' : 'offline'">
        <view class="device-dot"></view>
        <text class="device-text">{{ deviceStatus === 'online' ? 'ESP32 已连接' : '设备离线' }}</text>
      </view>
    </view>

    <!-- 土壤数据卡片 -->
    <view class="soil-card glass-card">
      <view class="card-header">
        <text class="card-title">土壤参数</text>
      </view>
      <view class="soil-grid">
        <view class="soil-item" :class="{'warning': soilData.ph < 5.5 || soilData.ph > 7.5}">
          <view class="soil-icon-bg bg-ph">
            <text class="soil-icon">🧪</text>
          </view>
          <view class="soil-info">
            <text class="soil-value">{{ soilData.ph }}</text>
            <text class="soil-label">土壤pH值</text>
          </view>
        </view>

        <view class="soil-item" :class="{'warning': parseInt(soilData.moisture) < 40}">
          <view class="soil-icon-bg bg-moisture">
            <text class="soil-icon">💧</text>
          </view>
          <view class="soil-info">
            <text class="soil-value">{{ soilData.moisture }}</text>
            <text class="soil-label">土壤湿度</text>
          </view>
        </view>

        <view class="soil-item" :class="{'warning': parseInt(soilData.temperature) > 30}">
          <view class="soil-icon-bg bg-temp">
            <text class="soil-icon">🌡️</text>
          </view>
          <view class="soil-info">
            <text class="soil-value">{{ soilData.temperature }}</text>
            <text class="soil-label">土壤温度</text>
          </view>
        </view>

        <view class="soil-item">
          <view class="soil-icon-bg bg-status">
            <text class="soil-icon">🌱</text>
          </view>
          <view class="soil-info">
            <text class="soil-value status-text">{{ soilData.status }}</text>
            <text class="soil-label">土壤状态</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 分析模型选择 -->
    <view class="model-section glass-card">
      <view class="card-header">
        <text class="card-title">分析模型</text>
      </view>
      <view class="model-options">
        <view class="model-option active" @click="switchModel('basic')">
          <view class="model-icon-bg">
            <text class="model-icon">📊</text>
          </view>
          <text class="model-name">基础模型</text>
        </view>
        <view class="model-option" @click="goToEvaluation">
          <view class="model-icon-bg ai">
            <text class="model-icon">🤖</text>
          </view>
          <text class="model-name">通义千问</text>
          <view class="ai-badge">AI</view>
        </view>
      </view>
    </view>

    <!-- AI 分析结果 -->
    <view class="result-card glass-card">
      <view class="card-header">
        <view class="result-title-row">
          <text class="result-icon">🌱</text>
          <text class="card-title">选苗分析结果</text>
        </view>
        <view class="analyzing-badge" v-if="isAnalyzing">
          <view class="analyzing-dot"></view>
          <text class="analyzing-text">分析中</text>
        </view>
      </view>

      <view class="result-content">
        <view v-if="isAnalyzing" class="loading-state">
          <text class="loading-text">AI 正在分析土壤数据...</text>
        </view>
        <view v-else-if="analysisResult" class="analysis-text">
          <text>{{ analysisResult }}</text>
        </view>
        <view v-else class="empty-state">
          <text class="empty-icon">💡</text>
          <text class="empty-text">点击「通义千问」开始 AI 分析</text>
        </view>
      </view>

      <!-- 基础建议 -->
      <view class="basic-suggestions" v-if="!analysisResult && !isAnalyzing">
        <text class="suggestions-title">基础选苗建议</text>
        <view class="suggestion-item">
          <text class="suggestion-icon">📏</text>
          <text class="suggestion-text">株高：15-20cm</text>
        </view>
        <view class="suggestion-item">
          <text class="suggestion-icon">🍃</text>
          <text class="suggestion-text">叶片数：4-6片</text>
        </view>
        <view class="suggestion-item">
          <text class="suggestion-icon">🌿</text>
          <text class="suggestion-text">根系发育：良好</text>
        </view>
      </view>
    </view>

    <!-- 病虫害风险 -->
    <view class="risk-card glass-card-light">
      <view class="card-header">
        <view class="result-title-row">
          <text class="result-icon">🐛</text>
          <text class="card-title">病虫害风险</text>
        </view>
      </view>
      <view class="risk-grid">
        <view class="risk-item">
          <text class="risk-icon">⚠️</text>
          <text class="risk-value low">低</text>
          <text class="risk-label">病害风险</text>
        </view>
        <view class="risk-item">
          <text class="risk-icon">🐜</text>
          <text class="risk-value low">低</text>
          <text class="risk-label">虫害风险</text>
        </view>
      </view>
      <view class="risk-advice">
        <text class="advice-icon">✅</text>
        <text class="advice-text">防治建议：常规预防即可，无需特殊处理。</text>
      </view>
    </view>

    <!-- 开始分析按钮 -->
    <button class="start-btn glass-btn-primary" @click="startNewAnalysis" hover-class="btn-hover">
      <text class="btn-icon">🔄</text>
      <text class="btn-text">开始新一轮分析</text>
    </button>

    <!-- 历史记录 -->
    <view class="history-section glass-card" v-if="analysisHistory.length > 0">
      <view class="card-header">
        <text class="card-title">历史分析</text>
      </view>
      <view class="history-list">
        <view class="history-item" v-for="(item, index) in analysisHistory" :key="index">
          <view class="history-info">
            <text class="history-date">{{ item.date }}</text>
            <text class="history-samples">分析样本：{{ item.samples }}株</text>
          </view>
          <view class="history-score">
            <text class="score-value">{{ item.source }}</text>
            <text class="score-label">分析来源</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部占位 -->
    <view class="tab-bar-placeholder"></view>
  </view>
</template>

<script>
import aiService from '@/services/ai-service.js';
import deviceService from '@/services/device-service.js';
import { getNavigationHeight } from '@/utils/navigation.js';

export default {
  data() {
    return {
      statusBarHeight: 88,
      soilData: { ph: '--', moisture: '--', temperature: '--', status: '--' },
      deviceStatus: 'offline',
      analysisResult: '',
      isAnalyzing: false,
      analysisHistory: [],
      // 预设默认土壤数据，用于 AI 分析兜底
      defaultSoilData: {
        ph: 6.5,
        moisture: 50,
        temperature: 25,
        status: '良好'
      }
    }
  },

  onLoad() {
    this.initStatusBar();
    this.fetchSoilData();
  },

  onUnload() {
    uni.$off('esp32-data');
  },

  methods: {
    initStatusBar() {
      this.statusBarHeight = getNavigationHeight();
    },

    async fetchSoilData() {
      try {
        const data = await deviceService.getSoilSnapshot();
        this.soilData = {
          ph: (data.ph || '--').toFixed ? data.ph.toFixed(2) : data.ph,
          moisture: (data.moisture || '--').toFixed ? data.moisture.toFixed(0) + '%' : data.moisture,
          temperature: (data.temperature || '--').toFixed ? data.temperature.toFixed(1) + '°C' : data.temperature,
          status: data.status || '--'
        };
        this.deviceStatus = 'online';
      } catch (e) {
        this.deviceStatus = 'offline';
        if (e.message && e.message.includes('绑定设备')) {
          uni.showModal({
            title: '未绑定设备',
            content: '绑定设备后，可以用你的真实土壤数据进行选苗分析。',
            confirmText: '去绑定',
            cancelText: '稍后',
            success: (res) => {
              if (res.confirm) {
                uni.navigateTo({ url: '/pages/device-bind/device-bind' });
              }
            }
          });
        } else {
          uni.showToast({
            title: '获取土壤数据失败，使用默认参数分析',
            icon: 'none'
          });
        }
      }
    },

    async goToEvaluation() {
      if (this.isAnalyzing) {
        uni.showToast({
          title: '正在分析中，请稍候...',
          icon: 'none'
        });
        return;
      }

      this.analysisResult = "";
      this.isAnalyzing = true;

      uni.showLoading({
        title: '通义千问分析中...',
        mask: true
      });

      try {
        // 使用通义千问服务
        const safeData = this.soilData || {};
        const soilData = {
          ph: isNaN(parseFloat(safeData.ph)) ? this.defaultSoilData.ph : parseFloat(safeData.ph),
          moisture: isNaN(parseInt(safeData.moisture)) ? this.defaultSoilData.moisture : parseInt(safeData.moisture),
          temperature: isNaN(parseFloat(safeData.temperature)) ? this.defaultSoilData.temperature : parseFloat(safeData.temperature),
          status: safeData.status || this.defaultSoilData.status
        };

        const result = await aiService.analyzeSoil(soilData);
        this.analysisResult = result.analysis;
        this.saveAnalysisHistory(result);

        uni.hideLoading();
        this.isAnalyzing = false;

      } catch (error) {
        uni.hideLoading();
        uni.showToast({
          title: error.message || '分析失败，请重试',
          icon: 'none'
        });
        this.isAnalyzing = false;
      }
    },

    saveAnalysisHistory(result) {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];

      this.analysisHistory.unshift({
        date: dateStr,
        samples: 1,
        source: result.sourceLabel,
        result: result.analysis.substring(0, 50) + '...'
      });

      if (this.analysisHistory.length > 5) {
        this.analysisHistory.pop();
      }
    },

    switchModel(model) {
      uni.showToast({
        title: '已切换到' + (model === 'basic' ? '基础模型' : '通义千问'),
        icon: 'none'
      });
    },

    startNewAnalysis() {
      if (this.isAnalyzing) {
        uni.showToast({
          title: '正在分析中，请稍后再试',
          icon: 'none'
        });
        return;
      }
      this.fetchSoilData();
      uni.showToast({
        title: '数据已刷新',
        icon: 'success'
      });
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
  background: linear-gradient(135deg, rgba(255, 159, 10, 0.3) 0%, rgba(255, 159, 10, 0.1) 100%);
  top: -80rpx;
  right: -80rpx;
}

.bg-blob-2 {
  width: 350rpx;
  height: 350rpx;
  background: linear-gradient(135deg, rgba(52, 199, 89, 0.25) 0%, rgba(52, 199, 89, 0.08) 100%);
  bottom: 400rpx;
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

.page-title {
  font-size: 48rpx;
  font-weight: 700;
  color: #FFFFFF;
}

.device-badge {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 10rpx 20rpx;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.1);
}

.device-badge.online {
  background: rgba(52, 199, 89, 0.2);
}

.device-badge.offline {
  background: rgba(255, 69, 58, 0.2);
}

.device-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #34C759;
  animation: pulse 2s infinite;
}

.device-badge.offline .device-dot {
  background: #FF453A;
  animation: none;
}

.device-text {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.8);
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

/* 土壤数据卡片 */
.soil-card {
  padding: 28rpx;
  margin-bottom: 24rpx;
  position: relative;
  z-index: 1;
}

.soil-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.soil-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.06);
  transition: all 0.3s;
}

.soil-item.warning {
  background: rgba(255, 159, 10, 0.15);
  border-color: rgba(255, 159, 10, 0.3);
}

.soil-icon-bg {
  width: 52rpx;
  height: 52rpx;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.soil-icon {
  font-size: 26rpx;
}

.bg-ph { background: linear-gradient(135deg, rgba(175, 82, 222, 0.4) 0%, rgba(175, 82, 222, 0.15) 100%); }
.bg-moisture { background: linear-gradient(135deg, rgba(10, 132, 255, 0.4) 0%, rgba(10, 132, 255, 0.15) 100%); }
.bg-temp { background: linear-gradient(135deg, rgba(255, 69, 58, 0.4) 0%, rgba(255, 69, 58, 0.15) 100%); }
.bg-status { background: linear-gradient(135deg, rgba(52, 199, 89, 0.4) 0%, rgba(52, 199, 89, 0.15) 100%); }

.soil-info {
  display: flex;
  flex-direction: column;
}

.soil-value {
  font-size: 30rpx;
  font-weight: 700;
  color: #FFFFFF;
}

.status-text {
  font-size: 26rpx;
}

.soil-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 2rpx;
}

/* 模型选择 */
.model-section {
  padding: 28rpx;
  margin-bottom: 24rpx;
  position: relative;
  z-index: 1;
}

.model-options {
  display: flex;
  gap: 16rpx;
}

.model-option {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 24rpx 16rpx;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 20rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.08);
  position: relative;
  transition: all 0.3s;
}

.model-option.active {
  background: rgba(255, 159, 10, 0.2);
  border-color: rgba(255, 159, 10, 0.4);
}

.model-icon-bg {
  width: 56rpx;
  height: 56rpx;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.model-icon-bg.ai {
  background: linear-gradient(135deg, rgba(52, 199, 89, 0.4) 0%, rgba(52, 199, 89, 0.2) 100%);
}

.model-icon {
  font-size: 28rpx;
}

.model-name {
  font-size: 26rpx;
  color: #FFFFFF;
  font-weight: 500;
}

.ai-badge {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  padding: 4rpx 12rpx;
  background: linear-gradient(135deg, #34C759 0%, #30D158 100%);
  border-radius: 8rpx;
  font-size: 18rpx;
  color: #FFFFFF;
  font-weight: 600;
}

/* 分析结果卡片 */
.result-card {
  padding: 28rpx;
  margin-bottom: 24rpx;
  position: relative;
  z-index: 1;
}

.result-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.result-icon {
  font-size: 28rpx;
}

.analyzing-badge {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 6rpx 16rpx;
  background: rgba(255, 159, 10, 0.2);
  border-radius: 12rpx;
}

.analyzing-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: #FF9F0A;
  animation: pulse 1s infinite;
}

.analyzing-text {
  font-size: 22rpx;
  color: #FF9F0A;
}

.result-content {
  min-height: 160rpx;
  padding: 20rpx;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 16rpx;
  margin-bottom: 20rpx;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 120rpx;
}

.loading-text {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.5);
}

.analysis-text {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.6;
  max-height: 400rpx;
  overflow-y: auto;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 120rpx;
  gap: 12rpx;
}

.empty-icon {
  font-size: 36rpx;
}

.empty-text {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.4);
}

/* 基础建议 */
.basic-suggestions {
  padding-top: 16rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.08);
}

.suggestions-title {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.5);
  display: block;
  margin-bottom: 16rpx;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 0;
}

.suggestion-icon {
  font-size: 24rpx;
}

.suggestion-text {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.7);
}

/* 风险卡片 */
.risk-card {
  padding: 28rpx;
  margin-bottom: 24rpx;
  position: relative;
  z-index: 1;
}

.risk-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.risk-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 20rpx;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16rpx;
}

.risk-icon {
  font-size: 28rpx;
}

.risk-value {
  font-size: 32rpx;
  font-weight: 700;
}

.risk-value.low {
  color: #34C759;
}

.risk-value.medium {
  color: #FF9F0A;
}

.risk-value.high {
  color: #FF453A;
}

.risk-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.4);
}

.risk-advice {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 20rpx;
  background: rgba(52, 199, 89, 0.1);
  border-radius: 12rpx;
}

.advice-icon {
  font-size: 24rpx;
}

.advice-text {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.7);
}

/* 开始分析按钮 */
.start-btn {
  width: 100%;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  border-radius: 24rpx;
  margin-bottom: 24rpx;
  position: relative;
  z-index: 1;
}

.start-btn::after {
  border: none;
}

.btn-icon {
  font-size: 28rpx;
}

.btn-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #FFFFFF;
}

.btn-hover {
  transform: scale(0.98);
  opacity: 0.9;
}

/* 历史记录 */
.history-section {
  padding: 28rpx;
  margin-bottom: 24rpx;
  position: relative;
  z-index: 1;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16rpx;
}

.history-info {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.history-date {
  font-size: 26rpx;
  color: #FFFFFF;
}

.history-samples {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.4);
}

.history-score {
  text-align: right;
}

.score-value {
  font-size: 28rpx;
  color: #34C759;
  font-weight: 600;
  display: block;
}

.score-label {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.4);
}

/* 底部占位 */
.tab-bar-placeholder {
  height: calc(120rpx + env(safe-area-inset-bottom));
}

/* 动画 */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
