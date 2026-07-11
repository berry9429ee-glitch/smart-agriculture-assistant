import test from 'node:test';
import assert from 'node:assert/strict';

import TrendPredictor from '../domain/trend-predictor.js';

test('caps sensor history and predicts the configured number of points', () => {
  const predictor = new TrendPredictor({
    maxPoints: 3,
    predictionPoints: 2,
    now: () => new Date('2026-01-01T00:00:00Z'),
    random: () => 0.5
  });

  predictor.addData('temperature', 20, new Date('2026-01-01T00:00:00Z'));
  predictor.addData('temperature', 21, new Date('2026-01-01T00:10:00Z'));
  predictor.addData('temperature', 22, new Date('2026-01-01T00:20:00Z'));
  predictor.addData('temperature', 23, new Date('2026-01-01T00:30:00Z'));

  assert.equal(predictor.historyData.temperature.length, 3);
  assert.equal(predictor.historyData.temperature[0].value, 21);
  assert.equal(predictor.predict('temperature').length, 2);
});

test('builds deterministic synthetic history and bounded confidence', () => {
  const predictor = new TrendPredictor({
    maxPoints: 12,
    predictionPoints: 3,
    now: () => new Date('2026-01-01T00:00:00Z'),
    random: () => 0.5
  });

  const history = predictor.generateSyntheticHistory('ph', 6.5);
  assert.equal(history.length, 12);
  assert.ok(predictor.getConfidence('ph') >= 60);
  assert.ok(predictor.getConfidence('ph') <= 95);
});
