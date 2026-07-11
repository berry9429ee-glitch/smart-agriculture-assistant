import test from 'node:test';
import assert from 'node:assert/strict';

import { ServiceError, unwrapCloudResult } from '../core/cloud-client.js';

test('unwrapCloudResult returns a successful cloud payload', () => {
  const result = unwrapCloudResult({
    result: { success: true, data: { temperature: 24 } }
  });

  assert.deepEqual(result.data, { temperature: 24 });
});

test('unwrapCloudResult turns a rejected payload into ServiceError', () => {
  assert.throws(
    () => unwrapCloudResult({ result: { success: false, message: '设备未绑定' } }),
    (error) => error instanceof ServiceError && error.message === '设备未绑定'
  );
});

test('unwrapCloudResult rejects an empty response', () => {
  assert.throws(
    () => unwrapCloudResult(null),
    (error) => error.code === 'EMPTY_CLOUD_RESPONSE'
  );
});
