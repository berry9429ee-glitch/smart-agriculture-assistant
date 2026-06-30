'use strict';

// 生产环境请在 uniCloud 控制台配置环境变量：
//   WECHAT_APPID, WECHAT_APPSECRET, TOKEN_SECRET
const { execFileSync } = require('child_process');

const DEFAULT_APPID = 'wxd6d1ad52976d8288';

function readWindowsUserEnv(key) {
  if (process.platform !== 'win32') return '';
  try {
    const output = execFileSync('reg', ['query', 'HKCU\\Environment', '/v', key], {
      encoding: 'utf8',
      timeout: 2000,
      stdio: ['ignore', 'pipe', 'ignore']
    });
    const line = output.split(/\r?\n/).find((item) => item.includes(key));
    if (!line) return '';
    const parts = line.trim().split(/\s{2,}/);
    return parts[2] || '';
  } catch (err) {
    return '';
  }
}

function getEnv(key) {
  return process.env[key] || readWindowsUserEnv(key);
}

module.exports = {
  get appid() {
    return getEnv('WECHAT_APPID') || DEFAULT_APPID;
  },
  get secret() {
    return getEnv('WECHAT_APPSECRET') || '';
  },
  get tokenSecret() {
    return getEnv('TOKEN_SECRET') || '';
  }
};
