// 模拟数据服务 - 用于测试环境
class MockService {
  // 模拟OneNet数据
  static getOneNetData() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          temperature: 20 + Math.random() * 10,
          humidity: 50 + Math.random() * 20,
          ph: 6 + Math.random() * 1.5,
          light: 600 + Math.random() * 400
        });
      }, 500);
    });
  }
  //新增
  static uploadOneNetData(data) {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (Math.random() > 0.2) {
          resolve({ success: true, msg: '模拟上传成功' });
        } else {
          resolve({ success: false, msg: '模拟上传失败' });
        }
      }, 600);
    });
  }
  // 模拟ESP32数据
  static getESP32Data() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          ph: 6.5 + Math.random() * 0.5,
          moisture: 40 + Math.random() * 20,
          temperature: 22 + Math.random() * 5,
          status: Math.random() > 0.3 ? '良好' : '需调整'
        });
      }, 300);
    });
  }
  
  // 模拟WebSocket连接
  static connectESP32Mock() {
    return {
      onOpen: (callback) => setTimeout(callback, 100),
      onMessage: null,
      send: () => {},
      close: () => {},
      simulateData: function() {
        setInterval(() => {
          if (this.onMessage) {
            this.onMessage({
              data: JSON.stringify({
                ph: 6.5 + Math.random() * 0.5,
                moisture: 40 + Math.random() * 20,
                temperature: 22 + Math.random() * 5,
                status: '良好'
              })
            });
          }
        }, 5000);
      }
    };
  }
  static connectESP32() {
    return this.connectESP32Mock();
  }
  static getDeviceProperty() {
     return Promise.resolve({
       EC :22,
       KAL :33,
       NP :24,
       PHO :44,
       PH :6.7,
       moi :51.1,
       temp :23.6
     });
  }
  // 模拟病虫害分析
  static analyzePest(imagePath) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const hasPest = Math.random() > 0.5;
        resolve({
          hasPest: hasPest,
          pestName: hasPest ? ['蚜虫', '红蜘蛛', '白粉病'][Math.floor(Math.random() * 3)] : null,
          severity: hasPest ? ['轻度', '中度', '重度'][Math.floor(Math.random() * 3)] : null,
          confidence: 85 + Math.random() * 15,
          suggestion: hasPest ? 
            '建议使用生物防治方法，喷洒稀释的肥皂水，并加强通风' : 
            '植株健康，继续保持良好的养护习惯',
          imagePath: imagePath
        });
      }, 1500);
    });
  }
  
  // 模拟大模型分析
  static callSparkModelMock(soilData) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const analysis = `
【土壤分析结果】

📊 数据评估：
• pH值 ${soilData.ph}：${soilData.ph >= 6 && soilData.ph <= 7 ? '✅ 适宜' : '⚠️ 需调整'}
• 湿度 ${soilData.moisture}%：${soilData.moisture >= 40 && soilData.moisture <= 60 ? '✅ 适宜' : '⚠️ 需调整'}
• 温度 ${soilData.temperature}°C：${soilData.temperature >= 20 && soilData.temperature <= 28 ? '✅ 适宜' : '⚠️ 需调整'}

🌱 选苗建议：
1. 株高要求：15-20cm的幼苗最为理想
2. 叶片标准：选择4-6片真叶，叶色浓绿
3. 根系要求：主根粗壮，须根发达，无病虫害

💡 养护建议：
${soilData.ph < 6 ? '• 土壤偏酸，建议施用适量石灰调节\n' : ''}
${soilData.ph > 7 ? '• 土壤偏碱，建议施用硫酸亚铁调节\n' : ''}
${soilData.moisture < 40 ? '• 土壤过干，增加浇水频率\n' : ''}
${soilData.moisture > 60 ? '• 土壤过湿，减少浇水，加强通风\n' : ''}
${soilData.temperature < 20 ? '• 温度偏低，考虑增温措施\n' : ''}
${soilData.temperature > 28 ? '• 温度偏高，注意遮阴降温\n' : ''}

⭐ 综合评分：${Math.floor(85 + Math.random() * 10)}/100
        `;
        
        resolve({
          success: true,
          analysis: analysis.trim(),
          timestamp: new Date().toISOString()
        });
      }, 2000);
    });
  }
  static callSparkModel(soilData) {
    return this.callSparkModelMock(soilData);
  }
  async loadTrendData() {
   this.chartLoading=true;
   setTimeout(()=>{
     let times=[],temps=[],hums=[];
     for(let i=0;i<24;i++){
       times.push(i+":00");
       temps.push(20+Math.random()*5);
       hums.push(55+Math.random()*10);
     }
     this.trendChartData={
       categories:times,
       series:[
         {name:"温度",data:temps},
         {name:"湿度",data:hums}
       ]
     };
     this.chartLoading=false;
   },1000)
}
}

export default MockService;
