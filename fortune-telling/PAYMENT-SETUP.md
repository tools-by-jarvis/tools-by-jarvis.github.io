# 💰 天機命理 - 付費報告系統設定指南

## 架構概覽

```
用戶 → paid-report.html（填表）→ Google Apps Script（產生ECPay表單）
  → ECPay付款 → Google Apps Script（回呼）→ 呼叫OpenAI生成報告
  → 儲存至Google Sheet → report.html（顯示報告）
```

## 設定步驟

### 1. 建立 Google Sheet

1. 前往 [Google Sheets](https://sheets.google.com) 建立新試算表
2. 將工作表命名為 `Orders`
3. 第一列填入標題：
   ```
   Token | MerchantTradeNo | TradeNo | ProductType | Amount | BirthData | Gender | Question | Status | Report | CreatedAt
   ```
4. 複製試算表網址中的 ID（`https://docs.google.com/spreadsheets/d/【這段就是ID】/edit`）

### 2. 部署 Google Apps Script

1. 前往 [Google Apps Script](https://script.google.com) → 新增專案
2. 將 `google-apps-script.js` 的內容全部貼入 `Code.gs`
3. 修改 `CONFIG` 區塊：
   - `SHEET_ID`: 貼上步驟 1 的 Google Sheet ID
   - `OPENAI_API_KEY`: 填入你的 OpenAI API Key
   - `SITE_URL`: 確認為你的 GitHub Pages 網址
4. 部署：
   - 點擊「部署」→「新增部署」
   - 類型選「網頁應用程式」
   - 執行身分：「自己」
   - 存取權限：「任何人」
   - 點擊「部署」
5. 複製部署的網址（格式：`https://script.google.com/macros/s/xxxxx/exec`）

### 3. 更新網站設定

在以下檔案中，將 `YOUR_GOOGLE_SCRIPT_URL` 替換為 Apps Script 部署網址：

- `paid-report.html` → `<form>` 的 `action` 屬性
- `report.html` → JavaScript 中的 `scriptURL` 變數

### 4. 推送更新

```bash
cd fortune-site
git add -A
git commit -m "Configure Google Apps Script URL"
git push
```

## ECPay 設定

目前使用**測試環境**：
- MerchantID: `3002607`
- API: `https://payment-stage.ecpay.com.tw`

### 切換正式環境
1. 至 [ECPay 商家後台](https://vendor.ecpay.com.tw) 申請正式帳號
2. 取得正式 MerchantID、HashKey、HashIV
3. 更新 Google Apps Script 中的 CONFIG
4. 將 ECPAY_URL 改為 `https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5`

## 測試流程

1. 前往 `paid-report.html` 選擇產品
2. 填寫出生資料，點擊「前往付款」
3. 在 ECPay 測試頁面使用測試信用卡號：
   - 卡號：`4311-9522-2222-2222`
   - 有效期：任意未來日期
   - CVV：`222`
4. 付款完成後會跳轉至報告頁面
5. 報告生成約需 30-60 秒

## 費用估算

- OpenAI gpt-4o-mini：每篇報告約 NT$1-2
- ECPay 手續費：2.75%（正式環境）
- Google Apps Script：免費

## 疑難排解

- **報告一直顯示「生成中」**：檢查 Google Sheet 的 Status 欄位是否有 error
- **ECPay 回呼失敗**：確認 Apps Script 部署為「任何人」可存取
- **CheckMacValue 錯誤**：確認 HashKey/HashIV 正確，且使用 SHA256
