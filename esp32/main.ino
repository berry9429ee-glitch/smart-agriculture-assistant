#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <WebSocketsServer.h>

// WiFi配置
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// 创建Web服务器和WebSocket服务器
WebServer server(80);
WebSocketsServer webSocket = WebSocketsServer(8080);

// 传感器引脚定义
const int PH_PIN = 34;
const int MOISTURE_PIN = 35;
const int TEMP_PIN = 32;

// 数据结构
struct SoilData {
  float ph;
  float moisture;
  float temperature;
  String status;
};

SoilData currentData;

void setup() {
  Serial.begin(115200);
  
  // 连接WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi...");
  }
  
  Serial.println("Connected to WiFi");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
  
  // 初始化传感器引脚
  pinMode(PH_PIN, INPUT);
  pinMode(MOISTURE_PIN, INPUT);
  pinMode(TEMP_PIN, INPUT);
  
  // 设置HTTP路由
  server.on("/api/soil-data", HTTP_GET, handleGetSoilData);
  server.on("/api/control", HTTP_POST, handleControl);
  
  // 启动服务器
  server.begin();
  webSocket.begin();
  webSocket.onEvent(webSocketEvent);
  
  Serial.println("HTTP Server started");
  Serial.println("WebSocket Server started on port 8080");
}

void loop() {
  server.handleClient();
  webSocket.loop();
  
  // 每5秒读取一次传感器数据
  static unsigned long lastRead = 0;
  if (millis() - lastRead > 5000) {
    lastRead = millis();
    readSensorData();
    broadcastData();
  }
}

void readSensorData() {
  // 读取传感器数据（这里使用模拟值，实际应根据传感器调整）
  int phRaw = analogRead(PH_PIN);
  int moistureRaw = analogRead(MOISTURE_PIN);
  int tempRaw = analogRead(TEMP_PIN);
  
  // 转换为实际值
  currentData.ph = map(phRaw, 0, 4095, 0, 14 * 100) / 100.0;
  currentData.moisture = map(moistureRaw, 0, 4095, 0, 100);
  currentData.temperature = map(tempRaw, 0, 4095, -10, 50);
  
  // 评估状态
  if (currentData.ph >= 6.0 && currentData.ph <= 7.0 &&
      currentData.moisture >= 40 && currentData.moisture <= 60 &&
      currentData.temperature >= 20 && currentData.temperature <= 28) {
    currentData.status = "良好";
  } else {
    currentData.status = "需调整";
  }
  
  Serial.print("pH: ");
  Serial.print(currentData.ph);
  Serial.print(", Moisture: ");
  Serial.print(currentData.moisture);
  Serial.print("%, Temperature: ");
  Serial.print(currentData.temperature);
  Serial.println("°C");
}

void handleGetSoilData() {
  StaticJsonDocument<200> doc;
  doc["ph"] = currentData.ph;
  doc["moisture"] = currentData.moisture;
  doc["temperature"] = currentData.temperature;
  doc["status"] = currentData.status;
  doc["timestamp"] = millis();
  
  String response;
  serializeJson(doc, response);
  
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", response);
}

void handleControl() {
  if (server.hasArg("plain")) {
    String body = server.arg("plain");
    StaticJsonDocument<200> doc;
    DeserializationError error = deserializeJson(doc, body);
    
    if (!error) {
      String action = doc["action"];
      
      if (action == "water") {
        // 控制浇水
        Serial.println("Watering...");
        // 添加控制继电器的代码
      } else if (action == "light") {
        // 控制补光
        Serial.println("Adjusting light...");
        // 添加控制LED的代码
      }
      
      server.send(200, "application/json", "{\"status\":\"success\"}");
    } else {
      server.send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
    }
  } else {
    server.send(400, "application/json", "{\"error\":\"No body\"}");
  }
}

void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.printf("[%u] Disconnected!\n", num);
      break;
    case WStype_CONNECTED:
      {
        IPAddress ip = webSocket.remoteIP(num);
        Serial.printf("[%u] Connected from %s\n", num, ip.toString().c_str());
        
        // 发送当前数据给新连接的客户端
        sendDataToClient(num);
      }
      break;
    case WStype_TEXT:
      Serial.printf("[%u] Received text: %s\n", num, payload);
      // 处理接收到的命令
      handleWebSocketMessage(num, (char*)payload);
      break;
  }
}

void sendDataToClient(uint8_t num) {
  StaticJsonDocument<200> doc;
  doc["ph"] = currentData.ph;
  doc["moisture"] = currentData.moisture;
  doc["temperature"] = currentData.temperature;
  doc["status"] = currentData.status;
  doc["timestamp"] = millis();
  
  String message;
  serializeJson(doc, message);
  webSocket.sendTXT(num, message);
}

void broadcastData() {
  StaticJsonDocument<200> doc;
  doc["ph"] = currentData.ph;
  doc["moisture"] = currentData.moisture;
  doc["temperature"] = currentData.temperature;
  doc["status"] = currentData.status;
  doc["timestamp"] = millis();
  
  String message;
  serializeJson(doc, message);
  webSocket.broadcastTXT(message);
}

void handleWebSocketMessage(uint8_t num, char* payload) {
  StaticJsonDocument<200> doc;
  DeserializationError error = deserializeJson(doc, payload);
  
  if (!error) {
    String command = doc["command"];
    
    if (command == "getData") {
      sendDataToClient(num);
    } else if (command == "control") {
      String action = doc["action"];
      // 执行控制命令
      Serial.println("Control command: " + action);
      webSocket.sendTXT(num, "{\"status\":\"success\"}");
    }
  }
}