'use strict';

const crypto = require('crypto');

const DEVICE_COLLECTION = 'user_devices';
const PROVIDER_ONENET = 'onenet';
const FIELD_ALIASES = {
  temp: ['temp', 'temperature', 'airTemp', 'soilTemp', 'wendu'],
  moi: ['moi', 'moisture', 'humidity', 'soilHumidity', 'soilMoisture', 'shidu'],
  PH: ['PH', 'ph', 'pH', 'soilPH'],
  EC: ['EC', 'ec', 'conductivity', 'soilEC'],
  NP: ['NP', 'np', 'nitrogen', 'N'],
  PHO: ['PHO', 'pho', 'phosphorus', 'P'],
  KAL: ['KAL', 'kal', 'potassium', 'K'],
  light: ['light', 'illumination', 'lux']
};
const FIELD_OUTPUTS = {
  temp: ['temp', 'temperature'],
  moi: ['moi', 'moisture', 'humidity'],
  PH: ['PH', 'ph'],
  EC: ['EC', 'ec'],
  NP: ['NP', 'np'],
  PHO: ['PHO', 'pho'],
  KAL: ['KAL', 'kal'],
  light: ['light']
};

function getTokenSecret() {
  const secret = process.env.TOKEN_SECRET;
  if (!secret) {
    throw new Error('请在 get-device-property 云函数环境变量中配置 TOKEN_SECRET');
  }
  return secret;
}

function verifyToken(token) {
  const value = String(token || '').trim();
  const [body, sign] = value.split('.');
  if (!body || !sign) {
    throw new Error('请先登录');
  }

  const expected = crypto.createHmac('sha256', getTokenSecret()).update(body).digest('base64url');
  const expectedBuffer = Buffer.from(expected);
  const signBuffer = Buffer.from(sign);

  if (expectedBuffer.length !== signBuffer.length || !crypto.timingSafeEqual(expectedBuffer, signBuffer)) {
    throw new Error('登录状态无效，请重新登录');
  }

  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (payload.exp && Date.now() > payload.exp) {
    throw new Error('登录已过期，请重新登录');
  }
  if (!payload.userId) {
    throw new Error('登录信息缺少用户');
  }
  return payload;
}

function getCipherKey() {
  return crypto.createHash('sha256').update(getTokenSecret()).digest();
}

function encryptSecret(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getCipherKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
  return {
    value: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64')
  };
}

function decryptSecret(record = {}) {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getCipherKey(),
    Buffer.from(record.accessKeyIv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(record.accessKeyTag, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(record.accessKeyEncrypted, 'base64')),
    decipher.final()
  ]);
  return decrypted.toString('utf8');
}

function normalizeFieldMap(fieldMap = {}) {
  const result = {};
  Object.keys(FIELD_ALIASES).forEach((key) => {
    const value = String(fieldMap[key] || '').trim();
    if (value) {
      result[key] = value;
    }
  });
  return result;
}

function normalizeDeviceInput(event = {}) {
  const alias = String(event.alias || event.deviceAlias || '我的设备').trim().slice(0, 30) || '我的设备';
  const productId = String(event.productId || '').trim();
  const deviceName = String(event.deviceName || '').trim();
  const accessKey = String(event.accessKey || '').trim();
  const resource = String(event.resource || `products/${productId}`).trim();

  if (!productId) throw new Error('请输入 Product ID');
  if (!deviceName) throw new Error('请输入 Device Name');
  if (!accessKey) throw new Error('请输入 Access Key');

  return {
    provider: PROVIDER_ONENET,
    alias,
    productId,
    deviceName,
    accessKey,
    resource,
    fieldMap: normalizeFieldMap(event.fieldMap)
  };
}

function toClientDevice(record = {}) {
  return {
    id: record._id,
    provider: record.provider || PROVIDER_ONENET,
    alias: record.alias || record.deviceAlias || '我的设备',
    productId: record.productId || '',
    deviceName: record.deviceName || '',
    fieldMap: record.fieldMap || {},
    isDefault: record.isDefault !== false,
    updateTime: record.updateTime || record.createTime || 0
  };
}

function getEnvDeviceConfig() {
  const productId = process.env.ONENET_PRODUCT_ID;
  const deviceName = process.env.ONENET_DEVICE_NAME;
  const accessKey = process.env.ONENET_ACCESS_KEY;

  if (!productId || !deviceName || !accessKey) {
    return null;
  }

  return {
    provider: PROVIDER_ONENET,
    alias: process.env.ONENET_DEVICE_ALIAS || '默认设备',
    productId,
    deviceName,
    accessKey,
    resource: process.env.ONENET_RESOURCE || `products/${productId}`,
    fieldMap: normalizeFieldMap(safeJsonParse(process.env.ONENET_FIELD_MAP, {}))
  };
}

function safeJsonParse(text, fallback) {
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch (err) {
    return fallback;
  }
}

function createAuthorization({ accessKey, resource }) {
  const version = '2022-05-01';
  const method = 'sha1';
  const et = Math.ceil((Date.now() + 3600 * 1000) / 1000);
  const key = Buffer.from(accessKey, 'base64');
  const text = `${et}\n${method}\n${resource}\n${version}`;
  const sign = crypto.createHmac('sha1', key).update(text).digest('base64');

  return `version=${version}&res=${encodeURIComponent(resource)}&et=${et}&method=${method}&sign=${encodeURIComponent(sign)}`;
}

function parseResponse(body) {
  let raw = body;
  if (raw && raw.resp && typeof raw.resp === 'string') {
    raw = JSON.parse(raw.resp);
  }

  if (!raw || raw.code !== 0 || !Array.isArray(raw.data)) {
    throw new Error(raw?.msg || '设备数据异常');
  }

  return raw.data.reduce((result, item) => {
    const value = Number(item.value);
    result[item.identifier] = Number.isNaN(value) ? item.value : value;
    result[String(item.identifier).toLowerCase()] = result[item.identifier];
    return result;
  }, {});
}

function getValueByIdentifier(data, identifier) {
  if (!identifier) return undefined;
  if (Object.prototype.hasOwnProperty.call(data, identifier)) {
    return data[identifier];
  }

  const lower = String(identifier).toLowerCase();
  if (Object.prototype.hasOwnProperty.call(data, lower)) {
    return data[lower];
  }
  return undefined;
}

function pickMappedValue(data, fieldMap, key) {
  const mapped = getValueByIdentifier(data, fieldMap[key]);
  if (mapped !== undefined) {
    return mapped;
  }

  const aliases = FIELD_ALIASES[key] || [];
  for (const alias of aliases) {
    const value = getValueByIdentifier(data, alias);
    if (value !== undefined) {
      return value;
    }
  }
  return undefined;
}

function applyFieldMap(rawData = {}, fieldMap = {}) {
  const data = { ...rawData };
  Object.keys(FIELD_OUTPUTS).forEach((key) => {
    const value = pickMappedValue(rawData, fieldMap, key);
    if (value === undefined) return;
    FIELD_OUTPUTS[key].forEach((outputKey) => {
      data[outputKey] = value;
    });
  });
  return data;
}

async function queryOneNetDevice(cfg) {
  const authorization = createAuthorization(cfg);
  const params = new URLSearchParams({
    product_id: cfg.productId,
    device_name: cfg.deviceName
  });

  const response = await uniCloud.httpclient.request(`https://iot-api.heclouds.com/thingmodel/query-device-property?${params}`, {
    method: 'GET',
    dataType: 'json',
    timeout: 10000,
    headers: {
      Accept: 'application/json, text/plain, */*',
      authorization
    }
  });

  return parseResponse(response.data);
}

async function bindDevice(event) {
  const payload = verifyToken(event.token);
  const input = normalizeDeviceInput(event);
  const db = uniCloud.database();
  const collection = db.collection(DEVICE_COLLECTION);
  const encrypted = encryptSecret(input.accessKey);
  const now = Date.now();

  await collection.where({ userId: payload.userId }).update({
    isDefault: false,
    updateTime: now
  });

  const found = await collection.where({
    userId: payload.userId,
    provider: input.provider,
    productId: input.productId,
    deviceName: input.deviceName
  }).get();

  const data = {
    userId: payload.userId,
    provider: input.provider,
    alias: input.alias,
    productId: input.productId,
    deviceName: input.deviceName,
    resource: input.resource,
    fieldMap: input.fieldMap,
    accessKeyEncrypted: encrypted.value,
    accessKeyIv: encrypted.iv,
    accessKeyTag: encrypted.tag,
    isDefault: true,
    updateTime: now
  };

  let deviceId;
  if (found.data && found.data.length > 0) {
    deviceId = found.data[0]._id;
    await collection.doc(deviceId).update(data);
  } else {
    const added = await collection.add({
      ...data,
      createTime: now
    });
    deviceId = added.id;
  }

  return {
    success: true,
    device: toClientDevice({
      _id: deviceId,
      ...data
    })
  };
}

async function listDevices(event) {
  const payload = verifyToken(event.token);
  const db = uniCloud.database();
  const res = await db.collection(DEVICE_COLLECTION)
    .where({ userId: payload.userId })
    .orderBy('updateTime', 'desc')
    .get();

  return {
    success: true,
    devices: (res.data || []).map(toClientDevice)
  };
}

async function unbindDevice(event) {
  const payload = verifyToken(event.token);
  const deviceId = String(event.deviceId || '').trim();
  if (!deviceId) {
    throw new Error('缺少设备 ID');
  }

  const db = uniCloud.database();
  const collection = db.collection(DEVICE_COLLECTION);
  const found = await collection.where({ _id: deviceId, userId: payload.userId }).get();
  if (!found.data || found.data.length === 0) {
    throw new Error('设备不存在');
  }

  await collection.doc(deviceId).remove();
  return {
    success: true
  };
}

async function getUserDeviceConfig(event) {
  const payload = verifyToken(event.token);
  const db = uniCloud.database();
  const collection = db.collection(DEVICE_COLLECTION);
  const deviceId = String(event.deviceId || '').trim();
  let found;

  if (deviceId) {
    found = await collection.where({ _id: deviceId, userId: payload.userId }).get();
  } else {
    found = await collection.where({ userId: payload.userId, isDefault: true }).limit(1).get();
    if (!found.data || found.data.length === 0) {
      found = await collection.where({ userId: payload.userId }).orderBy('updateTime', 'desc').limit(1).get();
    }
  }

  const record = found.data && found.data[0];
  if (!record) {
    throw new Error('请先绑定设备');
  }

  return {
    provider: record.provider || PROVIDER_ONENET,
    alias: record.alias || '我的设备',
    productId: record.productId,
    deviceName: record.deviceName,
    accessKey: decryptSecret(record),
    resource: record.resource || `products/${record.productId}`,
    fieldMap: record.fieldMap || {},
    deviceId: record._id
  };
}

async function getDeviceProperty(event) {
  let cfg;
  if (event.token) {
    cfg = await getUserDeviceConfig(event);
  } else {
    cfg = getEnvDeviceConfig();
  }

  if (!cfg) {
    throw new Error('请先绑定设备');
  }

  if (cfg.provider !== PROVIDER_ONENET) {
    throw new Error('暂不支持该设备平台');
  }

  const rawData = await queryOneNetDevice(cfg);
  const data = applyFieldMap(rawData, cfg.fieldMap || {});
  return {
    success: true,
    device: toClientDevice({
      _id: cfg.deviceId || '',
      provider: cfg.provider,
      alias: cfg.alias,
      productId: cfg.productId,
      deviceName: cfg.deviceName,
      fieldMap: cfg.fieldMap || {},
      isDefault: true
    }),
    data,
    rawData
  };
}

exports.main = async (event = {}, context) => {
  try {
    const action = event.action || 'property';
    if (action === 'bind') return await bindDevice(event);
    if (action === 'list') return await listDevices(event);
    if (action === 'unbind') return await unbindDevice(event);
    return await getDeviceProperty(event);
  } catch (err) {
    if (err.message && err.message.includes('collection')) {
      return {
        success: false,
        message: '设备表不存在，请上传 user_devices 数据库表结构'
      };
    }
    return {
      success: false,
      message: err.message || '获取设备数据失败'
    };
  }
};
