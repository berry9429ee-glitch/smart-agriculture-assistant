<template>
  <view class="container" :style="{ paddingTop: statusBarHeight + 'px' }">
    <!-- 背景装饰 -->
    <view class="bg-decoration">
      <view class="bg-blob bg-blob-1"></view>
      <view class="bg-blob bg-blob-2"></view>
    </view>

    <!-- 页面头部 -->
    <view class="page-header">
      <text class="page-title">生长监测</text>
      <view class="time-badge glass-card-light">
        <text class="time-icon">🕐</text>
        <text class="time-text">{{ currentTime }}</text>
      </view>
    </view>

    <!-- 实时数据卡片 -->
    <view class="data-card glass-card">
      <view class="card-header">
        <text class="card-title">实时监测数据</text>
        <view class="status-indicator" :class="connectionStatus">
          <view class="indicator-dot"></view>
          <text class="indicator-text">{{ connectionStatus === 'online' ? '在线' : '离线' }}</text>
        </view>
      </view>

      <view class="sensors-grid">
        <view v-for="item in displayList" :key="item.key" class="sensor-item">
          <view class="sensor-icon-bg" :class="'bg-' + item.key">
            <text class="sensor-icon">{{ item.icon }}</text>
          </view>
          <view class="sensor-info">
            <text class="sensor-value">{{ item.value }}<text class="sensor-unit">{{ item.unit || '' }}</text></text>
            <text class="sensor-label">{{ item.label }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 趋势预测卡片 -->
    <view class="chart-card glass-card">
      <view class="chart-header">
        <text class="chart-title">24小时趋势预测</text>
        <view class="chart-tabs">
          <view
            v-for="tab in chartTabs"
            :key="tab.key"
            :class="['tab-item', { active: currentChart === tab.key }]"
            @click="switchChart(tab.key)"
          >
            {{ tab.name }}
          </view>
        </view>
      </view>

      <view class="chart-wrapper">
        <canvas
          canvas-id="trendChart"
          id="trendChart"
          class="chart-canvas"
        ></canvas>

        <!-- 预测信息浮层 -->
        <view class="prediction-panel glass-card-light" v-if="showPrediction">
          <view class="prediction-row">
            <view class="pred-item">
              <text class="pred-label">当前</text>
              <text class="pred-value">{{ currentValue }}</text>
            </view>
            <view class="pred-divider"></view>
            <view class="pred-item">
              <text class="pred-label">6h后</text>
              <text class="pred-value" :class="trendClass">{{ predictedValue }}</text>
            </view>
            <view class="pred-divider"></view>
            <view class="pred-item">
              <text class="pred-label">趋势</text>
              <text class="pred-trend" :class="trendClass">{{ trendText }}</text>
            </view>
          </view>
          <view class="confidence-row">
            <text class="confidence-text">置信度 {{ predictionConfidence }}%</text>
          </view>
        </view>
      </view>

      <!-- 预测建议 -->
      <view class="suggestion-bar" v-if="suggestion">
        <text class="suggestion-icon">💡</text>
        <text class="suggestion-text">{{ suggestion }}</text>
      </view>
    </view>

    <!-- 状态警告卡片 -->
    <view class="alert-card" :class="alertCardClass">
      <view class="alert-header">
        <view class="alert-title-row">
          <text class="alert-icon">{{ monitorData.status === '正常' ? '✅' : '⚠️' }}</text>
          <text class="alert-title">生长状态</text>
        </view>
        <view class="alert-badge" :class="alertBadgeClass">
          {{ monitorData.status }}
        </view>
      </view>
      <text class="alert-message">{{ monitorData.alert }}</text>
    </view>

    <!-- 底部占位 -->
    <view class="tab-bar-placeholder"></view>
  </view>
</template>

<script>
import { evaluateSensorStatus, getSensorAlerts } from '@/domain/sensor-data.js';
import TrendPredictor from '@/domain/trend-predictor.js';
import deviceService from '@/services/device-service.js';
import { getNavigationHeight } from '@/utils/navigation.js';

const predictor = new TrendPredictor();

export default {
  data() {
    return {
      statusBarHeight: 88,
      currentTime: '',
      connectionStatus: 'online',
      monitorData: {
        temperature: 0,
        humidity: 0,
        ph: 0,
        light: 0,
        status: '正常',
        alert: '正在获取数据...'
      },
      displayList: [],

      chartTabs: [
        { key: 'temperature', name: '温度', unit: '°C' },
        { key: 'humidity', name: '湿度', unit: '%' },
        { key: 'ph', name: 'pH', unit: '' },
        { key: 'ec', name: 'EC', unit: 'μS/cm' }
      ],
      currentChart: 'temperature',
      currentChartName: '温度',
      chartContext: null,

      showPrediction: true,
      currentValue: '--',
      predictedValue: '--',
      trendText: '稳定',
      trendClass: 'stable',
      predictionConfidence: 85,
      suggestion: '',

      refreshTimer: null,
      chartTimer: null,
      clockTimer: null,
      hasShownDeviceBindTip: false
    }
  },

  computed: {
    alertCardClass() {
      return this.monitorData.status === '正常' ? 'alert-success' : 'alert-warning';
    },
    alertBadgeClass() {
      return this.monitorData.status === '正常' ? 'badge-success' : 'badge-warning';
    }
  },

  onLoad() {
    this.initStatusBar();
    this.loadSensors();
    this.updateTime();
    this.clockTimer = setInterval(this.updateTime, 1000);

    setTimeout(() => {
      this.initChart();
    }, 500);

    this.refreshTimer = setInterval(() => {
      this.loadSensors();
    }, 30000);

    this.chartTimer = setInterval(() => {
      this.updateChart();
    }, 60000);
  },

  onHide() {
    if (this.clockTimer) { clearInterval(this.clockTimer); this.clockTimer = null; }
    if (this.refreshTimer) { clearInterval(this.refreshTimer); this.refreshTimer = null; }
    if (this.chartTimer) { clearInterval(this.chartTimer); this.chartTimer = null; }
  },
  onShow() {
    if (!this.clockTimer) this.clockTimer = setInterval(this.updateTime, 1000);
    if (!this.refreshTimer) {
      this.refreshTimer = setInterval(() => { this.loadSensors(); }, 30000);
      this.loadSensors();
    }
    if (!this.chartTimer) this.chartTimer = setInterval(() => { this.updateChart(); }, 60000);
  },
  onUnload() {
    if (this.clockTimer) { clearInterval(this.clockTimer); this.clockTimer = null; }
    if (this.refreshTimer) { clearInterval(this.refreshTimer); this.refreshTimer = null; }
    if (this.chartTimer) { clearInterval(this.chartTimer); this.chartTimer = null; }
  },

  methods: {
    initStatusBar() {
      this.statusBarHeight = getNavigationHeight();
    },

    async loadSensors() {
      try {
        const data = await deviceService.getSensorData();
        const alerts = getSensorAlerts(data);
        this.connectionStatus = 'online';

        this.displayList = [
          { key: 'temp', icon: '🌡️', label: '温度', value: data.temperature ?? '--', unit: '°C' },
          { key: 'moi', icon: '💧', label: '湿度', value: data.moisture ?? '--', unit: '%' },
          { key: 'ph', icon: '🧪', label: 'pH值', value: data.ph ?? '--' },
          { key: 'ec', icon: '⚡', label: '电导率', value: data.ec ?? '--', unit: 'μS/cm' },
          { key: 'np', icon: '🌱', label: '氮(N)', value: data.nitrogen ?? '--', unit: 'mg/kg' },
          { key: 'pho', icon: '💎', label: '磷(P)', value: data.phosphorus ?? '--', unit: 'mg/kg' }
        ];

        this.monitorData = {
          temperature: data.temperature,
          humidity: data.moisture,
          ph: data.ph,
          ec: data.ec,
          status: evaluateSensorStatus(data),
          alert: alerts.length > 0
            ? `检测到异常：${alerts.join('、')}，请及时处理。`
            : '当前生长环境适宜，继续保持。'
        };

        predictor.addData('temperature', data.temperature);
        predictor.addData('humidity', data.moisture);
        predictor.addData('ph', data.ph);
        predictor.addData('ec', data.ec);

        this.updateChart();

      } catch (e) {
        this.connectionStatus = 'offline';
        if (e.message && e.message.includes('绑定设备')) {
          this.monitorData.status = '未绑定';
          this.monitorData.alert = '请先绑定自己的硬件设备';
          if (!this.hasShownDeviceBindTip) {
            this.hasShownDeviceBindTip = true;
            uni.showModal({
              title: '未绑定设备',
              content: '绑定 OneNET 设备后，监测页会显示你的实时植物数据。',
              confirmText: '去绑定',
              cancelText: '稍后',
              success: (res) => {
                if (res.confirm) {
                  uni.navigateTo({ url: '/pages/device-bind/device-bind' });
                }
              }
            });
          }
          return;
        }
        this.monitorData.alert = '数据获取失败';
        this.useMockData();
      }
    },

    useMockData() {
      const mockData = {
        temp: 22 + Math.random() * 5,
        moi: 55 + Math.random() * 15,
        PH: 6.5 + Math.random() * 0.5,
        EC: 1200 + Math.random() * 300
      };

      predictor.generateSyntheticHistory('temperature', mockData.temp);
      predictor.generateSyntheticHistory('humidity', mockData.moi);
      predictor.generateSyntheticHistory('ph', mockData.PH);
      predictor.generateSyntheticHistory('ec', mockData.EC);

      this.updateChart();
    },

    initChart() {
      this.chartContext = uni.createCanvasContext('trendChart', this);
      this.updateChart();
    },

    updateChart() {
      if (!this.chartContext) return;

      const chartConfig = this.chartTabs.find(t => t.key === this.currentChart);
      if (!chartConfig) return;

      const query = uni.createSelectorQuery().in(this);
      query.select('#trendChart').boundingClientRect(rect => {
        if (rect) {
          this.drawChart(rect.width, rect.height, chartConfig);
        }
      }).exec();
    },

    drawChart(width, height, config) {
      const ctx = this.chartContext;
      const padding = { top: 20, right: 20, bottom: 30, left: 40 };
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;

      ctx.clearRect(0, 0, width, height);

      let historyData = predictor.historyData[config.key] || [];
      if (historyData.length === 0) {
        const currentValue = this.getCurrentValue(config.key);
        predictor.generateSyntheticHistory(config.key, currentValue);
        historyData = predictor.historyData[config.key];
      }

      const predictions = predictor.predict(config.key);
      const allData = [...historyData, ...predictions];
      if (allData.length === 0) return;

      const values = allData.map(d => d.value);
      const minValue = Math.min(...values) * 0.9;
      const maxValue = Math.max(...values) * 1.1;
      const valueRange = Math.max(maxValue - minValue, 1);
      const pointDivisor = Math.max(allData.length - 1, 1);

      // 绘制网格线
      ctx.setStrokeStyle('rgba(255, 255, 255, 0.1)');
      ctx.setLineWidth(1);

      for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();

        const value = maxValue - (valueRange / 5) * i;
        ctx.setFillStyle('rgba(255, 255, 255, 0.4)');
        ctx.setFontSize(10);
        ctx.fillText(value.toFixed(1), 5, y + 3);
      }

      // 绘制历史数据曲线
      if (historyData.length > 0) {
        ctx.setStrokeStyle('#34C759');
        ctx.setLineWidth(2);
        ctx.beginPath();

        historyData.forEach((point, index) => {
          const x = padding.left + (chartWidth / pointDivisor) * index;
          const y = padding.top + chartHeight - ((point.value - minValue) / valueRange) * chartHeight;

          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });

        ctx.stroke();

        // 渐变填充
        const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
        gradient.addColorStop(0, 'rgba(52, 199, 89, 0.3)');
        gradient.addColorStop(1, 'rgba(52, 199, 89, 0.02)');
        ctx.setFillStyle(gradient);

        ctx.lineTo(padding.left + (chartWidth / pointDivisor) * (historyData.length - 1), height - padding.bottom);
        ctx.lineTo(padding.left, height - padding.bottom);
        ctx.closePath();
        ctx.fill();
      }

      // 绘制预测曲线
      if (predictions.length > 0) {
        ctx.setStrokeStyle('#FF9F0A');
        ctx.setLineWidth(2);
        ctx.setLineDash([5, 5]);
        ctx.beginPath();

        if (historyData.length > 0) {
          const lastHistoryPoint = historyData[historyData.length - 1];
          const x = padding.left + (chartWidth / pointDivisor) * (historyData.length - 1);
          const y = padding.top + chartHeight - ((lastHistoryPoint.value - minValue) / valueRange) * chartHeight;
          ctx.moveTo(x, y);
        }

        predictions.forEach((point, index) => {
          const x = padding.left + (chartWidth / pointDivisor) * (historyData.length + index);
          const y = padding.top + chartHeight - ((point.value - minValue) / valueRange) * chartHeight;
          ctx.lineTo(x, y);
        });

        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 当前时间标记线
      if (historyData.length > 0) {
        const currentX = padding.left + (chartWidth / pointDivisor) * (historyData.length - 1);
        ctx.setStrokeStyle('#FF453A');
        ctx.setLineWidth(1);
        ctx.beginPath();
        ctx.moveTo(currentX, padding.top);
        ctx.lineTo(currentX, height - padding.bottom);
        ctx.stroke();
      }

      ctx.draw();
      this.updatePredictionInfo(config);
    },

    getCurrentValue(key) {
      const valueMap = {
        temperature: this.monitorData.temperature || 22,
        humidity: this.monitorData.humidity || 60,
        ph: this.monitorData.ph || 6.5,
        ec: this.monitorData.ec || 1200
      };
      return valueMap[key] || 0;
    },

    updatePredictionInfo(config) {
      const historyData = predictor.historyData[config.key];
      const predictions = predictor.predict(config.key);

      if (historyData && historyData.length > 0) {
        const current = historyData[historyData.length - 1].value;
        this.currentValue = `${current.toFixed(1)}${config.unit}`;

        if (predictions && predictions.length > 0) {
          const future = predictions[predictions.length - 1].value;
          this.predictedValue = `${future.toFixed(1)}${config.unit}`;

          const change = future - current;
          const changePercent = Math.abs(change / (current || 1) * 100);

          if (changePercent < 2) {
            this.trendText = '→ 稳定';
            this.trendClass = 'stable';
            this.suggestion = this.getSuggestion(config.key, 'stable');
          } else if (change > 0) {
            this.trendText = `↑ ${changePercent.toFixed(1)}%`;
            this.trendClass = 'up';
            this.suggestion = this.getSuggestion(config.key, 'up');
          } else {
            this.trendText = `↓ ${changePercent.toFixed(1)}%`;
            this.trendClass = 'down';
            this.suggestion = this.getSuggestion(config.key, 'down');
          }
        }

        this.predictionConfidence = predictor.getConfidence(config.key);
      }
    },

    getSuggestion(type, trend) {
      const suggestions = {
        temperature: {
          up: '温度将升高，建议增加通风或适当遮阴',
          down: '温度将降低，注意保温措施',
          stable: '温度稳定，环境适宜'
        },
        humidity: {
          up: '湿度将升高，减少浇水频率',
          down: '湿度将降低，适当增加喷雾',
          stable: '湿度适宜，保持现状'
        },
        ph: {
          up: 'pH值将升高，可适当添加酸性肥料',
          down: 'pH值将降低，可添加石灰调节',
          stable: 'pH值稳定，土壤状态良好'
        },
        ec: {
          up: '电导率升高，注意盐分积累',
          down: '电导率降低，可适当施肥',
          stable: '电导率正常，营养充足'
        }
      };

      return suggestions[type]?.[trend] || '继续监测数据变化';
    },

    switchChart(key) {
      this.currentChart = key;
      const tab = this.chartTabs.find(t => t.key === key);
      this.currentChartName = tab ? tab.name : '';
      this.updateChart();
    },

    updateTime() {
      const now = new Date();
      this.currentTime = now.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
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
  width: 450rpx;
  height: 450rpx;
  background: linear-gradient(135deg, rgba(52, 199, 89, 0.3) 0%, rgba(48, 209, 88, 0.1) 100%);
  top: -100rpx;
  right: -100rpx;
}

.bg-blob-2 {
  width: 350rpx;
  height: 350rpx;
  background: linear-gradient(135deg, rgba(10, 132, 255, 0.25) 0%, rgba(64, 156, 255, 0.08) 100%);
  bottom: 300rpx;
  left: -80rpx;
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

.time-badge {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 20rpx;
}

.time-icon {
  font-size: 24rpx;
}

.time-text {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
  font-family: 'SF Mono', monospace;
}

/* 数据卡片 */
.data-card {
  padding: 32rpx;
  margin-bottom: 28rpx;
  position: relative;
  z-index: 1;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28rpx;
}

.card-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #FFFFFF;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 16rpx;
  border-radius: 20rpx;
  background: rgba(52, 199, 89, 0.2);
}

.status-indicator.online {
  background: rgba(52, 199, 89, 0.2);
}

.status-indicator.offline {
  background: rgba(255, 69, 58, 0.2);
}

.indicator-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #34C759;
  animation: pulse 2s infinite;
}

.status-indicator.offline .indicator-dot {
  background: #FF453A;
  animation: none;
}

.indicator-text {
  font-size: 22rpx;
  color: #34C759;
}

.status-indicator.offline .indicator-text {
  color: #FF453A;
}

/* 传感器网格 */
.sensors-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.sensor-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.06);
}

.sensor-icon-bg {
  width: 52rpx;
  height: 52rpx;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sensor-icon {
  font-size: 26rpx;
}

.bg-temp { background: linear-gradient(135deg, rgba(255, 69, 58, 0.35) 0%, rgba(255, 69, 58, 0.15) 100%); }
.bg-moi { background: linear-gradient(135deg, rgba(10, 132, 255, 0.35) 0%, rgba(10, 132, 255, 0.15) 100%); }
.bg-ph { background: linear-gradient(135deg, rgba(175, 82, 222, 0.35) 0%, rgba(175, 82, 222, 0.15) 100%); }
.bg-ec { background: linear-gradient(135deg, rgba(255, 159, 10, 0.35) 0%, rgba(255, 159, 10, 0.15) 100%); }
.bg-np { background: linear-gradient(135deg, rgba(52, 199, 89, 0.35) 0%, rgba(52, 199, 89, 0.15) 100%); }
.bg-pho { background: linear-gradient(135deg, rgba(100, 210, 255, 0.35) 0%, rgba(100, 210, 255, 0.15) 100%); }

.sensor-info {
  display: flex;
  flex-direction: column;
}

.sensor-value {
  font-size: 32rpx;
  font-weight: 700;
  color: #FFFFFF;
}

.sensor-unit {
  font-size: 22rpx;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.5);
}

.sensor-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 2rpx;
}

/* 图表卡片 */
.chart-card {
  padding: 32rpx;
  margin-bottom: 28rpx;
  position: relative;
  z-index: 1;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.chart-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #FFFFFF;
}

.chart-tabs {
  display: flex;
  gap: 8rpx;
}

.tab-item {
  padding: 8rpx 16rpx;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12rpx;
  transition: all 0.3s;
}

.tab-item.active {
  color: #FFFFFF;
  background: linear-gradient(135deg, #34C759 0%, #30D158 100%);
}

.chart-wrapper {
  position: relative;
  height: 360rpx;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 20rpx;
  overflow: hidden;
  margin-bottom: 20rpx;
}

.chart-canvas {
  width: 100%;
  height: 100%;
}

/* 预测面板 */
.prediction-panel {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  padding: 16rpx 20rpx;
  min-width: 320rpx;
}

.prediction-row {
  display: flex;
  align-items: center;
  justify-content: space-around;
}

.pred-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.pred-label {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 4rpx;
}

.pred-value {
  font-size: 26rpx;
  font-weight: 600;
  color: #FFFFFF;
}

.pred-trend {
  font-size: 24rpx;
  font-weight: 500;
}

.pred-divider {
  width: 1rpx;
  height: 36rpx;
  background: rgba(255, 255, 255, 0.1);
}

.confidence-row {
  margin-top: 12rpx;
  padding-top: 12rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.1);
  text-align: center;
}

.confidence-text {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.4);
}

/* 趋势颜色 */
.up { color: #FF6B6B; }
.down { color: #4ECDC4; }
.stable { color: #34C759; }

/* 建议条 */
.suggestion-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 20rpx;
  background: rgba(52, 199, 89, 0.1);
  border-radius: 16rpx;
  border: 1rpx solid rgba(52, 199, 89, 0.15);
}

.suggestion-icon {
  font-size: 28rpx;
}

.suggestion-text {
  flex: 1;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.7);
}

/* 警告卡片 */
.alert-card {
  padding: 28rpx;
  border-radius: 24rpx;
  position: relative;
  z-index: 1;
}

.alert-success {
  background: rgba(52, 199, 89, 0.12);
  border: 1rpx solid rgba(52, 199, 89, 0.2);
}

.alert-warning {
  background: rgba(255, 159, 10, 0.12);
  border: 1rpx solid rgba(255, 159, 10, 0.2);
}

.alert-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.alert-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.alert-icon {
  font-size: 32rpx;
}

.alert-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #FFFFFF;
}

.alert-badge {
  padding: 8rpx 20rpx;
  border-radius: 16rpx;
  font-size: 24rpx;
  font-weight: 500;
}

.badge-success {
  background: rgba(52, 199, 89, 0.25);
  color: #34C759;
}

.badge-warning {
  background: rgba(255, 159, 10, 0.25);
  color: #FF9F0A;
}

.alert-message {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.5;
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
