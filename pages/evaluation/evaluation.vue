<template>
  <view class="container">
    <!-- iOS状态栏 -->
    <view class="status-bar">
      <text class="time">9:41</text>
      <view class="status-icons">
        <text class="icon">📶</text>
        <text class="icon">📡</text>
        <text class="icon">🔋</text>
      </view>
    </view>

    <view class="header">
      <view class="back-btn" @click="goToHome">
        <text class="iconfont icon-back">←</text>
      </view>
      <text class="title">生长评估</text>
    </view>
    
    <view class="content">
      <view class="form-card">
        <view class="form-header">
          <text class="form-title">基本信息</text>
        </view>
        
        <view class="form-item">
          <text class="label">作物类型</text>
          <picker class="picker" :range="cropTypes" @change="onCropTypeChange">
            <view class="picker-value">{{selectedCropType}}</view>
          </picker>
        </view>
        
        <view class="form-item">
          <text class="label">生长阶段</text>
          <picker class="picker" :range="growthStages" @change="onGrowthStageChange">
            <view class="picker-value">{{selectedGrowthStage}}</view>
          </picker>
        </view>
        
        <view class="form-section">
          <text class="section-title">生长指标</text>
          <view class="form-item">
            <text class="label">株高(cm)</text>
            <input class="input" type="number" v-model="height" placeholder="请输入株高"/>
          </view>
          <view class="form-item">
            <text class="label">叶片数</text>
            <input class="input" type="number" v-model="leafCount" placeholder="请输入叶片数"/>
          </view>
        </view>
        
        <view class="form-section">
          <text class="section-title">环境指标</text>
          <view class="form-item">
            <text class="label">土壤湿度(%)</text>
            <input class="input" type="number" v-model="soilMoisture" placeholder="请输入土壤湿度"/>
          </view>
          <view class="form-item">
            <text class="label">光照强度(lux)</text>
            <input class="input" type="number" v-model="lightIntensity" placeholder="请输入光照强度"/>
          </view>
          <view class="form-item">
            <text class="label">温度(℃)</text>
            <input class="input" type="number" v-model="temperature" placeholder="请输入温度"/>
          </view>
        </view>
        
        <button class="submit-btn" @click="startEvaluation" hover-class="btn-hover">
          <text class="iconfont icon-start">▶</text>
          <text>开始评估</text>
        </button>
      </view>
      
      <view class="result-card" v-if="showResult">
        <view class="result-header">
          <text class="result-title">评估结果</text>
          <text class="result-score">{{evaluationScore}}分</text>
        </view>
        
        <view class="result-content">
          <view class="result-item" v-for="(item, index) in evaluationResults" :key="index">
            <text class="result-label">{{item.label}}</text>
            <text class="result-value" :class="item.status">{{item.value}}</text>
          </view>
        </view>
        
        <view class="result-suggestions">
          <text class="suggestions-title">改进建议</text>
          <view class="suggestion-item" v-for="(suggestion, index) in suggestions" :key="index">
            <text class="suggestion-icon">💡</text>
            <text class="suggestion-text">{{suggestion}}</text>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 底部安全区域 -->
    <view class="safe-area-bottom"></view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      cropTypes: ['水稻', '小麦', '玉米', '大豆'],
      selectedCropType: '水稻',
      growthStages: ['幼苗期', '生长期', '开花期', '结果期'],
      selectedGrowthStage: '生长期',
      height: '',
      leafCount: '',
      soilMoisture: '',
      lightIntensity: '',
      temperature: '',
      showResult: false,
      evaluationScore: 85,
      evaluationResults: [
        { label: '生长状态', value: '良好', status: 'success' },
        { label: '营养状况', value: '中等', status: 'warning' },
        { label: '环境适应', value: '优秀', status: 'success' }
      ],
      suggestions: [
        '建议适当增加施肥频率',
        '注意控制浇水量，避免过度灌溉',
        '可以适当增加光照时间'
      ]
    }
  },
  methods: {
    goToHome() {
      uni.switchTab({
        url: '/pages/home/home'
      });
    },
    onCropTypeChange(e) {
      this.selectedCropType = this.cropTypes[e.detail.value];
    },
    onGrowthStageChange(e) {
      this.selectedGrowthStage = this.growthStages[e.detail.value];
    },
    startEvaluation() {
      if (!this.validateForm()) {
        return;
      }
      this.showResult = true;
      uni.showToast({
        title: '评估完成',
        icon: 'success'
      });
    },
    validateForm() {
      if (!this.height || !this.leafCount || !this.soilMoisture || !this.lightIntensity || !this.temperature) {
        uni.showToast({
          title: '请填写完整信息',
          icon: 'none'
        });
        return false;
      }
      return true;
    }
  }
}
</script>

<style>
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  border-radius: 0;
  margin: 0;
  box-shadow: none;
}

/* 状态栏样式 */
.status-bar {
  height: 44px;
  padding: 0 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #333;
  font-size: 14px;
  font-weight: 600;
  background: #f5f5f5;
}

.status-icons {
  display: flex;
  gap: 5px;
}

.icon {
  font-size: 14px;
}

.header {
  height: 88rpx;
  display: flex;
  align-items: center;
  padding: 0 32rpx;
  background: #f5f5f5;
  position: relative;
  z-index: 1;
}

.title {
  font-size: 48rpx;
  font-weight: bold;
  color: #333;
  margin-left: 32rpx;
}

.back-btn {
  width: 80rpx;
  height: 80rpx;
  border-radius: 40rpx;
  background: #34C759;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 40rpx;
  transition: all 0.3s ease;
}

.back-btn:active {
  transform: scale(0.95);
}

.content {
  flex: 1;
  padding: 32rpx;
}

.form-card {
  background-color: #ffffff;
  border-radius: 32rpx;
  padding: 40rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.05);
}

.form-header {
  margin-bottom: 32rpx;
}

.form-title {
  font-size: 36rpx;
  font-weight: 500;
  color: #333333;
}

.form-item {
  margin-bottom: 24rpx;
}

.label {
  font-size: 28rpx;
  color: #666666;
  margin-bottom: 8rpx;
  display: block;
}

.picker {
  background-color: #f8f8f8;
  border-radius: 16rpx;
  padding: 24rpx;
}

.picker-value {
  font-size: 32rpx;
  color: #333333;
}

.input {
  background-color: #f8f8f8;
  border-radius: 16rpx;
  padding: 24rpx;
  font-size: 32rpx;
  color: #333333;
}

.form-section {
  margin-top: 32rpx;
  padding-top: 32rpx;
  border-top: 2rpx solid #f0f0f0;
}

.section-title {
  font-size: 32rpx;
  font-weight: 500;
  color: #333333;
  margin-bottom: 24rpx;
  display: block;
}

.submit-btn {
  width: 100%;
  height: 88rpx;
  border-radius: 44rpx;
  background: #34C759;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  font-size: 32rpx;
  margin-top: 48rpx;
  transition: all 0.3s ease;
}

.btn-hover {
  transform: translateY(-4rpx);
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.15);
}

.result-card {
  background-color: #ffffff;
  border-radius: 32rpx;
  padding: 40rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.05);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32rpx;
}

.result-title {
  font-size: 36rpx;
  font-weight: 500;
  color: #333333;
}

.result-score {
  font-size: 48rpx;
  font-weight: bold;
  color: #34C759;
}

.result-content {
  margin-bottom: 32rpx;
}

.result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 2rpx solid #f0f0f0;
}

.result-label {
  font-size: 28rpx;
  color: #666666;
}

.result-value {
  font-size: 32rpx;
  font-weight: 500;
}

.result-value.success {
  color: #34C759;
}

.result-value.warning {
  color: #FF9500;
}

.result-suggestions {
  margin-top: 32rpx;
}

.suggestions-title {
  font-size: 32rpx;
  font-weight: 500;
  color: #333333;
  margin-bottom: 24rpx;
  display: block;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 0;
}

.suggestion-icon {
  font-size: 32rpx;
}

.suggestion-text {
  font-size: 28rpx;
  color: #666666;
  flex: 1;
}

/* 底部安全区域 */
.safe-area-bottom {
  height: 34px;
  background: #f5f5f5;
}
</style> 