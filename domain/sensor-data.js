export const SENSOR_LIMITS = Object.freeze({
  temperature: Object.freeze({ min: 15, max: 30 }),
  moisture: Object.freeze({ min: 40, max: 80 }),
  ph: Object.freeze({ min: 5.5, max: 7.5 })
});

export function toOptionalNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeSensorData(raw = {}) {
  const source = raw?.data && typeof raw.data === 'object' ? raw.data : raw;

  return {
    temperature: toOptionalNumber(source.temperature ?? source.temp),
    moisture: toOptionalNumber(source.moisture ?? source.humidity ?? source.moi),
    ph: toOptionalNumber(source.ph ?? source.PH),
    ec: toOptionalNumber(source.ec ?? source.EC ?? source.conductivity),
    nitrogen: toOptionalNumber(source.nitrogen ?? source.NP ?? source.np),
    phosphorus: toOptionalNumber(source.phosphorus ?? source.PHO ?? source.pho),
    potassium: toOptionalNumber(source.potassium ?? source.KAL ?? source.kal),
    light: toOptionalNumber(source.light ?? source.illumination ?? source.lux),
    raw: source
  };
}

export function getSensorAlerts(sensorData = {}) {
  const data = normalizeSensorData(sensorData);
  const alerts = [];

  if (data.temperature !== null && data.temperature > SENSOR_LIMITS.temperature.max) alerts.push('温度过高');
  if (data.temperature !== null && data.temperature < SENSOR_LIMITS.temperature.min) alerts.push('温度过低');
  if (data.moisture !== null && data.moisture < SENSOR_LIMITS.moisture.min) alerts.push('湿度过低');
  if (data.moisture !== null && data.moisture > SENSOR_LIMITS.moisture.max) alerts.push('湿度过高');
  if (data.ph !== null && data.ph < SENSOR_LIMITS.ph.min) alerts.push('土壤过酸');
  if (data.ph !== null && data.ph > SENSOR_LIMITS.ph.max) alerts.push('土壤过碱');

  return alerts;
}

export function evaluateSensorStatus(sensorData = {}) {
  const data = normalizeSensorData(sensorData);
  if (data.temperature === null && data.moisture === null && data.ph === null) return '离线';
  return getSensorAlerts(data).length > 0 ? '异常' : '正常';
}

export function createSoilSnapshot(sensorData = {}) {
  const data = normalizeSensorData(sensorData);
  if (data.ph === null || data.moisture === null || data.temperature === null) {
    throw new Error('设备土壤数据不完整');
  }

  return {
    ph: data.ph,
    moisture: data.moisture,
    temperature: data.temperature,
    status: evaluateSensorStatus(data) === '正常' ? '良好' : '需调整'
  };
}

export function buildLocalSoilAdvice(soilData = {}) {
  const data = normalizeSensorData(soilData);
  const notes = [];

  if (data.ph !== null) {
    if (data.ph < SENSOR_LIMITS.ph.min) notes.push('土壤偏酸，建议少量施用石灰或更换部分基质。');
    else if (data.ph > SENSOR_LIMITS.ph.max) notes.push('土壤偏碱，可补充腐殖质或酸性调理剂。');
    else notes.push('pH 值处于适宜区间。');
  }
  if (data.moisture !== null) {
    if (data.moisture < SENSOR_LIMITS.moisture.min) notes.push('湿度偏低，需要提高浇水频率。');
    else if (data.moisture > SENSOR_LIMITS.moisture.max) notes.push('湿度偏高，应减少浇水并加强通风。');
    else notes.push('土壤湿度较适宜。');
  }
  if (data.temperature !== null) {
    if (data.temperature < SENSOR_LIMITS.temperature.min) notes.push('温度偏低，幼苗应注意保温。');
    else if (data.temperature > SENSOR_LIMITS.temperature.max) notes.push('温度偏高，建议遮阴降温。');
    else notes.push('温度适合幼苗生长。');
  }

  return `${notes.join('')}选苗时优先选择叶色浓绿、根系完整且无病斑的幼苗，并保持散射光、通风和见干见湿的浇水节奏。`;
}
