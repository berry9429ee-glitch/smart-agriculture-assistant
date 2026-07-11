export class ServiceError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ServiceError';
    this.code = options.code || 'SERVICE_ERROR';
    this.details = options.details;
    this.cause = options.cause;
  }
}

export function getErrorMessage(error, fallbackMessage = '服务请求失败') {
  if (typeof error === 'string' && error.trim()) return error.trim();
  return error?.message || error?.errMsg || fallbackMessage;
}

export function unwrapCloudResult(response, options = {}) {
  const fallbackMessage = options.fallbackMessage || '云函数调用失败';
  const result = response && Object.prototype.hasOwnProperty.call(response, 'result')
    ? response.result
    : response;

  if (result === undefined || result === null) {
    throw new ServiceError('云函数未返回结果', { code: 'EMPTY_CLOUD_RESPONSE' });
  }

  if (result.success === false) {
    throw new ServiceError(result.message || fallbackMessage, {
      code: result.code || 'CLOUD_FUNCTION_REJECTED',
      details: result
    });
  }

  return result;
}

export async function callCloudFunction(name, data = {}, options = {}) {
  if (!name) {
    throw new ServiceError('缺少云函数名称', { code: 'MISSING_FUNCTION_NAME' });
  }
  if (typeof uniCloud === 'undefined' || typeof uniCloud.callFunction !== 'function') {
    throw new ServiceError('当前环境不支持 uniCloud，请使用已关联服务空间的发行包', {
      code: 'UNICLOUD_UNAVAILABLE'
    });
  }

  try {
    const response = await uniCloud.callFunction({ name, data });
    return unwrapCloudResult(response, options);
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError(getErrorMessage(error, options.fallbackMessage), {
      code: 'CLOUD_FUNCTION_FAILED',
      cause: error
    });
  }
}
