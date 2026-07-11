import config from '../config/index.js';
import { callCloudFunction } from '../core/cloud-client.js';

const mockCodes = new Map();

async function sendMockCode(phone) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  mockCodes.set(phone, { code, expireTime: Date.now() + 5 * 60 * 1000 });
  return { success: true, code, message: '验证码已生成' };
}

async function verifyMockCode(phone, inputCode) {
  const saved = mockCodes.get(phone);
  if (!saved) throw new Error('请先获取验证码');
  if (Date.now() > saved.expireTime) {
    mockCodes.delete(phone);
    throw new Error('验证码已过期，请重新获取');
  }
  if (String(saved.code) !== String(inputCode)) throw new Error('验证码错误');
  mockCodes.delete(phone);
  return { success: true, message: '验证通过' };
}

export async function sendCode(phone) {
  if (config.USE_SMS_MOCK === true) return sendMockCode(phone);
  const result = await callCloudFunction(config.CLOUD_FUNCTIONS.sendSms, {
    action: 'sendCode',
    phone
  }, { fallbackMessage: '验证码发送失败' });
  return {
    success: true,
    message: result.message || '验证码已发送',
    code: result.code || result.debugCode || ''
  };
}

export async function verifyCode(phone, code) {
  if (config.USE_SMS_MOCK === true) return verifyMockCode(phone, code);
  await callCloudFunction(config.CLOUD_FUNCTIONS.sendSms, {
    action: 'verifyCode',
    phone,
    code,
    consume: false
  }, { fallbackMessage: '验证码验证失败' });
  return { success: true, message: '验证通过' };
}

export default { sendCode, verifyCode };
