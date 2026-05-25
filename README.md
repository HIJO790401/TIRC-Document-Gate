# TIRC Document Gate — V1 Local Edition 使用手冊

## V1 目標
使用者下載 Repo 後，只需執行：

```bash
docker compose up --build
```

開啟前端：`http://localhost:5173`

即可在網頁完成完整流程：
**匯入文件 → 設定三層解釋權 → 送審 → 看判定 → 看審計紀錄 → 驗證 hash-chain**。

---

## 啟動方式
```bash
git clone https://github.com/HIJO790401/TIRC-Document-Gate.git
cd TIRC-Document-Gate
docker compose up --build
```

- 前端：`http://localhost:5173`
- 後端 API：`http://localhost:8000`

> GitHub Pages 固定示範仍保留手動模式，不新增 Actions。

---

## V1 Local Edition 操作台（8 區塊）
進入首頁下方 **V1 Local Edition 操作台**，依序操作：

1. **身份流程**：先選擇操作者（actor）與文件 owner。
2. **匯入文件**：可匯入文字或上傳檔案（TXT/MD/PDF/DOCX）。
3. **文件列表**：選擇文件並綁定流程上下文。
4. **三層解釋權設定**：以勾選 users 方式設定 T1/T2/T3。
5. **送審**：填寫閉環欄位並送審。
6. **判定結果**：卡片化顯示 decision / level / gaps / audit id。
7. **審計紀錄**：表格顯示、支援 filter、JSON 匯出、hash-chain 驗證。
8. **本地模型狀態**：只顯示後端環境狀態，不在頁面修改 env。

---

## V1 已能做什麼
- 本地帳號與角色（admin / owner / reviewer / user）。
- 文件匯入與抽取文字。
- 每份文件獨立 policy（三層 actor、NDA、外部分享等）。
- 依操作類型進行 deterministic ICC 判定。
- 產出審計紀錄並串接 hash-chain。
- 一鍵驗證 audit chain 完整性。

---

## 仍屬未來整合（非 V1 範圍）
- SSO / IAM 深度整合。
- Google Drive / SharePoint / Slack / Gmail / GitHub 連接器。
- 企業 DLP 與端點代理程式。

---

## GitHub Pages（固定示範，手動）
```bash
cd demo
npm install
npm run build:pages
```

GitHub 設定：
`Settings → Pages → Deploy from branch → main / docs`
