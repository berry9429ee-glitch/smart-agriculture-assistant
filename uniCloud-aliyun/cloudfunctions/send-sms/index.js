'use strict';

const crypto = require('crypto');

const CODE_TTL = 5 * 60 * 1000;
const RESEND_INTERVAL = 60 * 1000;
const TENCENT_PROVIDER = 'tencent';
const TENCENT_ENDPOINT = 'sms.tencentcloudapi.com';
const TENCENT_SERVICE = 'sms';
const TENCENT_ACTION = 'SendSms';
const TENCENT_VERSION = '2021-01-11';

function normalizePhone(phone) {
  const value = String(phone || '').trim();
  if (!/^1[3-9]\d{9}$/.test(value)) {
    throw new Error('手机号格式不正确');
  }
  return value;
}

function createCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function isEnabled(value) {
  return String(value || '').toLowerCase() === 'true';
}

function getRequiredEnv(name, label = name) {
  const value = String(process.env[name] || '').trim();
  if (!value) {
    throw new Error(`请在 send-sms 云函数环境变量中配置 ${label}`);
  }
  return value;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function hmacSha256(key, value, encoding) {
  return crypto.createHmac('sha256', key).update(value).digest(encoding);
}

function getDate(timestamp) {
  return new Date(timestamp * 1000).toISOString().slice(0, 10);
}

function buildTencentHeaders(payload) {
  const secretId = getRequiredEnv('TENCENTCLOUD_SECRET_ID');
  const secretKey = getRequiredEnv('TENCENTCLOUD_SECRET_KEY');
  const region = process.env.TENCENT_SMS_REGION || 'ap-guangzhou';
  const timestamp = Math.floor(Date.now() / 1000);
  const date = getDate(timestamp);
  const canonicalHeaders = [
    'content-type:application/json; charset=utf-8',
    `host:${TENCENT_ENDPOINT}`,
    `x-tc-action:${TENCENT_ACTION.toLowerCase()}`
  ].join('\n') + '\n';
  const signedHeaders = 'content-type;host;x-tc-action';
  const canonicalRequest = [
    'POST',
    '/',
    '',
    canonicalHeaders,
    signedHeaders,
    sha256(payload)
  ].join('\n');
  const credentialScope = `${date}/${TENCENT_SERVICE}/tc3_request`;
  const stringToSign = [
    'TC3-HMAC-SHA256',
    timestamp,
    credentialScope,
    sha256(canonicalRequest)
  ].join('\n');
  const secretDate = hmacSha256(`TC3${secretKey}`, date);
  const secretService = hmacSha256(secretDate, TENCENT_SERVICE);
  const secretSigning = hmacSha256(secretService, 'tc3_request');
  const signature = hmacSha256(secretSigning, stringToSign, 'hex');
  const authorization = [
    'TC3-HMAC-SHA256',
    `Credential=${secretId}/${credentialScope},`,
    `SignedHeaders=${signedHeaders},`,
    `Signature=${signature}`
  ].join(' ');

  const headers = {
    Authorization: authorization,
    'Content-Type': 'application/json; charset=utf-8',
    Host: TENCENT_ENDPOINT,
    'X-TC-Action': TENCENT_ACTION,
    'X-TC-Timestamp': String(timestamp),
    'X-TC-Version': TENCENT_VERSION,
    'X-TC-Region': region
  };

  if (process.env.TENCENTCLOUD_TOKEN) {
    headers['X-TC-Token'] = process.env.TENCENTCLOUD_TOKEN;
  }

  return headers;
}

function buildTencentTemplateParamSet(code) {
  const minutes = String(Math.ceil(CODE_TTL / 60000));
  const rawParams = process.env.TENCENT_SMS_TEMPLATE_PARAMS || '';

  if (!rawParams.trim()) {
    return [code];
  }

  return rawParams.split(',').map((item) => item
    .trim()
    .replace(/\{code\}/g, code)
    .replace(/\{minutes\}/g, minutes));
}

function formatTencentPhone(phone) {
  const prefix = process.env.TENCENT_SMS_PHONE_PREFIX || '+86';
  return `${prefix}${phone}`;
}

async function sendWithTencent(phone, code) {
  const payload = {
    SmsSdkAppId: getRequiredEnv('TENCENT_SMS_SDK_APP_ID', 'TENCENT_SMS_SDK_APP_ID 短信应用 SDK AppID'),
    SignName: getRequiredEnv('TENCENT_SMS_SIGN_NAME', 'TENCENT_SMS_SIGN_NAME 短信签名'),
    TemplateId: getRequiredEnv('TENCENT_SMS_TEMPLATE_ID', 'TENCENT_SMS_TEMPLATE_ID 短信模板 ID'),
    TemplateParamSet: buildTencentTemplateParamSet(code),
    PhoneNumberSet: [formatTencentPhone(phone)]
  };

  if (process.env.TENCENT_SMS_SESSION_CONTEXT) {
    payload.SessionContext = process.env.TENCENT_SMS_SESSION_CONTEXT;
  }

  if (process.env.TENCENT_SMS_EXTEND_CODE) {
    payload.ExtendCode = process.env.TENCENT_SMS_EXTEND_CODE;
  }

  const payloadText = JSON.stringify(payload);
  const res = await uniCloud.httpclient.request(`https://${TENCENT_ENDPOINT}`, {
    method: 'POST',
    data: payloadText,
    dataType: 'json',
    headers: buildTencentHeaders(payloadText),
    timeout: Number(process.env.SMS_REQUEST_TIMEOUT || 3500)
  });
  const body = typeof res.data === 'string' ? JSON.parse(res.data || '{}') : (res.data || {});
  const response = body.Response || {};

  if (response.Error) {
    throw new Error(response.Error.Message || response.Error.Code || '腾讯云短信发送失败');
  }

  const status = response.SendStatusSet && response.SendStatusSet[0];
  if (!status || String(status.Code).toLowerCase() !== 'ok') {
    throw new Error((status && (status.Message || status.Code)) || '腾讯云短信发送失败');
  }

  return {
    provider: TENCENT_PROVIDER,
    bizId: status.SerialNo,
    requestId: response.RequestId
  };
}

async function getLatestCode(phone) {
  const db = uniCloud.database();
  const collection = db.collection('sms_codes');
  const res = await collection.where({ phone, scene: 'login' }).get();
  return res.data && res.data[0];
}

async function ensureCanSend(phone) {
  const record = await getLatestCode(phone);
  if (!record || record.used) return;

  const elapsed = Date.now() - Number(record.createTime || 0);
  if (elapsed < RESEND_INTERVAL) {
    const waitSeconds = Math.ceil((RESEND_INTERVAL - elapsed) / 1000);
    throw new Error(`请 ${waitSeconds} 秒后再获取验证码`);
  }
}

async function saveCode(phone, code) {
  const db = uniCloud.database();
  const collection = db.collection('sms_codes');
  const now = Date.now();

  await collection.where({ phone, scene: 'login' }).remove();
  await collection.add({
    phone,
    scene: 'login',
    code,
    expireTime: now + CODE_TTL,
    used: false,
    createTime: now,
    updateTime: now
  });
}

async function removeCode(phone) {
  const db = uniCloud.database();
  await db.collection('sms_codes').where({ phone, scene: 'login' }).remove();
}

async function verifyCode(phone, code, consume = true) {
  const db = uniCloud.database();
  const collection = db.collection('sms_codes');
  const record = await getLatestCode(phone);

  if (!record) throw new Error('请先获取验证码');
  if (record.used) throw new Error('验证码已使用，请重新获取');
  if (Date.now() > record.expireTime) throw new Error('验证码已过期，请重新获取');
  if (String(record.code) !== String(code)) throw new Error('验证码错误');

  if (consume) {
    await collection.doc(record._id).update({
      used: true,
      updateTime: Date.now()
    });
  }
}

async function sendCode(phone) {
  const provider = String(process.env.SMS_PROVIDER || '').trim().toLowerCase();
  const mockMode = provider === 'mock' || isEnabled(process.env.SMS_MOCK_MODE);
  const debugReturnCode = mockMode || isEnabled(process.env.SMS_DEBUG_RETURN_CODE);
  const code = process.env.SMS_FIXED_CODE || createCode();
  let sendResult = null;

  await ensureCanSend(phone);

  await saveCode(phone, code);
  try {
    if (!mockMode) {
      if (!provider) throw new Error('请在 send-sms 云函数环境变量中配置 SMS_PROVIDER=tencent');
      if (provider !== TENCENT_PROVIDER) throw new Error('当前仅支持 SMS_PROVIDER=tencent');
      sendResult = await sendWithTencent(phone, code);
    }
  } catch (err) {
    await removeCode(phone).catch(() => {});
    throw err;
  }

  return {
    success: true,
    message: mockMode ? '测试验证码已生成' : '验证码已发送',
    code: debugReturnCode ? code : undefined,
    bizId: sendResult && sendResult.bizId,
    expiresIn: CODE_TTL / 1000
  };
}

exports.main = async (event = {}, context) => {
  try {
    const phone = normalizePhone(event.phone);

    if (event.action === 'sendCode') {
      return await sendCode(phone);
    }

    if (event.action === 'verifyCode') {
      await verifyCode(phone, event.code, event.consume !== false);
      return { success: true, message: '验证通过' };
    }

    return { success: false, message: '未知操作' };
  } catch (err) {
    return {
      success: false,
      message: err.message || '短信服务调用失败'
    };
  }
};
