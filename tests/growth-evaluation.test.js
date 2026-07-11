import test from 'node:test';
import assert from 'node:assert/strict';

import { evaluateGrowth } from '../domain/growth-evaluation.js';

test('calculates a data-driven growth score for valid crop inputs', () => {
  const result = evaluateGrowth({
    cropType: '水稻',
    growthStage: '生长期',
    height: 45,
    leafCount: 10,
    soilMoisture: 70,
    lightIntensity: 30000,
    temperature: 25
  });

  assert.equal(result.score, 100);
  assert.equal(result.results.length, 3);
  assert.match(result.suggestions[0], /参考范围/);
});

test('returns targeted suggestions when conditions exceed the profile', () => {
  const result = evaluateGrowth({
    cropType: '玉米',
    growthStage: '幼苗期',
    height: 8,
    leafCount: 2,
    soilMoisture: 90,
    lightIntensity: 70000,
    temperature: 35
  });

  assert.ok(result.score < 75);
  assert.ok(result.suggestions.some((item) => item.includes('减少灌溉')));
  assert.ok(result.suggestions.some((item) => item.includes('通风')));
});

test('rejects incomplete or invalid evaluation input', () => {
  assert.throws(
    () => evaluateGrowth({ cropType: '水稻', growthStage: '生长期', height: '' }),
    /株高必须/
  );
});
