<template>
  <view class="container" :style="{ paddingTop: statusBarHeight + 'px' }">
    <view class="bg-decoration">
      <view class="bg-blob bg-blob-1"></view>
      <view class="bg-blob bg-blob-2"></view>
    </view>

    <view class="page-header">
      <button class="back-btn" @click="goBack">
        <text class="back-icon">‹</text>
      </button>
      <view class="header-text">
        <text class="page-title">绑定设备</text>
        <text class="page-desc">接入自己的 OneNET 硬件数据</text>
      </view>
    </view>

    <view class="form-card glass-card">
      <view class="section-header">
        <text class="section-title">设备信息</text>
        <text class="section-note">OneNET 物模型设备</text>
      </view>

      <view class="field">
        <text class="field-label">设备名称</text>
        <input class="field-input" v-model="form.alias" maxlength="30" placeholder="例如：阳台发财树" />
      </view>

      <view class="field">
        <text class="field-label">Product ID</text>
        <input class="field-input" v-model="form.productId" placeholder="OneNET 产品 ID" />
      </view>

      <view class="field">
        <text class="field-label">Device Name</text>
        <input class="field-input" v-model="form.deviceName" placeholder="设备名称/设备标识" />
      </view>

      <view class="field">
        <text class="field-label">Access Key</text>
        <input class="field-input" v-model="form.accessKey" password placeholder="OneNET 产品 AccessKey" />
      </view>

      <view class="field">
        <text class="field-label">Resource</text>
        <input class="field-input" v-model="form.resource" placeholder="默认 products/{Product ID}" />
      </view>

      <view class="mapping-section">
        <view class="mapping-header">
          <text class="mapping-title">字段映射</text>
          <text class="mapping-note">可选</text>
        </view>
        <view class="mapping-row" v-for="item in fieldDefs" :key="item.key">
          <view class="mapping-labels">
            <text class="mapping-name">{{ item.name }}</text>
            <text class="mapping-key">{{ item.key }}</text>
          </view>
          <input
            class="mapping-input"
            v-model="form.fieldMap[item.key]"
            :placeholder="'例如：' + item.placeholder"
          />
        </view>
      </view>

      <button class="primary-btn" :disabled="isSaving" @click="bindDevice">
        {{ isSaving ? '绑定中...' : '保存并测试' }}
      </button>
    </view>

    <view class="device-card glass-card">
      <view class="section-header">
        <text class="section-title">已绑定设备</text>
        <button class="refresh-btn" @click="loadDevices">刷新</button>
      </view>

      <view class="empty-state" v-if="!devices.length">
        <text class="empty-title">还没有绑定设备</text>
        <text class="empty-desc">保存设备后，首页和监测页会读取它的实时数据</text>
      </view>

      <view class="device-item" v-for="item in devices" :key="item.id">
        <view class="device-main">
          <text class="device-name">{{ item.alias }}</text>
          <text class="device-meta">{{ item.productId }} / {{ item.deviceName }}</text>
          <text class="device-meta" v-if="fieldMapCount(item.fieldMap)">已配置 {{ fieldMapCount(item.fieldMap) }} 个字段映射</text>
        </view>
        <view class="device-tag" v-if="item.isDefault">默认</view>
      </view>
    </view>
  </view>
</template>

<script>
import deviceService from '@/services/device-service.js';
import { getNavigationHeight } from '@/utils/navigation.js';

export default {
  data() {
    return {
      statusBarHeight: 88,
      isSaving: false,
      devices: [],
      fieldDefs: [
        { key: 'temp', name: '温度', placeholder: 'temperature' },
        { key: 'moi', name: '湿度', placeholder: 'humidity' },
        { key: 'PH', name: 'pH值', placeholder: 'ph' },
        { key: 'EC', name: '电导率', placeholder: 'ec' },
        { key: 'NP', name: '氮', placeholder: 'nitrogen' },
        { key: 'PHO', name: '磷', placeholder: 'phosphorus' },
        { key: 'KAL', name: '钾', placeholder: 'potassium' },
        { key: 'light', name: '光照', placeholder: 'light' }
      ],
      form: {
        alias: '',
        productId: '',
        deviceName: '',
        accessKey: '',
        resource: '',
        fieldMap: {
          temp: '',
          moi: '',
          PH: '',
          EC: '',
          NP: '',
          PHO: '',
          KAL: '',
          light: ''
        }
      }
    };
  },

  onLoad() {
    this.initStatusBar();
    this.loadDevices();
  },

  methods: {
    initStatusBar() {
      this.statusBarHeight = getNavigationHeight();
    },

    goBack() {
      uni.navigateBack({
        fail: () => uni.switchTab({ url: '/pages/home/home' })
      });
    },

    normalizeForm() {
      const productId = String(this.form.productId || '').trim();
      const fieldMap = {};
      this.fieldDefs.forEach((item) => {
        const value = String(this.form.fieldMap[item.key] || '').trim();
        if (value) {
          fieldMap[item.key] = value;
        }
      });

      return {
        alias: String(this.form.alias || '我的设备').trim(),
        productId,
        deviceName: String(this.form.deviceName || '').trim(),
        accessKey: String(this.form.accessKey || '').trim(),
        resource: String(this.form.resource || `products/${productId}`).trim(),
        fieldMap
      };
    },

    fieldMapCount(fieldMap = {}) {
      return Object.keys(fieldMap || {}).filter((key) => fieldMap[key]).length;
    },

    validateForm(data) {
      if (!data.productId) return '请输入 Product ID';
      if (!data.deviceName) return '请输入 Device Name';
      if (!data.accessKey) return '请输入 Access Key';
      return '';
    },

    async loadDevices() {
      try {
        this.devices = await deviceService.getBoundDevices();
      } catch (error) {
        if (error.message && error.message.includes('请先登录')) {
          uni.reLaunch({ url: '/pages/login/login' });
          return;
        }
        uni.showToast({ title: error.message || '设备列表获取失败', icon: 'none' });
      }
    },

    async bindDevice() {
      const data = this.normalizeForm();
      const error = this.validateForm(data);
      if (error) {
        uni.showToast({ title: error, icon: 'none' });
        return;
      }

      this.isSaving = true;
      try {
        uni.showLoading({ title: '测试连接...' });
        await deviceService.bindDevice(data);
        await deviceService.getSensorData();
        await this.loadDevices();
        uni.hideLoading();
        uni.showToast({ title: '设备已绑定', icon: 'success' });
      } catch (err) {
        uni.hideLoading();
        uni.showModal({
          title: '绑定失败',
          content: err.message || '请检查 OneNET 信息是否正确',
          showCancel: false
        });
      } finally {
        this.isSaving = false;
      }
    }
  }
};
</script>

<style scoped>
.container {
  min-height: 100vh;
  padding: 0 32rpx 48rpx;
  background: linear-gradient(160deg, #101820 0%, #172535 45%, #10291f 100%);
  color: #fff;
  position: relative;
  overflow: hidden;
}

.bg-decoration {
  position: fixed;
  inset: 0;
  pointer-events: none;
}

.bg-blob {
  position: absolute;
  filter: blur(70rpx);
  opacity: 0.35;
}

.bg-blob-1 {
  width: 360rpx;
  height: 360rpx;
  left: -120rpx;
  top: 140rpx;
  background: rgba(52, 199, 89, 0.4);
}

.bg-blob-2 {
  width: 420rpx;
  height: 420rpx;
  right: -160rpx;
  bottom: 80rpx;
  background: rgba(10, 132, 255, 0.35);
}

.page-header {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-bottom: 32rpx;
}

.back-btn {
  width: 76rpx;
  height: 76rpx;
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.back-btn::after {
  border: none;
}

.back-icon {
  color: #fff;
  font-size: 56rpx;
  line-height: 1;
}

.header-text {
  flex: 1;
}

.page-title {
  display: block;
  font-size: 42rpx;
  font-weight: 700;
}

.page-desc {
  display: block;
  margin-top: 6rpx;
  color: rgba(255, 255, 255, 0.55);
  font-size: 24rpx;
}

.glass-card {
  position: relative;
  z-index: 1;
  border-radius: 26rpx;
  background: rgba(255, 255, 255, 0.09);
  border: 1rpx solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 24rpx 60rpx rgba(0, 0, 0, 0.22);
}

.form-card,
.device-card {
  padding: 30rpx;
  margin-bottom: 28rpx;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 26rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 700;
}

.section-note {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.45);
}

.field {
  margin-bottom: 22rpx;
}

.field-label {
  display: block;
  margin-bottom: 10rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.6);
}

.field-input {
  height: 86rpx;
  border-radius: 18rpx;
  padding: 0 22rpx;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 28rpx;
}

.mapping-section {
  padding: 22rpx;
  margin: 8rpx 0 22rpx;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.06);
}

.mapping-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.mapping-title {
  font-size: 28rpx;
  font-weight: 700;
}

.mapping-note {
  padding: 6rpx 12rpx;
  border-radius: 999rpx;
  color: #34c759;
  background: rgba(52, 199, 89, 0.16);
  font-size: 22rpx;
}

.mapping-row {
  display: grid;
  grid-template-columns: 180rpx 1fr;
  gap: 14rpx;
  align-items: center;
  margin-bottom: 14rpx;
}

.mapping-row:last-child {
  margin-bottom: 0;
}

.mapping-labels {
  min-width: 0;
}

.mapping-name,
.mapping-key {
  display: block;
}

.mapping-name {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.78);
}

.mapping-key {
  margin-top: 2rpx;
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.36);
}

.mapping-input {
  height: 70rpx;
  border-radius: 16rpx;
  padding: 0 18rpx;
  background: rgba(255, 255, 255, 0.09);
  color: #fff;
  font-size: 24rpx;
}

.primary-btn {
  height: 90rpx;
  margin-top: 8rpx;
  border-radius: 20rpx;
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
  background: linear-gradient(135deg, #34c759 0%, #1db954 100%);
}

.primary-btn::after,
.refresh-btn::after {
  border: none;
}

.refresh-btn {
  height: 52rpx;
  padding: 0 22rpx;
  border-radius: 14rpx;
  line-height: 52rpx;
  font-size: 24rpx;
  color: #34c759;
  background: rgba(52, 199, 89, 0.14);
}

.empty-state {
  padding: 36rpx 20rpx;
  text-align: center;
}

.empty-title,
.empty-desc {
  display: block;
}

.empty-title {
  font-size: 28rpx;
  font-weight: 600;
}

.empty-desc {
  margin-top: 8rpx;
  color: rgba(255, 255, 255, 0.5);
  font-size: 24rpx;
}

.device-item {
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 22rpx;
  border-radius: 18rpx;
  background: rgba(255, 255, 255, 0.08);
}

.device-main {
  flex: 1;
  min-width: 0;
}

.device-name,
.device-meta {
  display: block;
}

.device-name {
  font-size: 28rpx;
  font-weight: 600;
}

.device-meta {
  margin-top: 6rpx;
  color: rgba(255, 255, 255, 0.45);
  font-size: 22rpx;
  word-break: break-all;
}

.device-tag {
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  color: #34c759;
  background: rgba(52, 199, 89, 0.16);
  font-size: 22rpx;
}
</style>
