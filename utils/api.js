import config from '@/config/index.js';
import MockService from './mockService.js';

const FUNCTIONS = config.CLOUD_FUNCTIONS || {};

function isDemoMode() {
  return config.USE_MOCK === true || uni.getStorageSync('demo_mode') === true;
}

function getCloudResult(response) {
  const result = response && response.result ? response.result : response;
  if (!result) {
    throw new Error('云函数无返回结果');
  }
  if (result.success === false) {
    throw new Error(result.message || '云函数调用失败');
  }
  return result.data !== undefined ? result.data : result;
}

async function callCloudFunction(name, data = {}) {
  if (!name) {
    throw new Error('缺少云函数名称');
  }
  if (typeof uniCloud === 'undefined' || !uniCloud.callFunction) {
    throw new Error('当前环境不支持 uniCloud');
  }
  const response = await uniCloud.callFunction({ name, data });
  return getCloudResult(response);
}

function isUploadDomainError(error) {
  const message = String(error?.errMsg || error?.message || error || '');
  return message.includes('url not in domain list') || message.includes('合法域名');
}

function getMimeType(filePath = '') {
  const ext = String(filePath).split('?')[0].split('.').pop().toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

function compressImage(filePath, quality = 45) {
  if (!uni.compressImage) {
    return Promise.resolve(filePath);
  }

  return new Promise((resolve) => {
    uni.compressImage({
      src: filePath,
      quality,
      success: (res) => resolve(res.tempFilePath || filePath),
      fail: () => resolve(filePath)
    });
  });
}

function readLocalFileBase64(filePath) {
  return new Promise((resolve, reject) => {
    const fs = uni.getFileSystemManager && uni.getFileSystemManager();
    if (!fs || !fs.readFile) {
      reject(new Error('当前环境不支持读取图片文件'));
      return;
    }

    fs.readFile({
      filePath,
      encoding: 'base64',
      success: (res) => resolve(res.data),
      fail: (err) => reject(new Error(err.errMsg || '读取图片失败'))
    });
  });
}

function toNumber(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function normalizeDeviceData(raw = {}) {
  const data = raw.data && typeof raw.data === 'object' ? raw.data : raw;
  const temp = toNumber(data.temp ?? data.temperature);
  const moi = toNumber(data.moi ?? data.moisture ?? data.humidity);
  const ph = toNumber(data.PH ?? data.ph);
  const ec = toNumber(data.EC ?? data.ec);
  const np = toNumber(data.NP ?? data.np);
  const pho = toNumber(data.PHO ?? data.pho);
  const kal = toNumber(data.KAL ?? data.kal);

  return {
    ...data,
    temp,
    temperature: temp,
    moi,
    moisture: moi,
    humidity: moi,
    PH: ph,
    ph,
    EC: ec,
    ec,
    NP: np,
    np,
    PHO: pho,
    pho,
    KAL: kal,
    kal
  };
}

function evaluateSoilStatus(data) {
  if (data.ph == null && data.moisture == null && data.temperature == null) return '未知';
  if (data.ph < 5.5 || data.ph > 7.5) return '需调整';
  if (data.moisture < 40 || data.moisture > 80) return '需调整';
  if (data.temperature < 15 || data.temperature > 30) return '需调整';
  return '良好';
}

class ApiService {
  static async getDeviceProperty() {
    if (isDemoMode()) {
      return MockService.getDeviceProperty();
    }

    const token = uni.getStorageSync('token');
    const result = await callCloudFunction(FUNCTIONS.deviceProperty, { token });
    const data = result.data ? result.data : result;
    return normalizeDeviceData(data);
  }

  static async getBoundDevices() {
    if (isDemoMode()) {
      return [{
        id: 'demo-device',
        provider: 'demo',
        alias: '演示发财树设备',
        productId: 'demo-product',
        deviceName: 'demo-device',
        fieldMap: {},
        isDefault: true,
        updateTime: Date.now()
      }];
    }

    const token = uni.getStorageSync('token');
    const result = await callCloudFunction(FUNCTIONS.deviceProperty, {
      action: 'list',
      token
    });
    return result.devices || [];
  }

  static async bindDevice(deviceInfo) {
    if (isDemoMode()) {
      throw new Error('演示模式不绑定真实设备，请关闭演示模式后配置 OneNET');
    }

    const token = uni.getStorageSync('token');
    const result = await callCloudFunction(FUNCTIONS.deviceProperty, {
      action: 'bind',
      token,
      ...deviceInfo
    });
    return result.device;
  }

  static async unbindDevice(deviceId) {
    if (isDemoMode()) {
      return { success: true };
    }

    const token = uni.getStorageSync('token');
    return callCloudFunction(FUNCTIONS.deviceProperty, {
      action: 'unbind',
      token,
      deviceId
    });
  }

  static async getESP32Data() {
    if (isDemoMode()) {
      return MockService.getESP32Data();
    }

    const data = normalizeDeviceData(await this.getDeviceProperty());
    const soilData = {
      ph: data.ph,
      moisture: data.moisture,
      temperature: data.temperature,
      status: data.status || evaluateSoilStatus(data)
    };

    if (soilData.ph == null || soilData.moisture == null || soilData.temperature == null) {
      throw new Error('设备土壤数据不完整');
    }

    return soilData;
  }

  static async analyzePest(imagePath) {
    if (config.USE_AI_MOCK || isDemoMode()) {
      return MockService.analyzePest(imagePath);
    }

    if (!imagePath) {
      throw new Error('缺少图片路径');
    }

    const extMatch = imagePath.match(/\.(jpg|jpeg|png|webp)$/i);
    const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
    const cloudPath = `pest/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    try {
      const uploadResult = await uniCloud.uploadFile({ filePath: imagePath, cloudPath });
      const fileID = uploadResult.fileID || uploadResult.fileId;

      if (!fileID) {
        throw new Error('图片上传失败');
      }

      const result = await callCloudFunction(FUNCTIONS.pestDetect, { fileID });
      return {
        ...result,
        fileID,
        imagePath: result.imagePath || result.imageURL || imagePath
      };
    } catch (error) {
      if (!isUploadDomainError(error)) {
        throw error;
      }
    }

    const compressedPath = await compressImage(imagePath);
    const imageBase64 = await readLocalFileBase64(compressedPath);
    const result = await callCloudFunction(FUNCTIONS.pestDetect, {
      imageBase64,
      mimeType: getMimeType(compressedPath || imagePath)
    });

    return {
      ...result,
      fileID: '',
      imagePath: result.imagePath || imagePath,
      uploadSkipped: true
    };
  }

  static async callSparkModel(soilData) {
    if (config.USE_AI_MOCK || isDemoMode()) {
      return MockService.callSparkModel(soilData);
    }

    const result = await callCloudFunction(FUNCTIONS.aiAnalyze, {
      type: 'soil',
      soilData
    });

    return {
      success: true,
      analysis: result.analysis || result.content || result,
      timestamp: result.timestamp || new Date().toISOString()
    };
  }
}

export default ApiService;
