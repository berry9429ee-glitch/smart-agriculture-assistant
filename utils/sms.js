import config from '@/config/index.js';

const SMS_CONFIG = {
  USE_MOCK: config.USE_SMS_MOCK === true,
  UNICLOUD: {
    functionName: config.CLOUD_FUNCTIONS.sendSms,
    loginFunctionName: config.CLOUD_FUNCTIONS.login
  }
};

function assertUniCloudReady() {
  if (typeof uniCloud === 'undefined' || !uniCloud.callFunction) {
    throw new Error('当前环境不支持 uniCloud，请使用已关联服务空间的发行包');
  }
}

function getFunctionResult(response, fallbackMessage) {
  const result = response && response.result ? response.result : response;
  if (!result || result.success === false) {
    throw new Error((result && result.message) || fallbackMessage);
  }
  return result;
}

const MockSmsService = {
  _mockCodes: {},

  async sendCode(phone) {
    return new Promise((resolve) => {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      this._mockCodes[phone] = {
        code,
        expireTime: Date.now() + 5 * 60 * 1000
      };

      setTimeout(() => {
        resolve({
          success: true,
          code,
          message: '验证码已生成'
        });
      }, 300);
    });
  },

  async verifyCode(phone, inputCode) {
    const savedData = this._mockCodes[phone];

    if (!savedData) throw new Error('请先获取验证码');
    if (Date.now() > savedData.expireTime) {
      delete this._mockCodes[phone];
      throw new Error('验证码已过期，请重新获取');
    }
    if (String(savedData.code) !== String(inputCode)) throw new Error('验证码错误');

    delete this._mockCodes[phone];
    return { success: true, message: '验证通过' };
  },

  async phoneLogin(phone, code) {
    await this.verifyCode(phone, code);

    return new Promise((resolve) => {
      const user = {
        id: 'user_' + Date.now(),
        phone,
        nickname: '用户' + phone.slice(-4),
        avatar: '',
        token: 'mock_token_' + Math.random().toString(36).substring(2)
      };

      setTimeout(() => resolve(user), 300);
    });
  }
};

const RealSmsService = {
  async sendCode(phone) {
    assertUniCloudReady();
    const result = getFunctionResult(await uniCloud.callFunction({
      name: SMS_CONFIG.UNICLOUD.functionName,
      data: {
        action: 'sendCode',
        phone
      }
    }), '发送失败');

    return {
      success: true,
      message: result.message || '验证码已发送',
      code: result.code || result.debugCode || ''
    };
  },

  async verifyCode(phone, code) {
    assertUniCloudReady();
    getFunctionResult(await uniCloud.callFunction({
      name: SMS_CONFIG.UNICLOUD.functionName,
      data: {
        action: 'verifyCode',
        phone,
        code,
        consume: false
      }
    }), '验证失败');

    return { success: true, message: '验证通过' };
  },

  async phoneLogin(phone, code) {
    assertUniCloudReady();
    const result = getFunctionResult(await uniCloud.callFunction({
      name: SMS_CONFIG.UNICLOUD.loginFunctionName,
      data: {
        type: 'phone',
        phone,
        code
      }
    }), '登录失败');

    return {
      id: result.userId,
      phone,
      nickname: result.nickname || '用户' + phone.slice(-4),
      avatar: result.avatar || '',
      token: result.token
    };
  }
};

export default SMS_CONFIG.USE_MOCK ? MockSmsService : RealSmsService;
export { SMS_CONFIG };
