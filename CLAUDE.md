# CLAUDE.md — PTtv 復健部即時看板系統

## 專案概述

PTtv 是一個醫院復健部門的即時看板顯示系統，用於在候診區或治療區的螢幕上輪播 YouTube 影片、幻燈片照片與跑馬燈公告。系統包含前台看板頁面與後台管理介面，透過 Firebase Realtime Database 進行即時同步。

## 技術架構

- **前端**：純 HTML / CSS / JavaScript（無框架、無打包工具）
- **即時資料庫**：Firebase Realtime Database（SDK v9.6.10 compat 模式）
- **影片播放**：YouTube IFrame Player API
- **版本控制**：Git，託管於 GitHub（`ylcintwnca/PT`）
- **部署分支**：`main`（單一分支）

## 檔案結構

```
├── index.html      # 前台看板頁面（全螢幕顯示用）
├── admin.html      # 後台管理介面（設定影片 ID、跑馬燈文字、幻燈片圖片）
├── script.js       # 前台核心邏輯（Firebase 監聽、YouTube 播放器、幻燈片輪播、跑馬燈）
├── style.css       # 前台樣式（深藍色主題、全螢幕版面）
├── logo.png        # 看板 Logo 圖片
└── photo*.jpg      # 幻燈片用靜態照片
```

## Firebase 資料結構

| 路徑 | 類型 | 說明 |
|------|------|------|
| `ytId` | string | YouTube 影片 ID |
| `mqText` | string | 跑馬燈公告文字 |
| `photoFiles` | array | 選取的本地圖片檔名列表 |
| `photos` | array | 上傳圖片的 Base64 資料 |

## 開發慣例

### 語言
- 程式碼中的變數與函式名稱使用**英文**（camelCase）
- 使用者介面文字、註解與 commit message 使用**繁體中文**

### Commit 訊息格式
使用 conventional commits 風格，類型標籤用英文，描述用中文：
- `feat: 功能描述`
- `fix: 修正描述`
- `chore: 維護描述`

### CSS 設計原則
- 深藍色主題色系（`#003366`、`#001f3f`、`#001529`）
- 邊框使用 `#b0c4de`（淺鋼藍色）
- 全螢幕無捲軸設計（`100vw` × `100vh`，`overflow: hidden`）
- 字體優先順序：Segoe UI → 微軟正黑體 → 蘋方

### JavaScript 規範
- 使用 `const` / `let`，不使用 `var`
- Firebase 監聽使用 `.on('value')` 做即時同步
- YouTube Player 透過 `window.onYouTubeIframeAPIReady` 回呼初始化
- 圖片上傳使用 Canvas 壓縮後轉 Base64 存入 Firebase

### 前台看板行為
- YouTube 影片自動播放、靜音、循環播放
- 幻燈片每 **20 秒**切換，帶有 0.8 秒淡入動畫
- 跑馬燈使用 CSS `animation` 以 45 秒水平捲動
- 底部顯示即時日期時間（格式：`YYYY/M/D (週X) HH:MM`）

## 注意事項

- `admin.html` 內含 inline `<style>` 和 `<script>`，為獨立的單頁管理介面
- Firebase 設定（apiKey 等）直接寫在前端程式碼中，屬於公開的 client-side 設定
- 圖片以 Base64 儲存於 Firebase，大量圖片時需注意資料庫大小限制
- `script.js` 中的 `window.onerror` 會以 `alert()` 顯示錯誤，方便現場除錯
