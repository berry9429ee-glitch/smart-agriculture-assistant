<template>
  <view class="container">
    <view class="phone-container">
     <view class="status-bar">
       <text>9:41</text>
       <view class="flex items-center space-x-2">
         <text class="iconfont icon-signal"></text>
         <text class="iconfont icon-wifi">📡</text>
         <text class="iconfont icon-battery">🔋</text>
       </view>
     </view>
      <web-view src="/pages/login/login.html"></web-view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {}
  },
  methods: {}
}
</script>

<style>
.container {
  padding: 32rpx;
}
.phone-container {
  width: 390px;
  height: 844px;
  background: white;
  border-radius: 40px;
  overflow: hidden;
  position: relative;
  box-shadow: 0 0 20px rgba(0,0,0,0.1);
  margin: 20px;
  display: inline-block;
}
.status-bar {
  height: 44px;
  background: #000;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  font-size: 14px;
}
</style> 