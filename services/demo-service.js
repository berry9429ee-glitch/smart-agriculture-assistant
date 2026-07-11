import { buildLocalSoilAdvice } from '../domain/sensor-data.js';

function delay(value, milliseconds = 250) {
  return new Promise((resolve) => setTimeout(() => resolve(value), milliseconds));
}

export async function getDemoSensorData() {
  return delay({
    temperature: 22 + Math.random() * 4,
    moisture: 50 + Math.random() * 15,
    ph: 6.3 + Math.random() * 0.7,
    ec: 1100 + Math.random() * 300,
    nitrogen: 24,
    phosphorus: 44,
    potassium: 33,
    light: 800 + Math.random() * 200
  });
}

export async function getDemoDevices() {
  return delay([{
    id: 'demo-device',
    provider: 'demo',
    alias: '演示发财树设备',
    productId: 'demo-product',
    deviceName: 'demo-device',
    fieldMap: {},
    isDefault: true,
    updateTime: Date.now()
  }], 100);
}

export async function analyzeDemoPest(imagePath) {
  const detected = Math.random() > 0.55;
  return delay({
    success: true,
    hasPest: detected,
    pestName: detected ? '疑似叶斑病' : '健康',
    severity: detected ? '轻微' : '健康',
    confidence: detected ? 86 : 92,
    symptoms: detected ? '叶片存在局部褐色斑点' : '未见明显病斑或虫害痕迹',
    suggestion: detected ? '建议隔离观察、改善通风，并请农技人员复核。' : '继续保持正常养护和定期巡检。',
    imagePath,
    source: 'demo-rule',
    timestamp: new Date().toISOString()
  }, 800);
}

export async function analyzeDemoSoil(soilData) {
  return delay({
    analysis: buildLocalSoilAdvice(soilData),
    source: 'demo-rule',
    sourceLabel: '演示规则',
    timestamp: new Date().toISOString()
  }, 500);
}
