# 📁 FileShare

Temporary file sharing web app built with **React + Netlify Functions + Netlify Blobs**.

Upload files, set an expiration period, and share temporary download links that **automatically expire**.

## ✨ Features

- 🖱️ **Drag & drop** file upload (or click to browse)
- ⏱️ **Configurable expiration** — 1 hour, 24 hours, 7 days, 30 days, or custom
- 📋 **One-click copy** download link to clipboard
- ⬇️ **Direct download** with proper filename and content type
- 🚫 **Auto-expiration** — expired links return HTTP 410 Gone
- 📱 **Responsive UI** — works on desktop and mobile

## 🏗 Architecture

```
Browser (React SPA)
    │
    ├── POST /api/upload        → Netlify Function → Netlify Blobs (store)
    ├── GET  /api/files         → Netlify Function → Netlify Blobs (list)
    └── GET  /api/download/:key → Netlify Function → Netlify Blobs (serve + expire check)
```

- **Frontend**: React 18 + Vite + TypeScript
- **Backend**: Netlify Functions (TypeScript + esbuild)
- **Storage**: Netlify Blobs with metadata-based expiration

## 🚀 Quick Deploy

### One-click Deploy to Netlify

Click the button below to deploy your own instance:

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/halbae99/fileshare)

### Manual Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/halbae99/fileshare.git
   cd fileshare
   npm install
   ```

2. **Local development**
   ```bash
   npm install -g netlify-cli
   netlify dev
   ```

3. **Deploy**
   ```bash
   netlify deploy --prod
   ```

## ⚙️ Configuration

All configuration is in `netlify.toml`:

- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Functions directory**: `netlify/functions`
- **Node.js version**: 20

## 📦 File Size Limit

Maximum file size is **5 MB** (constrained by Netlify Functions sync body limit).

## 🧹 Expiration & Cleanup

- Files are stored with an `expiresAt` timestamp in Netlify Blobs metadata.
- Expired files return HTTP `410 Gone` on download attempts.
- Files are not automatically deleted from storage (to keep implementation simple).
- For production use, consider adding a scheduled cleanup function.

## 📄 License

MIT
