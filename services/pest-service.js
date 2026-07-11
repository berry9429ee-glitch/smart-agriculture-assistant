import config from '../config/index.js';
import { callCloudFunction } from '../core/cloud-client.js';
import {
  compressImage,
  getFileExtension,
  getMimeType,
  isCloudUploadUnavailable,
  isUploadDomainError,
  readLocalFileBase64,
  uploadCloudFile
} from './cloud-file-service.js';
import { analyzeDemoPest } from './demo-service.js';
import sessionService from './session-service.js';

async function analyzeCloudFile(imagePath) {
  const extension = getFileExtension(imagePath, 'jpg');
  const cloudPath = `pest/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
  const fileID = await uploadCloudFile(imagePath, cloudPath);
  const result = await callCloudFunction(config.CLOUD_FUNCTIONS.pestDetect, { fileID }, {
    fallbackMessage: '病虫害识别失败'
  });
  return {
    ...result,
    fileID,
    imagePath: result.imagePath || result.imageURL || imagePath
  };
}

async function analyzeBase64File(imagePath) {
  const compressedPath = await compressImage(imagePath);
  const imageBase64 = await readLocalFileBase64(compressedPath);
  const result = await callCloudFunction(config.CLOUD_FUNCTIONS.pestDetect, {
    imageBase64,
    mimeType: getMimeType(compressedPath || imagePath)
  }, { fallbackMessage: '病虫害识别失败' });
  return {
    ...result,
    fileID: '',
    imagePath: result.imagePath || imagePath,
    uploadSkipped: true
  };
}

export async function analyzeImage(imagePath) {
  if (!imagePath) throw new Error('缺少图片路径');
  if (config.USE_AI_MOCK === true || sessionService.isDemoMode()) {
    return analyzeDemoPest(imagePath);
  }

  try {
    return await analyzeCloudFile(imagePath);
  } catch (error) {
    if (!isUploadDomainError(error) && !isCloudUploadUnavailable(error)) throw error;
    return analyzeBase64File(imagePath);
  }
}

export default { analyzeImage };
