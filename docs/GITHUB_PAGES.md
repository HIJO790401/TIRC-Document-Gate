# GitHub Pages Setup (Manual, No Auto-Deploy)

This repository is configured for **manual GitHub Pages publishing**.

- Source repo: https://github.com/HIJO790401/TIRC-Document-Gate
- Official portal: https://hijo790401.github.io/shen-yao-portal/

## 1) Build the demo locally

```bash
cd demo
npm install
npm run build
```

## 2) Publish manually

Use one of these options:

- Upload `demo/dist` artifacts to your preferred static hosting flow.
- Or push `demo/dist` contents to a dedicated Pages branch (`gh-pages`) using your own release process.

## 3) Vite base path

Set base path during build when needed:

```bash
VITE_BASE_PATH=/shen-yao-portal/ npm run build
```

If you host under a different path, replace `/shen-yao-portal/` accordingly.

## 4) Why no auto deploy workflow

Auto deployment GitHub Actions workflow has been removed intentionally, so repository users can control their own publishing and approval process.
