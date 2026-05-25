# TIRC Document Gate / 三重解釋權文件防火牆

## Live Demo
- https://hijo790401.github.io/TIRC-Document-Gate/

## Official Portal
- https://hijo790401.github.io/shen-yao-portal/

## What is TIRC
TIRC Document Gate adds an interpretation-rights gate on top of existing access control.
It checks who can transfer, interpret, and finally deliver document meaning with responsibility closure.

TIRC Document Gate 在既有權限框架之上，增加「解釋權與責任鏈」檢查。
系統會判斷誰可以移交、解釋、最終交付文件意義。

## Run locally
```bash
cd demo
npm install
npm run dev
```

## Build GitHub Pages manually
```bash
cd demo
npm install
npm run build:pages
```

GitHub Pages setting:
- Settings → Pages → Deploy from a branch
- Branch: `main`
- Folder: `/docs`

## Local deployment
```bash
docker compose up --build
```

## Security boundary
- This project does not replace encryption, IAM, SSO, MFA, or DLP.
- It adds an interpretation-rights and responsibility-chain layer.
- Use sample data on GitHub Pages.
- For real confidential files, deploy inside your own environment.
