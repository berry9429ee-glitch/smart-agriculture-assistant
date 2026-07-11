'use strict';

const crypto = require('crypto');
const config = require('./config.js');

const TOKEN_TTL = 7 * 24 * 60 * 60 * 1000;
const WECHAT_ERROR_MESSAGES = {
  40029: '微信登录凭证 code 无效，请重新点击登录',
  40125: '小程序 AppSecret 配置错误，请检查 WECHAT_APPSECRET',
  40163: '微信登录凭证 code 已被使用，请重新点击登录',
  45011: '微信登录请求过于频繁，请稍后再试',
  40226: '微信登录高风险拦截，请检查小程序账号状态'
};

function assertConfig() {
  if (!config.appid || !config.secret) {
    throw new Error('请在 uniCloud 环境变量中配置 WECHAT_APPID 和 WECHAT_APPSECRET');
  }
}

function createToken(payload) {
  const secret = config.tokenSecret;
  if (!secret) {
    throw new Error('请在 uniCloud 环境变量中配置 TOKEN_SECRET');
  }

  const body = Buffer.from(JSON.stringify({
    ...payload,
    exp: Date.now() + TOKEN_TTL
  })).toString('base64url');
  const sign = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sign}`;
}

function formatWechatLoginError(data = {}) {
  const errcode = data.errcode;
  const errmsg = data.errmsg || 'unknown error';
  return {
    success: false,
    message: WECHAT_ERROR_MESSAGES[errcode] || `微信登录失败 [${errcode}]: ${errmsg}`,
    errcode,
    errmsg
  };
}

function verifyToken(token) {
  const value = String(token || '').trim();
  const [body, sign] = value.split('.');
  if (!body || !sign) {
    throw new Error('登录状态无效，请重新登录');
  }

  const secret = config.tokenSecret;
  if (!secret) {
    throw new Error('请在 uniCloud 环境变量中配置 TOKEN_SECRET');
  }
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
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
    throw new Error('登录状态缺少用户信息');
  }
  return payload;
}

function buildUserInfo(user = {}, userId) {
  return {
    id: userId || user._id,
    nickname: user.nickname || user.nickName || '',
    avatar: user.avatar || '',
    avatarFileID: user.avatarFileID || '',
    phone: user.phone || ''
  };
}

function normalizeProfile(event = {}) {
  const nickname = String(event.nickname || event.nickName || '').trim().slice(0, 30);
  const avatar = String(event.avatar || event.avatarUrl || '').trim();
  const avatarFileID = String(event.avatarFileID || '').trim();

  if (!nickname) {
    throw new Error('请输入昵称');
  }

  return {
    nickname,
    avatar,
    avatarFileID,
    hasAvatarUpdate: Boolean(avatar || avatarFileID)
  };
}

function normalizePhone(phone) {
  const value = String(phone || '').trim();
  if (!/^1[3-9]\d{9}$/.test(value)) {
    throw new Error('手机号格式不正确');
  }
  return value;
}

async function verifySmsCode(phone, code) {
  const db = uniCloud.database();
  const collection = db.collection('sms_codes');
  const res = await collection.where({ phone, scene: 'login' }).get();
  const record = res.data && res.data[0];

  if (!record) throw new Error('请先获取验证码');
  if (record.used) throw new Error('验证码已使用，请重新获取');
  if (Date.now() > record.expireTime) throw new Error('验证码已过期，请重新获取');
  if (String(record.code) !== String(code)) throw new Error('验证码错误');

  await collection.doc(record._id).update({
    used: true,
    updateTime: Date.now()
  });
}

async function loginByPhone(event) {
  const phone = normalizePhone(event.phone);
  await verifySmsCode(phone, event.code);

  const db = uniCloud.database();
  const userCollection = db.collection('users');
  const found = await userCollection.where({ phone }).get();

  let userId;
  if (found.data.length === 0) {
    const added = await userCollection.add({
      phone,
      createTime: Date.now(),
      updateTime: Date.now()
    });
    userId = added.id;
  } else {
    userId = found.data[0]._id;
    await userCollection.doc(userId).update({ updateTime: Date.now() });
  }

  return {
    success: true,
    token: createToken({ userId, phone, loginType: 'phone' }),
    userId,
    phone,
    nickname: `用户${phone.slice(-4)}`,
    avatar: found.data[0]?.avatar || '',
    avatarFileID: found.data[0]?.avatarFileID || ''
  };
}

async function loginByWechat(event) {
  assertConfig();

  if (!event.code) {
    throw new Error('缺少code');
  }

  const params = new URLSearchParams({
    appid: config.appid,
    secret: config.secret,
    js_code: event.code,
    grant_type: 'authorization_code'
  });
  const res = await uniCloud.httpclient.request(`https://api.weixin.qq.com/sns/jscode2session?${params}`, {
    method: 'GET',
    dataType: 'json',
    timeout: Number(process.env.WECHAT_LOGIN_TIMEOUT || 3500)
  });

  const data = res.data || {};
  if (data.errcode) {
    return formatWechatLoginError(data);
  }
  if (!data.openid) {
    return {
      success: false,
      message: '微信登录失败：微信未返回 openid',
      response: data
    };
  }

  const db = uniCloud.database();
  const userCollection = db.collection('users');
  const found = await userCollection.where({ openid: data.openid }).get();

  let userId;
  let user = {};
  if (found.data.length === 0) {
    const added = await userCollection.add({
      openid: data.openid,
      nickname: '',
      avatar: '',
      avatarFileID: '',
      createTime: Date.now(),
      updateTime: Date.now()
    });
    userId = added.id;
  } else {
    user = found.data[0];
    userId = user._id;
    await userCollection.doc(userId).update({ updateTime: Date.now() });
  }

  return {
    success: true,
    token: createToken({ userId, openid: data.openid, loginType: 'wechat' }),
    userId,
    openid: data.openid,
    userInfo: buildUserInfo(user, userId)
  };
}

async function updateUserProfile(event) {
  const payload = verifyToken(event.token);
  const profile = normalizeProfile(event);
  const db = uniCloud.database();
  const userCollection = db.collection('users');
  const existingResult = await userCollection.doc(payload.userId).get();
  const existingUser = existingResult.data && existingResult.data[0] || {};
  const updateData = {
    nickname: profile.nickname,
    updateTime: Date.now()
  };
  if (profile.hasAvatarUpdate) {
    updateData.avatar = profile.avatar;
    updateData.avatarFileID = profile.avatarFileID;
  }

  await userCollection.doc(payload.userId).update(updateData);

  return {
    success: true,
    userInfo: buildUserInfo({
      ...existingUser,
      ...updateData
    }, payload.userId)
  };
}

exports.main = async (event = {}, context) => {
  try {
    if (event.type === 'profile') {
      return await updateUserProfile(event);
    }
    if (event.type === 'phone') {
      return await loginByPhone(event);
    }
    return await loginByWechat(event);
  } catch (err) {
    // 数据库未激活时给出明确指引
    if (err.message && err.message.includes('mongo_cell_decision_not_found')) {
      return {
        success: false,
        message: 'uniCloud 数据库未激活。请在 uniCloud 控制台 → 数据库 → 激活服务，然后上传 database 目录下的表结构'
      };
    }
    // 数据库集合不存在
    if (err.message && err.message.includes('collection')) {
      return {
        success: false,
        message: '数据表不存在。请在 HBuilderX 中右键 uniCloud-aliyun/database → 上传数据库表结构'
      };
    }
    return {
      success: false,
      message: err.message || '登录失败'
    };
  }
};
