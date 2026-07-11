export class TrendPredictor {
  constructor(options = {}) {
    this.historyData = {};
    this.maxPoints = options.maxPoints || 144;
    this.predictionPoints = options.predictionPoints || 36;
    this.now = options.now || (() => new Date());
    this.random = options.random || Math.random;
  }

  addData(type, value, time = this.now()) {
    const parsedValue = Number(value);
    if (!type || !Number.isFinite(parsedValue)) return false;
    if (!this.historyData[type]) this.historyData[type] = [];

    this.historyData[type].push({
      time: new Date(time),
      value: parsedValue
    });

    if (this.historyData[type].length > this.maxPoints) {
      this.historyData[type].shift();
    }
    return true;
  }

  generateSyntheticHistory(type, currentValue) {
    const baseline = Number(currentValue);
    const safeBaseline = Number.isFinite(baseline) ? baseline : 0;
    const history = [];
    const now = this.now();

    for (let index = this.maxPoints - 1; index >= 0; index--) {
      const time = new Date(now.getTime() - index * 10 * 60 * 1000);
      const hour = time.getHours();
      let value = safeBaseline;

      if (type === 'temperature') {
        value += Math.sin((hour - 6) * Math.PI / 12) * 3 + (this.random() - 0.5) * 2;
      } else if (type === 'humidity') {
        value += -Math.sin((hour - 6) * Math.PI / 12) * 10 + (this.random() - 0.5) * 5;
      } else {
        value += (this.random() - 0.5) * Math.max(Math.abs(safeBaseline), 1) * 0.1;
      }

      history.push({ time, value: Math.max(0, value) });
    }

    this.historyData[type] = history;
    return history;
  }

  predict(type) {
    const data = this.historyData[type];
    if (!data || data.length < 3) return [];

    const recentData = data.slice(-12);
    const lastPoint = data[data.length - 1];
    const trend = recentData.length > 1
      ? (recentData[recentData.length - 1].value - recentData[0].value) / recentData.length
      : 0;
    const predictions = [];

    for (let index = 1; index <= this.predictionPoints; index++) {
      const futureTime = new Date(lastPoint.time.getTime() + index * 10 * 60 * 1000);
      let value = lastPoint.value + trend * index * 0.3;
      const hour = futureTime.getHours();

      if (type === 'temperature') value += Math.sin((hour - 6) * Math.PI / 12) * 1.5;
      if (type === 'humidity') value += -Math.sin((hour - 6) * Math.PI / 12) * 3;

      predictions.push({ time: futureTime, value: Math.max(0, value) });
    }

    return predictions;
  }

  getConfidence(type) {
    const data = this.historyData[type];
    if (!data || data.length < 10) return 60;

    const values = data.slice(-10).map((item) => item.value);
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + Math.pow(value - average, 2), 0) / values.length;
    const coefficient = Math.sqrt(variance) / (Math.abs(average) || 1);

    return Math.round(Math.max(60, Math.min(95, (1 - coefficient) * 100)));
  }
}

export default TrendPredictor;
