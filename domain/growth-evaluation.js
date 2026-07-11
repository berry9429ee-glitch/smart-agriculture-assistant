const CROP_PROFILES = Object.freeze({
  水稻: {
    moisture: [60, 80], temperature: [20, 30], light: [18000, 45000],
    stages: { 幼苗期: [[8, 20], [3, 6]], 生长期: [[20, 70], [6, 14]], 开花期: [[70, 110], [10, 18]], 结果期: [[80, 130], [10, 20]] }
  },
  小麦: {
    moisture: [50, 70], temperature: [15, 25], light: [20000, 50000],
    stages: { 幼苗期: [[8, 18], [3, 6]], 生长期: [[18, 55], [5, 12]], 开花期: [[50, 90], [8, 16]], 结果期: [[60, 110], [8, 18]] }
  },
  玉米: {
    moisture: [55, 75], temperature: [20, 30], light: [25000, 60000],
    stages: { 幼苗期: [[10, 30], [3, 7]], 生长期: [[30, 150], [6, 16]], 开花期: [[140, 260], [12, 24]], 结果期: [[160, 300], [12, 26]] }
  },
  大豆: {
    moisture: [55, 75], temperature: [20, 28], light: [20000, 50000],
    stages: { 幼苗期: [[8, 20], [2, 6]], 生长期: [[20, 70], [5, 14]], 开花期: [[40, 100], [8, 18]], 结果期: [[50, 120], [8, 20]] }
  }
});

function requirePositiveNumber(value, label) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${label}必须是大于 0 的数字`);
  return parsed;
}

function scoreRange(value, range) {
  const [minimum, maximum] = range;
  if (value >= minimum && value <= maximum) return 100;
  const span = Math.max(maximum - minimum, 1);
  const distance = value < minimum ? minimum - value : value - maximum;
  return Math.max(30, Math.round(100 - (distance / span) * 70));
}

function describeScore(score) {
  if (score >= 90) return { value: '优秀', status: 'success' };
  if (score >= 75) return { value: '良好', status: 'success' };
  if (score >= 60) return { value: '需关注', status: 'warning' };
  return { value: '需改善', status: 'danger' };
}

function addRangeSuggestion(suggestions, value, range, lowText, highText) {
  if (value < range[0]) suggestions.push(lowText);
  if (value > range[1]) suggestions.push(highText);
}

export function evaluateGrowth(input = {}) {
  const profile = CROP_PROFILES[input.cropType];
  if (!profile) throw new Error('暂不支持该作物类型');
  const stageProfile = profile.stages[input.growthStage];
  if (!stageProfile) throw new Error('暂不支持该生长阶段');

  const values = {
    height: requirePositiveNumber(input.height, '株高'),
    leafCount: requirePositiveNumber(input.leafCount, '叶片数'),
    soilMoisture: requirePositiveNumber(input.soilMoisture, '土壤湿度'),
    lightIntensity: requirePositiveNumber(input.lightIntensity, '光照强度'),
    temperature: requirePositiveNumber(input.temperature, '温度')
  };

  const scores = {
    height: scoreRange(values.height, stageProfile[0]),
    leafCount: scoreRange(values.leafCount, stageProfile[1]),
    soilMoisture: scoreRange(values.soilMoisture, profile.moisture),
    lightIntensity: scoreRange(values.lightIntensity, profile.light),
    temperature: scoreRange(values.temperature, profile.temperature)
  };
  const growthScore = Math.round(scores.height * 0.55 + scores.leafCount * 0.45);
  const environmentScore = Math.round(scores.lightIntensity * 0.4 + scores.temperature * 0.6);
  const totalScore = Math.round(
    scores.height * 0.2 +
    scores.leafCount * 0.15 +
    scores.soilMoisture * 0.25 +
    scores.lightIntensity * 0.15 +
    scores.temperature * 0.25
  );
  const suggestions = [];

  addRangeSuggestion(suggestions, values.height, stageProfile[0], '株高低于当前阶段参考范围，建议检查养分与根系状态。', '株高高于当前阶段参考范围，注意避免徒长并增强通风。');
  addRangeSuggestion(suggestions, values.leafCount, stageProfile[1], '叶片数偏少，建议检查光照、养分和病虫害情况。', '叶片较密，注意改善通风和下层叶片采光。');
  addRangeSuggestion(suggestions, values.soilMoisture, profile.moisture, '土壤湿度偏低，建议分次补水并复测。', '土壤湿度偏高，建议减少灌溉并检查排水。');
  addRangeSuggestion(suggestions, values.lightIntensity, profile.light, '光照不足，建议延长有效光照时间。', '光照偏强，建议在高温时段适当遮阴。');
  addRangeSuggestion(suggestions, values.temperature, profile.temperature, '温度偏低，建议采取保温措施。', '温度偏高，建议通风、遮阴并及时补水。');
  if (suggestions.length === 0) suggestions.push('各项指标处于参考范围，建议保持当前管理方式并持续监测。');

  return {
    score: totalScore,
    results: [
      { label: '株叶生长', ...describeScore(growthScore) },
      { label: '水分状况', ...describeScore(scores.soilMoisture) },
      { label: '环境适应', ...describeScore(environmentScore) }
    ],
    suggestions,
    metricScores: scores
  };
}

export { CROP_PROFILES };
