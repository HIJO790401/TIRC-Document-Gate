# TIRC Document Gate / 三重解釋權文件防火牆

TIRC Document Gate 是本地部署的「交付前文件解釋權審查站」。

## Live Demo (GitHub Pages)
- Static demo only: fixed sample cases, no real file processing.

## Official Portal
- https://hijo790401.github.io/shen-yao-portal/

## What is TIRC / 什麼是 TIRC
- Check not only file open permission, but interpretation and delivery rights before transfer/share/final delivery.
- 以 T1/T2/T3 + HOLD/VOID 進行可追溯判定，最終權限由 deterministic ICC engine 決定。

## What works now (Local MVP)
- Local document intake: TXT / Markdown / PDF (DOCX is next step).
- Local document metadata + SHA256 hash stored in `/data`.
- Document list and retrieval APIs.
- Per-document interpretation-rights policy (T1/T2/T3 actors + local AI/external/NDA flags).
- Access request flow (transfer/summarize/ask local AI/export/share external/final delivery).
- Deterministic ICC decision output: T1/T2/T3/HOLD/VOID.
- Local audit log to `/data/audit_log.jsonl`.
- Optional local model extraction connector (Ollama), never used for final ALLOW/HOLD/VOID decision.

## Run local MVP
```bash
docker compose up --build
```
Backend: `http://localhost:8000/health`
Frontend: `http://localhost:5173`

## Optional local model (Ollama)
Default is deterministic mode (`LOCAL_LLM_ENABLED=false`).

To enable optional extraction:
```bash
export LOCAL_LLM_ENABLED=true
export OLLAMA_BASE_URL=http://localhost:11434
export LOCAL_LLM_MODEL=llama3.1:8b
docker compose --profile llm up --build
```

## Manual GitHub Pages (Demo only)
```bash
cd demo
npm install
npm run build:pages
```
GitHub Settings → Pages → Deploy from branch → `main` / `docs`

## API quick flow
1. `POST /documents/import_text` or `POST /documents/import_file`
2. `POST /documents/{document_id}/policy`
3. `POST /access/request`
4. `GET /audit`

## Completed vs Future
### 已完成 / Completed
- GitHub Pages static demo
- Local deterministic ICC backend
- Local document intake and list
- Local audit log
- Optional local model extraction

### 未完成 / Future enterprise integration
- SSO integration
- Google Drive / SharePoint / Slack / Gmail connectors
- Windows / Mac endpoint agent
- Enterprise DLP integration

## Security boundary / 安全邊界
- This project does not replace encryption, IAM, SSO, MFA, or DLP.
- 本專案不宣稱可自動保護全公司所有文件。
- It is a local pre-delivery interpretation-rights review station.
