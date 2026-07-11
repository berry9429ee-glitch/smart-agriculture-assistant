import config from '../config/index.js';
import { callCloudFunction } from '../core/cloud-client.js';
import { createSoilSnapshot, normalizeSensorData } from '../domain/sensor-data.js';
import { getDemoDevices, getDemoSensorData } from './demo-service.js';
import sessionService from './session-service.js';

const functionName = config.CLOUD_FUNCTIONS.deviceProperty;

export async function getSensorData() {
  if (sessionService.isDemoMode()) {
    return normalizeSensorData(await getDemoSensorData());
  }

  const result = await callCloudFunction(functionName, {
    token: sessionService.getToken()
  }, { fallbackMessage: '设备数据获取失败' });
  return normalizeSensorData(result.data || result);
}

export async function getBoundDevices() {
  if (sessionService.isDemoMode()) return getDemoDevices();
  const result = await callCloudFunction(functionName, {
    action: 'list',
    token: sessionService.getToken()
  }, { fallbackMessage: '设备列表获取失败' });
  return result.devices || [];
}

export async function bindDevice(deviceInfo) {
  if (sessionService.isDemoMode()) {
    throw new Error('演示模式不绑定真实设备，请关闭演示模式后配置 OneNET');
  }
  const result = await callCloudFunction(functionName, {
    action: 'bind',
    token: sessionService.getToken(),
    ...deviceInfo
  }, { fallbackMessage: '设备绑定失败' });
  return result.device;
}

export async function unbindDevice(deviceId) {
  if (sessionService.isDemoMode()) return { success: true };
  return callCloudFunction(functionName, {
    action: 'unbind',
    token: sessionService.getToken(),
    deviceId
  }, { fallbackMessage: '设备解绑失败' });
}

export async function getSoilSnapshot() {
  return createSoilSnapshot(await getSensorData());
}

export default {
  getSensorData,
  getBoundDevices,
  bindDevice,
  unbindDevice,
  getSoilSnapshot
};
