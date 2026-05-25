# TIRC Document Gate / 三重解釋權文件防火牆

## Official Portal
- https://hijo790401.github.io/shen-yao-portal/

## What is TIRC / 什麼是 TIRC
TIRC Document Gate adds an interpretation-rights gate on top of existing access control.
It evaluates who can transfer, interpret, and finally deliver document meaning with responsibility closure.

TIRC Document Gate 在既有權限框架上增加「解釋權與責任鏈」檢查，
用來判斷誰可以移交、解釋、最終交付文件意義。

## Fixed demo cases / 固定示範案例
GitHub Pages demo provides 5 fixed cases:
1. T1 transfer case (Bank Risk Policy)
2. T2 summarize case (Security Patch Report)
3. T3 final delivery case (NDA PoC Report)
4. HOLD review case (Internal Strategy Memo)
5. VOID interpretation case (Bank Risk Policy)

GitHub Pages 固定示範 5 個案例，直接展示 T1/T2/T3/HOLD/VOID 的 deterministic 判定。

## Run locally / 本地執行
```bash
cd demo
npm install
npm run dev
```

## Internal deployment / 內部部署
For real confidential files, deploy this repository in your own internal environment.
Connect local/private models as needed; documents do not need to leave your environment.

真正機密文件請部署在企業內部環境，可接本地模型或私有模型，資料不需離開內網。

```bash
docker compose up --build
```

## Manual GitHub Pages / 手動 Pages
```bash
cd demo
npm run build:pages
```

GitHub Settings → Pages → Deploy from branch → `main` / `docs`

## Security boundary / 安全邊界
- This project does not replace encryption, IAM, SSO, MFA, or DLP.
- It adds an interpretation-rights and responsibility-chain layer.
- GitHub Pages uses sample data only.

- 本專案不取代加密、IAM、SSO、MFA、DLP。
- 本專案是加在既有安全框架上的解釋權與責任鏈層。
- GitHub Pages 僅使用範例資料。
