# TIRC Document Gate / 三重解釋權文件防火牆

## What is TIRC Document Gate?
TIRC Document Gate adds an interpretation-rights gate above traditional file access control.  
TIRC Document Gate 在傳統檔案權限之上，加上一層「解釋權與責任鏈」檢查。

## Why traditional access control is not enough
Traditional ACL answers “can open file”. TIRC answers whether user can transfer, interpret, and deliver meaning with responsibility closure.  
傳統 ACL 只回答「能否打開文件」，TIRC 追問是否有資格移交、解釋、最終交付意義並承擔後果。

## T1 / T2 / T3 + HOLD / VOID
- T1_TRANSFER_ONLY: transfer only / 只允許移交
- T2_MIDDLE_INTERPRETATION: internal interpretation / 允許內部解釋協作
- T3_FINAL_DELIVERY: external delivery with closure / 可最終對外交付
- HOLD_REVIEW: requires manual review / 需人工審查
- VOID_INTERPRETATION: interpretation invalid / 解釋無效

## ICC Interpretation Closure Core
Check SUBJECT / BOUNDARY / CAUSE / REPLAY / REPAIR / RESPONSIBILITY each time; deterministic engine decides by closure quality, not fixed quizzes.

## Security boundary
- This project does not replace encryption, IAM, SSO, MFA, or DLP.
- It adds an interpretation-rights and responsibility-chain layer above existing security controls.
- Local-first by design.
- Confidential documents should remain inside the user’s own environment.
- The demo uses sample documents only.
- 本專案不取代加密、IAM、SSO、MFA、DLP。
- 本專案是在既有安全框架上增加「解釋權」與「責任鏈」層。
- 預設本地優先。
- 機密文件應留在使用者自己的內部環境。
- Demo 只使用假資料與範例文件。

## Project links
- Repository: https://github.com/HIJO790401/TIRC-Document-Gate
- Official Portal: https://hijo790401.github.io/shen-yao-portal/
- GitHub Pages Demo URL: https://hijo790401.github.io/TIRC-Document-Gate/

## Run frontend demo
```bash
cd demo
npm install
npm run dev
```

## Build GitHub Pages (manual)
```bash
cd demo
npm install
npm run build:pages
```

Then set in GitHub:

**Settings → Pages → Deploy from a branch → main → /docs**

## Local deployment
```bash
docker compose up --build
```
Frontend: http://localhost:5173  Backend: http://localhost:8000/health

## Local LLM connector
Use local model endpoint (e.g. Ollama). If unavailable, use deterministic mock extractor and deterministic ICC decision engine.

## Use cases
Banking confidential docs, security patch reports, NDA/PoC reports, internal strategy documents, AI agent document access gate.

## Roadmap
- policy simulation
- enterprise SSO integration adapters
- stronger compliance export formats
- model connector hardening
