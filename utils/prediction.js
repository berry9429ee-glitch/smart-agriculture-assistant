// utils/prediction.js - 精简版预测模块
class DataPrediction {
  constructor() {
    this.historyData = {
      temperature: [],
      humidity: [],
      ph: [],
      conductivity: []
    };
    
    this.config = {
      maxPoints: 144,        // 24小时，每10分钟一个点
      predictionPoints: 36   // 预测6小时
    };
  }

  // 添加数据点
  addDataPoint(type, value, time = new Date()) {
    if (!this.historyData[type]) {
      this.historyData[type] = [];
    }
    
    this.historyData[type].push({
      time: time,
      value: parseFloat(value)
    });
    
    // 保持数据点数量限制
    if (this.historyData[type].length > this.config.maxPoints) {
      this.historyData[type].shift();
    }
  }

  // 批量添加模拟历史数据（用于演示）
  generateMockHistory(type, currentValue) {
    const now = new Date();
    this.historyData[type] = [];
    
    // 生成过去24小时的模拟数据
    for (let i = 143; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 10 * 60000); // 10分钟间隔
      const hour = time.getHours();
      
      // 模拟日变化模式
      let value = currentValue;
      if (type === 'temperature') {
        // 温度：早晚低，中午高
        const dayPattern = Math.sin((hour - 6) * Math.PI / 12) * 3;
        value = currentValue + dayPattern + (Math.random() - 0.5) * 2;
      } else if (type === 'humidity') {
        // 湿度：早晚高，中午低
        const dayPattern = -Math.sin((hour - 6) * Math.PI / 12) * 10;
        value = currentValue + dayPattern + (Math.random() - 0.5) * 5;
      } else {
        // 其他：随机波动
        value = currentValue + (Math.random() - 0.5) * currentValue * 0.1;
      }
      
      this.historyData[type].push({
        time: time,
        value: Math.max(0, value)
      });
    }
  }

  // 简单预测算法
  predictFuture(type) {
    const data = this.historyData[type];
    if (!data || data.length < 3) return [];
    
    const predictions = [];
    const lastPoints = data.slice(-12); // 使用最后2小时数据
    
    // 计算趋势
    let sum = 0, weightSum = 0;
    lastPoints.forEach((point, index) => {
      const weight = index + 1; // 越近的数据权重越大
      sum += point.value * weight;
      weightSum += weight;
    });
    const weightedAvg = sum / weightSum;
    
    // 计算变化率
    const recentTrend = lastPoints.length > 1 ? 
      (lastPoints[lastPoints.length - 1].value - lastPoints[0].value) / lastPoints.length : 0;
    
    // 生成预测点
    const lastTime = data[data.length - 1].time;
    const lastValue = data[data.length - 1].value;
    
    for (let i = 1; i <= this.config.predictionPoints; i++) {
      const futureTime = new Date(lastTime.getTime() + i * 10 * 60000);
      const hour = futureTime.getHours();
      
      // 基础预测值
      let predictedValue = weightedAvg + recentTrend * i * 0.5;
      
      // 添加日模式影响
      if (type === 'temperature') {
        const dayPattern = Math.sin((hour - 6) * Math.PI / 12) * 2;
        predictedValue += dayPattern;
      } else if (type === 'humidity') {
        const dayPattern = -Math.sin((hour - 6) * Math.PI / 12) * 5;
        predictedValue += dayPattern;
      }
      
      // 添加轻微随机性
      predictedValue += (Math.random() - 0.5) * 0.5;
      
      // 渐进式回归到平均值
      const avgValue = sum / lastPoints.length;
      predictedValue = predictedValue * (1 - i * 0.01) + avgValue * (i * 0.01);
      
      predictions.push({
        time: futureTime,
        value: Math.max(0, predictedValue),
        isPrediction: true
      });
    }
    
    return predictions;
  }

  // 生成ECharts配置
  generateChartOption(type, title, unit, currentValue) {
    // 如果没有历史数据，生成模拟数据
    if (!this.historyData[type] || this.historyData[type].length === 0) {
      this.generateMockHistory(type, currentValue);
    }
    
    const historicalData = this.historyData[type];
    const predictedData = this.predictFuture(type);
    
    // 准备图表数据
    const historyPoints = historicalData.map(d => [
      d.time.getTime(),
      Math.round(d.value * 10) / 10
    ]);
    
    const predictionPoints = predictedData.map(d => [
      d.time.getTime(),
      Math.round(d.value * 10) / 10
    ]);
    
    // 连接历史和预测数据
    if (historyPoints.length > 0 && predictionPoints.length > 0) {
      predictionPoints.unshift(historyPoints[historyPoints.length - 1]);
    }
    
    // 计算Y轴范围
    const allValues = [...historyPoints, ...predictionPoints].map(p => p[1]);
    const minVal = Math.min(...allValues);
    const maxVal = Math.max(...allValues);
    const padding = (maxVal - minVal) * 0.1;
    
    return {
      backgroundColor: 'transparent',
      grid: {
        left: '12%',
        right: '5%',
        top: '15%',
        bottom: '12%'
      },
      title: {
        text: title,
        left: 'center',
        top: '2%',
        textStyle: {
          fontSize: 14,
          color: '#333',
          fontWeight: 'normal'
        }
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(50, 50, 50, 0.9)',
        borderColor: 'transparent',
        textStyle: {
          color: '#fff',
          fontSize: 12
        },
        formatter: function(params) {
          const date = new Date(params[0].value[0]);
          const timeStr = `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
          let result = timeStr + '<br/>';
          params.forEach(item => {
            const value = item.value[1];
            const marker = `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:${item.color};margin-right:5px;"></span>`;
            result += `${marker}${item.seriesName}: ${value}${unit}<br/>`;
          });
          return result;
        }
      },
      legend: {
        data: ['历史数据', '预测趋势'],
        bottom: '2%',
        textStyle: {
          fontSize: 11,
          color: '#666'
        }
      },
      xAxis: {
        type: 'time',
        boundaryGap: false,
        axisLine: {
          lineStyle: {
            color: '#E0E0E0'
          }
        },
        axisLabel: {
          fontSize: 10,
          color: '#999',
          formatter: function(value) {
            const date = new Date(value);
            return `${date.getHours()}:00`;
          }
        },
        splitLine: {
          show: false
        }
      },
      yAxis: {
        type: 'value',
        name: unit,
        nameTextStyle: {
          color: '#999',
          fontSize: 11
        },
        min: minVal - padding,
        max: maxVal + padding,
        axisLine: {
          lineStyle: {
            color: '#E0E0E0'
          }
        },
        axisLabel: {
          fontSize: 10,
          color: '#999'
        },
        splitLine: {
          lineStyle: {
            color: '#F0F0F0',
            type: 'dashed'
          }
        }
      },
      series: [
        {
          name: '历史数据',
          type: 'line',
          data: historyPoints,
          smooth: true,
          symbol: 'none',
          lineStyle: {
            width: 2,
            color: '#007AFF'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(0, 122, 255, 0.3)' },
                { offset: 1, color: 'rgba(0, 122, 255, 0.05)' }
              ]
            }
          }
        },
        {
          name: '预测趋势',
          type: 'line',
          data: predictionPoints,
          smooth: true,
          symbol: 'none',
          lineStyle: {
            width: 2,
            type: 'dashed',
            color: '#FF9500'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(255, 149, 0, 0.2)' },
                { offset: 1, color: 'rgba(255, 149, 0, 0.02)' }
              ]
            }
          }
        }
      ],
      // 添加标记线
      markLine: {
        silent: true,
        symbol: 'none',
        data: [
          {
            xAxis: new Date().getTime(),
            lineStyle: {
              color: '#FF3B30',
              type: 'solid',
              width: 1
            },
            label: {
              formatter: '当前',
              fontSize: 10
            }
          }
        ]
      }
    };
  }
}

export default new DataPrediction();
