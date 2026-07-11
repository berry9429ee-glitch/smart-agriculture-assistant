import { ServiceError, getErrorMessage } from '../core/cloud-client.js';

export function isRemoteFile(filePath = '') {
  return /^https?:\/\//i.test(filePath) || String(filePath).startsWith('cloud://');
}

export function isUploadDomainError(error) {
  const message = getErrorMessage(error, '');
  return message.includes('url not in domain list') || message.includes('合法域名');
}

export function isCloudUploadUnavailable(error) {
  return error?.code === 'CLOUD_UPLOAD_UNAVAILABLE';
}

export function getFileExtension(filePath = '', fallback = 'jpg') {
  const match = String(filePath).split('?')[0].match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : fallback;
}

export function getMimeType(filePath = '') {
  const extension = getFileExtension(filePath);
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  return 'image/jpeg';
}

export async function uploadCloudFile(filePath, cloudPath) {
  if (typeof uniCloud === 'undefined' || typeof uniCloud.uploadFile !== 'function') {
    throw new ServiceError('当前环境不支持 uniCloud 文件上传', {
      code: 'CLOUD_UPLOAD_UNAVAILABLE'
    });
  }
  const result = await uniCloud.uploadFile({ filePath, cloudPath });
  const fileID = result?.fileID || result?.fileId || '';
  if (!fileID) throw new ServiceError('图片上传失败', { code: 'EMPTY_FILE_ID' });
  return fileID;
}

export async function resolveCloudFileUrl(fileID) {
  if (!fileID || typeof uniCloud === 'undefined' || typeof uniCloud.getTempFileURL !== 'function') return '';
  const result = await uniCloud.getTempFileURL({ fileList: [fileID] });
  const file = result?.fileList?.[0];
  return file?.tempFileURL || file?.url || '';
}

export function compressImage(filePath, quality = 45) {
  if (typeof uni === 'undefined' || typeof uni.compressImage !== 'function') {
    return Promise.resolve(filePath);
  }

  return new Promise((resolve) => {
    uni.compressImage({
      src: filePath,
      quality,
      success: (result) => resolve(result.tempFilePath || filePath),
      fail: () => resolve(filePath)
    });
  });
}

export function readLocalFileBase64(filePath) {
  return new Promise((resolve, reject) => {
    const fileSystem = typeof uni !== 'undefined' && uni.getFileSystemManager
      ? uni.getFileSystemManager()
      : null;
    if (!fileSystem || typeof fileSystem.readFile !== 'function') {
      reject(new ServiceError('当前环境不支持读取图片文件', { code: 'FILE_SYSTEM_UNAVAILABLE' }));
      return;
    }

    fileSystem.readFile({
      filePath,
      encoding: 'base64',
      success: (result) => resolve(result.data),
      fail: (error) => reject(new ServiceError(getErrorMessage(error, '读取图片失败'), {
        code: 'FILE_READ_FAILED',
        cause: error
      }))
    });
  });
}

export function saveLocalFile(filePath) {
  if (!filePath || isRemoteFile(filePath) || typeof uni === 'undefined' || typeof uni.saveFile !== 'function') {
    return Promise.resolve(filePath);
  }

  return new Promise((resolve) => {
    uni.saveFile({
      tempFilePath: filePath,
      success: (result) => resolve(result.savedFilePath || filePath),
      fail: () => resolve(filePath)
    });
  });
}
