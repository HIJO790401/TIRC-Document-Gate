# TIRC Document Gate Local Edition

## Product Positioning / 產品定位
TIRC Document Gate Local Edition is a local pre-delivery confidential document interpretation-rights firewall.
TIRC Document Gate Local Edition 是本地部署的機密文件交付前解釋權審查站。

## Two Modes / 兩種模式
1. **GitHub Pages Demo** (static): fixed 5 cases only, no real document processing.
2. **Local Edition** (runtime): real document intake, policy setting, ICC review, hash-chain audit.

## What works now / 目前可用
- Local users/roles (admin, owner, reviewer, user) in SQLite.
- Document import: TXT / Markdown / PDF / DOCX.
- Local storage: `/data/documents` + SQLite metadata (`document_id`, `title`, `classification_level`, `content_text`, `sha256_hash`, `created_at`, `owner`, `status`).
- Per-document policy: T1/T2/T3 actors, local AI/external share/NDA flags, recipients, note.
- Access request actions: transfer / summarize / ask local AI / export / share external / final delivery.
- Deterministic ICC engine is final decision authority.
- Optional local LLM extraction endpoint (`/local-llm/extract`) for field draft assistance only.
- Append-only hash-chain audit log in `/data/audit_log.jsonl` + `/audit/verify`.

## Not claimed / 不宣稱
- Not auto-protecting all company documents.
- Not auto-integrated with Gmail/Slack/Drive.
- Not replacing IAM/SSO/DLP.

## Future integration / 未來整合
- SSO
- Google Drive / SharePoint / Slack / Gmail / GitHub connectors
- Enterprise DLP
- Windows / Mac agent

## Run
```bash
docker compose up --build
```
Backend: `http://localhost:8000`
Frontend: `http://localhost:5173`

Optional local model mode:
```bash
LOCAL_LLM_ENABLED=true docker compose --profile llm up --build
```

## Key APIs
- `GET /health`
- `GET /users`
- `POST /documents/import_text`
- `POST /documents/upload`
- `GET /documents`
- `GET /documents/{document_id}`
- `POST /documents/{document_id}/policy`
- `GET /documents/{document_id}/policy`
- `POST /access/request`
- `POST /interpretation/evaluate`
- `POST /local-llm/extract`
- `GET /audit`
- `GET /audit/{document_id}`
- `GET /audit/verify`

## GitHub Pages (manual)
```bash
cd demo
npm install
npm run build:pages
```
Settings → Pages → Deploy from branch → `main` / `docs`
