import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createSoilSnapshot,
  evaluateSensorStatus,
  getSensorAlerts,
  normalizeSensorData
} from '../domain/sensor-data.js';

test('normalizes OneNET field aliases into the app sensor model', () => {
  const data = normalizeSensorData({
    temp: '23.6',
    moi: 51.1,
    PH: 6.7,
    EC: 1200,
    NP: 24,
    PHO: 44,
    KAL: 33
  });

  assert.deepEqual(
    {
      temperature: data.temperature,
      moisture: data.moisture,
      ph: data.ph,
      ec: data.ec,
      nitrogen: data.nitrogen,
      phosphorus: data.phosphorus,
      potassium: data.potassium
    },
    { temperature: 23.6, moisture: 51.1, ph: 6.7, ec: 1200, nitrogen: 24, phosphorus: 44, potassium: 33 }
  );
});

test('evaluates health from canonical sensor limits', () => {
  assert.equal(evaluateSensorStatus({ temperature: 24, moisture: 55, ph: 6.5 }), '正常');
  assert.equal(evaluateSensorStatus({ temperature: 35, moisture: 30, ph: 8 }), '异常');
  assert.deepEqual(
    getSensorAlerts({ temperature: 35, moisture: 30, ph: 8 }),
    ['温度过高', '湿度过低', '土壤过碱']
  );
});

test('requires complete soil data for seedling analysis', () => {
  assert.deepEqual(
    createSoilSnapshot({ temperature: 24, moisture: 55, ph: 6.5 }),
    { temperature: 24, moisture: 55, ph: 6.5, status: '良好' }
  );
  assert.throws(() => createSoilSnapshot({ temperature: 24 }), /数据不完整/);
});
