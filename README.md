# TIRC Document Gate Local Edition

## 這個專案是什麼 / What this is
TIRC Document Gate Local Edition 是本地部署的交付前文件解釋權審查站。
It is a local pre-delivery interpretation-rights review station.

## 下載後怎麼用 / Quick local flow
1. `docker compose up --build`
2. 打開 `http://localhost:5173`
3. 匯入文件（TXT/MD/PDF/DOCX）
4. 設定三層解釋權 policy（T1/T2/T3）
5. 提出操作請求（transfer/summarize/ask local AI/export/share external/final delivery）
6. 查看 ICC 判定結果（requested_level/decision/access_level/scores/gaps）
7. 查看審計紀錄與 hash-chain 驗證

## 目前 Local Edition 可以做什麼 / What works now
- 本地帳號角色（admin/owner/reviewer/user）
- 本地文件匯入與列表
- 三層解釋權 policy 設定
- deterministic ICC 規則判定
- append-only hash-chain audit log
- optional Ollama/local LLM 抽取輔助（不決定放行）

## 目前不能宣稱 / Not claimed
- 不會自動接管整間公司的文件
- 不會自動整合 Gmail / Slack / Drive / SharePoint / SSO / DLP

## Future integration
- SSO
- Google Drive / SharePoint / Slack / Gmail / GitHub
- DLP integration
- Windows / Mac agent

## GitHub Pages
GitHub Pages 只做固定示範（manual `main/docs`），不處理真文件。
