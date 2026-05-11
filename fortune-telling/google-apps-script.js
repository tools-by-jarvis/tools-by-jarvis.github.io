/**
 * ============================================================
 * 天機命理 - ECPay 付費報告 Google Apps Script 中介層
 * ============================================================
 * 
 * 部署步驟：
 * 1. 前往 https://script.google.com 建立新專案
 * 2. 將此檔案內容全部貼入 Code.gs
 * 3. 替換下方 CONFIG 中的設定值
 * 4. 部署 > 新增部署 > 網頁應用程式
 *    - 執行身分：自己
 *    - 存取權限：任何人
 * 5. 複製部署網址，替換 paid-report.html 中的 YOUR_GOOGLE_SCRIPT_URL
 * 6. 建立 Google Sheet，將 Sheet ID 填入 CONFIG.SHEET_ID
 *    - 第一列標題：Token | MerchantTradeNo | TradeNo | ProductType | Amount | BirthData | Gender | Question | Status | Report | CreatedAt
 */

// ===== 設定 =====
var CONFIG = {
  // ECPay 測試環境
  MERCHANT_ID: '3002607',
  HASH_KEY: 'pwFHCqoQZGmho4w6',
  HASH_IV: 'EkRm7iFT261dpevs',
  ECPAY_URL: 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5',
  
  // OpenAI
  OPENAI_API_KEY: 'YOUR_OPENAI_API_KEY',
  OPENAI_MODEL: 'gpt-4o-mini',
  
  // Google Sheet（建立一個新的 Google Sheet，複製其 ID）
  SHEET_ID: 'YOUR_GOOGLE_SHEET_ID',
  SHEET_NAME: 'Orders',
  
  // 你的網站網址（GitHub Pages）
  SITE_URL: 'https://tools-by-jarvis.github.io/fortune-telling'
};

// ===== doGet: 處理報告查詢 & ECPay 回傳 =====
function doGet(e) {
  var params = e.parameter;
  
  // 報告查詢
  if (params.action === 'report' && params.token) {
    return getReport(params.token);
  }
  
  // ECPay OrderResultURL 回傳（GET）
  if (params.MerchantTradeNo) {
    return showOrderResult(params);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ error: '無效請求' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== doPost: 處理訂單建立 & ECPay 回呼 =====
function doPost(e) {
  var params = e.parameter;
  
  // ECPay 付款結果回呼（ReturnURL）- 有 RtnCode 表示來自 ECPay
  if (params.RtnCode !== undefined) {
    return handleECPayCallback(params);
  }
  
  // 從我們網站來的訂單
  if (params.action === 'create_order') {
    return createOrder(params);
  }
  
  return ContentService.createTextOutput('0|ErrorMessage');
}

// ===== 建立訂單，產生 ECPay 表單 =====
function createOrder(params) {
  var token = Utilities.getUuid();
  var tradeNo = params.merchantTradeNo || ('TJ' + Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMddHHmmss') + Math.floor(Math.random() * 1000));
  
  // 確保 MerchantTradeNo 不超過 20 字元
  tradeNo = tradeNo.substring(0, 20);
  
  var birthData = JSON.stringify({
    year: params.birthYear,
    month: params.birthMonth,
    day: params.birthDay,
    hour: params.birthHour,
    direction: params.direction || ''
  });
  
  // 寫入 Google Sheet
  var sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    var ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    sheet.appendRow(['Token', 'MerchantTradeNo', 'TradeNo', 'ProductType', 'Amount', 'BirthData', 'Gender', 'Question', 'Status', 'Report', 'CreatedAt']);
  }
  sheet.appendRow([
    token, tradeNo, '', params.productType, params.amount, 
    birthData, params.gender, params.question || '', 
    'pending', '', new Date().toISOString()
  ]);
  
  var scriptUrl = ScriptApp.getService().getUrl();
  
  // 組裝 ECPay 參數
  var tradeDate = params.tradeDate || Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy/MM/dd HH:mm:ss');
  
  var ecpayParams = {
    MerchantID: CONFIG.MERCHANT_ID,
    MerchantTradeNo: tradeNo,
    MerchantTradeDate: tradeDate,
    PaymentType: 'aio',
    TotalAmount: params.amount,
    TradeDesc: encodeURIComponent('天機命理AI報告'),
    ItemName: params.productName || '命理報告',
    ReturnURL: scriptUrl,
    OrderResultURL: scriptUrl + '?token=' + token,
    ClientBackURL: (params.clientBackURL || CONFIG.SITE_URL + '/report.html') + '?token=' + token,
    ChoosePayment: 'ALL',
    EncryptType: '1',
    CustomField1: token
  };
  
  // 產生 CheckMacValue
  ecpayParams.CheckMacValue = generateCheckMacValue(ecpayParams);
  
  // 建立自動提交表單
  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>前往付款...</title></head><body>';
  html += '<form id="ecpay" method="POST" action="' + CONFIG.ECPAY_URL + '">';
  for (var key in ecpayParams) {
    html += '<input type="hidden" name="' + key + '" value="' + ecpayParams[key] + '">';
  }
  html += '</form>';
  html += '<p style="text-align:center;padding:3rem;font-family:sans-serif;color:#666;">正在前往綠界付款頁面...</p>';
  html += '<script>document.getElementById("ecpay").submit();<\/script>';
  html += '</body></html>';
  
  return HtmlService.createHtmlOutput(html);
}

// ===== ECPay 付款回呼 =====
function handleECPayCallback(params) {
  // 驗證 CheckMacValue
  var receivedMac = params.CheckMacValue;
  var verifyParams = {};
  for (var key in params) {
    if (key !== 'CheckMacValue') {
      verifyParams[key] = params[key];
    }
  }
  var calculatedMac = generateCheckMacValue(verifyParams);
  
  if (receivedMac !== calculatedMac) {
    return ContentService.createTextOutput('0|CheckMacValue Error');
  }
  
  // 更新 Google Sheet
  var sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.SHEET_NAME);
  var data = sheet.getDataRange().getValues();
  var tradeNo = params.MerchantTradeNo;
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] === tradeNo) {
      var row = i + 1;
      sheet.getRange(row, 3).setValue(params.TradeNo || '');  // ECPay TradeNo
      
      if (params.RtnCode === '1') {
        // 付款成功
        sheet.getRange(row, 9).setValue('paid');
        
        // 觸發報告生成
        var orderData = {
          token: data[i][0],
          productType: data[i][3],
          birthData: data[i][5],
          gender: data[i][6],
          question: data[i][7],
          row: row
        };
        generateReport(orderData);
      } else {
        sheet.getRange(row, 9).setValue('failed: ' + params.RtnMsg);
      }
      break;
    }
  }
  
  return ContentService.createTextOutput('1|OK');
}

// ===== 顯示訂單結果（ECPay OrderResultURL）=====
function showOrderResult(params) {
  var token = params.token || params.CustomField1 || '';
  var reportUrl = CONFIG.SITE_URL + '/report.html?token=' + token;
  
  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8">';
  html += '<style>body{background:#0a0015;color:#eee8d5;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;}';
  html += '.box{max-width:500px;padding:3rem;}.spinner{font-size:3rem;animation:s 2s linear infinite;display:inline-block;}';
  html += '@keyframes s{from{transform:rotate(0)}to{transform:rotate(360deg)}}';
  html += 'a{color:#ffd700;text-decoration:none;font-size:1.2rem;}</style></head><body>';
  html += '<div class="box"><div class="spinner">☯</div>';
  html += '<h2 style="color:#ffd700;margin:1.5rem 0;">付款成功！報告生成中...</h2>';
  html += '<p style="margin-bottom:2rem;">AI 正在為您撰寫專屬命理報告，約需 1-2 分鐘</p>';
  html += '<a href="' + reportUrl + '">👉 前往查看報告</a>';
  html += '<p style="margin-top:1rem;font-size:0.8rem;color:#666;">若報告尚未出現，請稍後重新整理頁面</p>';
  html += '</div></body></html>';
  
  return HtmlService.createHtmlOutput(html);
}

// ===== 取得報告 =====
function getReport(token) {
  var sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.SHEET_NAME);
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === token) {
      var status = data[i][8];
      var report = data[i][9];
      
      if (status === 'completed' && report) {
        var productNames = {
          'bazi_detail': '八字命盤AI詳解',
          'qimen_detail': '奇門遁甲AI詳解',
          'full_report': '完整命理報告'
        };
        var result = {
          title: productNames[data[i][3]] || '命理報告',
          date: data[i][10],
          report: report,
          status: 'completed'
        };
        return ContentService.createTextOutput(JSON.stringify(result))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      if (status === 'paid' || status === 'generating') {
        return ContentService.createTextOutput(JSON.stringify({ error: '報告生成中，請稍後重新整理' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      return ContentService.createTextOutput(JSON.stringify({ error: '訂單狀態：' + status }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ error: '找不到此報告，請確認連結是否正確' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== AI 報告生成 =====
function generateReport(orderData) {
  var sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.SHEET_NAME);
  sheet.getRange(orderData.row, 9).setValue('generating');
  
  var birthData = JSON.parse(orderData.birthData);
  var birthStr = birthData.year + '年' + birthData.month + '月' + birthData.day + '日 ' + getHourName(birthData.hour);
  
  var prompts = {
    'bazi_detail': '你是一位精通八字命理的大師。請根據以下出生資料，撰寫一份2500-3000字的詳細八字命盤分析報告。\n\n' +
      '出生資料：' + birthStr + '，性別：' + orderData.gender + '\n' +
      (orderData.question ? '特別想了解：' + orderData.question + '\n' : '') +
      '\n請包含以下內容（用繁體中文）：\n' +
      '1. 【四柱八字排盤】列出年柱、月柱、日柱、時柱\n' +
      '2. 【五行分析】五行強弱分佈、喜用神判斷\n' +
      '3. 【十神解讀】正官、偏官、正印、偏印等十神關係與性格影響\n' +
      '4. 【格局判斷】命格特質與先天優勢\n' +
      '5. 【大運流年】近十年大運走勢分析，特別標注2026年運勢\n' +
      '6. 【事業運勢】適合的行業方向、貴人方位\n' +
      '7. 【感情婚姻】感情模式、桃花運勢、適合對象特質\n' +
      '8. 【健康提醒】需注意的身體部位、養生建議\n' +
      '9. 【開運建議】幸運色、幸運數字、開運方位、佩戴建議\n\n' +
      '語氣專業但親切，避免過於負面的措辭，以正向引導為主。每個段落用清楚的標題分隔。',
    
    'qimen_detail': '你是一位精通奇門遁甲的大師。請根據以下資料，撰寫一份2500-3000字的奇門遁甲詳解報告。\n\n' +
      '出生資料：' + birthStr + '，性別：' + orderData.gender + '\n' +
      (birthData.direction ? '關注方位：' + birthData.direction + '\n' : '') +
      (orderData.question ? '特別想了解：' + orderData.question + '\n' : '') +
      '\n請包含以下內容（用繁體中文）：\n' +
      '1. 【起局說明】根據出生時間排出的奇門遁甲盤面概述\n' +
      '2. 【九宮飛星】各宮位星門神將的配置與含義\n' +
      '3. 【用神分析】根據問題判斷用神所在宮位\n' +
      '4. 【吉凶方位】八方吉凶判斷、最佳行動方位\n' +
      '5. 【時機建議】最佳行動時間、應避開的時段\n' +
      '6. 【具體行動方案】根據盤面給出具體可執行的建議\n' +
      '7. 【貴人方位】能得到幫助的方位與人物特徵\n' +
      '8. 【注意事項】需要避開的方位、時間與事項\n' +
      '9. 【總結建議】綜合分析與實用開運指南\n\n' +
      '語氣專業但親切，具體且實用，讓讀者能直接依照建議行動。',
    
    'full_report': '你是一位精通八字命理、奇門遁甲與姓名學的命理大師。請根據以下資料，撰寫一份3000字以上的完整命理報告。\n\n' +
      '出生資料：' + birthStr + '，性別：' + orderData.gender + '\n' +
      (birthData.direction ? '關注方位：' + birthData.direction + '\n' : '') +
      (orderData.question ? '特別想了解：' + orderData.question + '\n' : '') +
      '\n請包含以下章節（用繁體中文）：\n\n' +
      '第一章【八字命盤分析】\n- 四柱排盤、五行分析、十神解讀、格局判斷\n- 大運流年（重點2026）\n\n' +
      '第二章【奇門遁甲指引】\n- 九宮飛星排盤、吉凶方位、時機建議\n- 具體行動方案\n\n' +
      '第三章【綜合運勢】\n- 事業發展建議\n- 感情婚姻指引\n- 財運分析\n- 健康提醒\n\n' +
      '第四章【年度開運指南】\n- 2026年每月運勢重點\n- 幸運色、數字、方位\n- 佩戴與居家風水建議\n- 具體開運行動清單\n\n' +
      '語氣專業而溫暖，內容豐富具體，讓讀者感受到物超所值。'
  };
  
  var prompt = prompts[orderData.productType] || prompts['bazi_detail'];
  
  try {
    var response = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + CONFIG.OPENAI_API_KEY,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        model: CONFIG.OPENAI_MODEL,
        messages: [
          { role: 'system', content: '你是一位經驗豐富的命理大師，精通八字、奇門遁甲、紫微斗數和姓名學。你的分析專業、詳細、有洞察力，同時語氣溫暖正向。請用繁體中文回答。' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 4000,
        temperature: 0.8
      }),
      muteHttpExceptions: true
    });
    
    var result = JSON.parse(response.getContentText());
    var report = result.choices[0].message.content;
    
    // 儲存報告
    sheet.getRange(orderData.row, 9).setValue('completed');
    sheet.getRange(orderData.row, 10).setValue(report);
    
    return report;
  } catch (err) {
    sheet.getRange(orderData.row, 9).setValue('error: ' + err.message);
    return null;
  }
}

// ===== CheckMacValue 生成（ECPay SHA256）=====
function generateCheckMacValue(params) {
  // 1. 按照參數名稱字母排序
  var keys = Object.keys(params).sort(function(a, b) {
    return a.toLowerCase().localeCompare(b.toLowerCase());
  });
  
  // 2. 組合字串
  var raw = 'HashKey=' + CONFIG.HASH_KEY;
  for (var i = 0; i < keys.length; i++) {
    raw += '&' + keys[i] + '=' + params[keys[i]];
  }
  raw += '&HashIV=' + CONFIG.HASH_IV;
  
  // 3. URL encode（轉小寫）
  raw = encodeURIComponent(raw).toLowerCase();
  
  // 4. 特殊字元還原（ECPay 規範）
  raw = raw.replace(/%2d/g, '-')
           .replace(/%5f/g, '_')
           .replace(/%2e/g, '.')
           .replace(/%21/g, '!')
           .replace(/%2a/g, '*')
           .replace(/%28/g, '(')
           .replace(/%29/g, ')')
           .replace(/%20/g, '+');
  
  // 5. SHA256 雜湊，轉大寫
  var hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw, Utilities.Charset.UTF_8);
  var hex = '';
  for (var j = 0; j < hash.length; j++) {
    var b = (hash[j] < 0 ? hash[j] + 256 : hash[j]).toString(16);
    hex += (b.length === 1 ? '0' : '') + b;
  }
  
  return hex.toUpperCase();
}

// ===== 時辰名稱 =====
function getHourName(hour) {
  var names = ['子時', '丑時', '寅時', '卯時', '辰時', '巳時', '午時', '未時', '申時', '酉時', '戌時', '亥時'];
  if (hour === 'unknown') return '時辰不詳';
  var idx = parseInt(hour);
  return names[idx] || '時辰不詳';
}
