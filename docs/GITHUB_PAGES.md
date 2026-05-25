# GitHub Pages Manual Deployment

This project uses **manual GitHub Pages deployment** from the `main` branch `docs/` folder.

## Build static demo into docs/

```bash
cd demo
npm install
npm run build:pages
```

After build, static files are generated to:

- `docs/index.html`
- `docs/assets/*`

## GitHub Pages setting

In GitHub repository settings:

1. Open **Settings → Pages**
2. Under **Build and deployment**, choose **Deploy from a branch**
3. Branch: `main`
4. Folder: `/docs`
5. Save

Site URL:

- https://hijo790401.github.io/TIRC-Document-Gate/
