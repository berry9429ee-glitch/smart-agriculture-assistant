import config from '../config/index.js';
import { callCloudFunction } from '../core/cloud-client.js';
import {
  getFileExtension,
  isRemoteFile,
  isUploadDomainError,
  resolveCloudFileUrl,
  saveLocalFile,
  uploadCloudFile
} from './cloud-file-service.js';
import sessionService from './session-service.js';
import smsService from './sms-service.js';

function normalizePhoneUser(result, phone) {
  return {
    id: result.userId || result.id,
    phone,
    nickname: result.nickname || `用户${phone.slice(-4)}`,
    avatar: result.avatar || '',
    avatarFileID: result.avatarFileID || ''
  };
}

export async function loginWithWechatCode(code) {
  if (!code) throw new Error('获取登录凭证失败');
  const result = await callCloudFunction(config.CLOUD_FUNCTIONS.login, { code }, {
    fallbackMessage: '微信登录失败'
  });
  const userInfo = result.userInfo || {};
  sessionService.saveSession({ token: result.token, userInfo });
  return userInfo;
}

export async function loginWithWechat() {
  if (typeof uni === 'undefined' || typeof uni.login !== 'function') {
    throw new Error('当前环境不支持微信登录');
  }
  const result = await uni.login({ provider: 'weixin' });
  return loginWithWechatCode(result.code);
}

export async function loginWithPhone(phone, code) {
  let result;
  if (config.USE_SMS_MOCK === true) {
    await smsService.verifyCode(phone, code);
    result = {
      token: `mock_token_${Date.now()}`,
      userId: `mock_user_${phone}`,
      nickname: `用户${phone.slice(-4)}`,
      avatar: ''
    };
  } else {
    result = await callCloudFunction(config.CLOUD_FUNCTIONS.login, {
      type: 'phone',
      phone,
      code
    }, { fallbackMessage: '手机号登录失败' });
  }

  const userInfo = normalizePhoneUser(result, phone);
  sessionService.saveSession({ token: result.token, userInfo });
  return userInfo;
}

export function enterDemoMode() {
  return sessionService.startDemoSession();
}

export function needsProfile(userInfo = {}) {
  const nickname = userInfo.nickname || userInfo.nickName || '';
  const hasAvatar = Boolean(userInfo.avatar || userInfo.avatarUrl || userInfo.avatarFileID);
  return !nickname || nickname === '微信用户' || !hasAvatar;
}

export async function resolveUserAvatar(userInfo = {}) {
  if (userInfo.avatarFileID) {
    try {
      const temporaryUrl = await resolveCloudFileUrl(userInfo.avatarFileID);
      if (temporaryUrl) return temporaryUrl;
    } catch (error) {
      // Fall back to the cached public or local avatar below.
    }
  }
  return userInfo.avatar || userInfo.avatarUrl || '/static/avatar-default.png';
}

async function prepareAvatar({ avatar, avatarFileID, userId }) {
  if (!avatar || isRemoteFile(avatar)) {
    return { avatar, avatarFileID: avatarFileID || '', uploadSkipped: false };
  }

  const extension = getFileExtension(avatar, 'jpg');
  try {
    const uploadedFileID = await uploadCloudFile(
      avatar,
      `avatars/${userId || 'user'}-${Date.now()}.${extension}`
    );
    return { avatar, avatarFileID: uploadedFileID, uploadSkipped: false };
  } catch (error) {
    if (!isUploadDomainError(error) && error?.code !== 'CLOUD_UPLOAD_UNAVAILABLE') throw error;
    return {
      avatar: await saveLocalFile(avatar),
      avatarFileID: '',
      uploadSkipped: true
    };
  }
}

export async function updateProfile(profile = {}) {
  const nickname = String(profile.nickname || '').trim();
  if (!nickname) throw new Error('请输入昵称');
  if (!profile.avatar && !profile.avatarFileID) throw new Error('请选择头像');

  const currentUser = sessionService.getUserInfo() || {};
  if (sessionService.isDemoMode()) {
    const avatar = isRemoteFile(profile.avatar)
      ? profile.avatar
      : await saveLocalFile(profile.avatar);
    const userInfo = {
      ...currentUser,
      nickname,
      avatar,
      avatarFileID: profile.avatarFileID || ''
    };
    sessionService.updateUserInfo(userInfo);
    sessionService.setProfileEditorSkipped(false);
    return { userInfo, avatar, avatarFileID: userInfo.avatarFileID, uploadSkipped: false };
  }

  const avatarData = await prepareAvatar({
    avatar: profile.avatar,
    avatarFileID: profile.avatarFileID,
    userId: currentUser.id
  });
  const result = await callCloudFunction(config.CLOUD_FUNCTIONS.login, {
    type: 'profile',
    token: sessionService.getToken(),
    nickname,
    avatar: avatarData.uploadSkipped || avatarData.avatarFileID ? '' : avatarData.avatar,
    avatarFileID: avatarData.avatarFileID
  }, { fallbackMessage: '用户资料保存失败' });
  const userInfo = {
    ...currentUser,
    ...(result.userInfo || {}),
    nickname,
    avatar: avatarData.avatar,
    avatarFileID: avatarData.avatarFileID
  };

  sessionService.updateUserInfo(userInfo);
  sessionService.setProfileEditorSkipped(false);
  return { userInfo, ...avatarData };
}

export default {
  loginWithWechat,
  loginWithWechatCode,
  loginWithPhone,
  enterDemoMode,
  needsProfile,
  resolveUserAvatar,
  updateProfile
};
