# Personal Blog Template

A visual-first personal blog template with a built-in editor, article and project management, multilingual UI, and a secure Node-backed studio.

一个以视觉表达为核心的个人博客模板，内置内容编辑后台、文章与项目管理、多语言界面，以及基于 Node 的安全开发者编辑台。

![Template cover](./docs/cover.png)

## Preview

- Repository: `https://github.com/your-name/personal-blog-template`
- GitHub Pages: `https://your-name.github.io/personal-blog-template/`

Important:
- GitHub Pages is a static preview only.
- Secure studio login and server-side persistence work only when the Node server is running.

注意：
- GitHub Pages 只提供静态前端预览。
- 安全登录、内容保存和开发者编辑能力只有在 Node 服务运行时才可用。

## Why This Template

This project is for people who want more than a plain markdown blog. It combines:

- a portfolio-style homepage
- article and project presentation
- multiple visual modes on the same content layer
- a built-in studio for editing content without touching code
- a server-backed auth flow for the editor

这不是一个单纯的 markdown 博客壳，而是把下面这些能力放进同一个站点：

- 个人主页展示
- 文章与项目内容呈现
- 同一份内容下的多主题视觉模式
- 无需改代码的内置编辑后台
- 基于服务端的开发者编辑登录流程

## Features

- Built-in studio for editing articles, projects, site copy, social links, custom cards, browser title, and background settings
- Server-side studio auth with cookie session support
- Article attachments with custom inline placement inside content
- Cover image upload for articles and home cards
- Music player with custom source input
- Language switching, font switching, theme switching, and palette control
- Multiple visual modes on the same content layer
- Guestbook support
- GitHub Pages workflow for static preview deployment
- Salted scrypt password hashing (`npm run hash-password`), with automatic upgrade of legacy SHA-256 hashes
- Persistent studio sessions that survive server restarts, with idle and absolute expiry
- Unique article/project slugs enforced on the server (`my-post`, `my-post-2`, ...)
- RSS feed (`/rss.xml`), `sitemap.xml` and `robots.txt`, plus per-article SEO meta (Open Graph, Twitter, canonical, JSON-LD) on share URLs
- Article search across every language and the article body, with tag filters that live in the URL (`#/articles?q=glass&tag=BUILD`)
- Fonts loaded on demand (only the active preset, `font-display: swap`) and the studio editor split into its own lazy chunk
- ESLint config and a `node:test` suite that covers the server routes

- 内置开发者编辑，可修改文章、项目、站点文案、社交链接、自定义卡片、标签页标题和背景设置
- 开发者编辑使用服务端鉴权与 Cookie 会话
- 支持图片、音频、视频和其他附件，并可插入正文指定位置
- 支持文章封面与首页卡片封面上传
- 支持自定义音源的音乐播放器
- 支持语言、字体、主题和调色盘切换
- 支持同一份内容切换不同视觉模式
- 自带留言板
- 自带 GitHub Pages 静态预览工作流
- 使用加盐 scrypt 存储密码（`npm run hash-password`），旧的 SHA-256 哈希登录后自动升级
- 编辑台会话持久化到文件，服务重启后仍然有效，并有空闲与最长有效期
- 服务端保证文章 / 项目 slug 唯一（重复时自动追加 `-2`、`-3`）
- 提供 RSS（`/rss.xml`）、`sitemap.xml`、`robots.txt`，分享链接带有每篇文章的 SEO 元信息
- 文章搜索覆盖所有语言与正文，标签筛选同步到 URL
- 字体按需加载，编辑台代码拆分为独立的懒加载模块
- 内置 ESLint 配置与覆盖服务端路由的 `node:test` 测试

## Theme Modes

The template currently ships with these page modes:

- `Default`: the main liquid and atmospheric presentation
- `X Flow`: a cleaner editorial-style mode with a different layout language
- `Antigravity`: a more experimental visual mode

当前模板包含这些主题模式：

- `Default`：主站风格，偏液态与氛围感
- `X Flow`：更克制、更像编辑设计站点的样式
- `Antigravity`：更实验性的视觉模式

The content stays the same while the presentation changes.

文字内容保持一致，变化的是整页的视觉逻辑与排版方式。

## Tech Stack

- React 18
- Vite
- React Router
- Express
- GSAP
- Three.js
- Plain CSS

## Quick Start

Requirements: Node.js 20.19 or newer (required by Vite 7).

环境要求：Node.js 20.19 或更高版本。

### 1. Install

```bash
npm install
```

### 2. Front-end Only

```bash
npm run dev
```

Use this when you only want to preview the UI.

只看前端界面时用这个。

### 3. Full Local Stack

```bash
npm run dev:full
```

This starts:

- the Vite front end
- the Node server
- secure studio auth
- server-side content persistence

这个命令会同时启动：

- Vite 前端
- Node 服务
- 开发者编辑安全登录
- 服务端内容持久化

### 4. Production Build

```bash
npm run build
npm run start
```

### 5. Checks

```bash
npm run lint    # ESLint (flat config in eslint.config.js)
npm test        # node:test suite in test/ (server routes, hashing, sessions, feeds, search)
npm run check   # lint + test + build, same as CI
```

## Environment Variables

Copy [.env.example](./.env.example) to `.env` and edit it. `server.js` loads `.env` automatically on startup; variables already set in the real environment take priority.

复制 `.env.example` 为 `.env` 并修改。`server.js` 启动时会自动读取 `.env`，系统环境变量优先。

```bash
cp .env.example .env
```

```bash
STUDIO_USERNAME=ADMIN
STUDIO_PASSWORD=CHANGE_ME_123
# Recommended instead of STUDIO_PASSWORD: output of `npm run hash-password`
# STUDIO_PASSWORD_HASH=
SESSION_SECRET=replace-with-a-long-random-secret
PORT=8787
```

Optional:

```bash
NODE_ENV=production        # adds the Secure flag to the session cookie
TRUST_PROXY=loopback       # which proxies may set X-Forwarded-For (1 on Render/Railway/Fly, false if exposed directly)
SESSION_IDLE_MINUTES=45    # sliding idle timeout for studio sessions
SESSION_MAX_DAYS=7         # absolute session lifetime, even when active
SITE_URL=https://blog.example.com/   # public base URL for RSS, sitemap and canonical links
SITE_LANGUAGE=zh           # zh | en | ja | ko, used for feed text and share-page meta
```

### Password hashing

Generate a salted scrypt hash (Node's built-in `crypto`, no extra dependency) and paste it into `.env`:

```bash
npm run hash-password            # prompts twice, input hidden
# or: echo -n "your-password" | npm run hash-password --silent
```

The output looks like `scrypt:16384:8:1:<salt>:<hash>`. It contains no `$`, so it needs no quoting in `.env`, shells or docker-compose.

Upgrading from an older version: an existing `STUDIO_PASSWORD_HASH` that is a plain SHA-256 hex digest keeps working. On the first successful login the server stores a scrypt hash of the same password in `server/data/auth.json` and uses that from then on. If you later change `STUDIO_PASSWORD_HASH` or `STUDIO_PASSWORD`, the stored upgrade is ignored automatically and the new value applies. Replacing the legacy value with `npm run hash-password` output is still recommended.

Generate a session secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Sessions

Studio sessions are kept in `server/data/sessions.json`, so a restart or redeploy on the same disk does not log you out. Only SHA-256 digests of session ids are written to disk. A session ends after `SESSION_IDLE_MINUTES` without activity or `SESSION_MAX_DAYS` after login, whichever comes first. Changing `SESSION_SECRET` signs everyone out.

密码与会话：
- 使用 `npm run hash-password` 生成加盐 scrypt 哈希，填入 `STUDIO_PASSWORD_HASH`
- 旧的 SHA-256 哈希仍可登录，首次登录成功后会自动升级并保存到 `server/data/auth.json`
- 会话保存在 `server/data/sessions.json`，重启服务不会掉线；更换 `SESSION_SECRET` 会让所有会话失效

Recommended:
- change the default credentials immediately
- use `STUDIO_PASSWORD_HASH` in real deployments
- use a strong `SESSION_SECRET`
- set `TRUST_PROXY` to match your hosting so login lockout and guestbook rate limits see the real client IP

The server prints a warning at startup when `NODE_ENV=production` is set but the default password or secret is still in use.

建议：
- 立刻修改默认账号密码
- 正式部署时优先使用 `STUDIO_PASSWORD_HASH`
- 为 `SESSION_SECRET` 使用足够长的随机值

## RSS, Sitemap and SEO

When the Node server runs it serves, from the live store:

- `/rss.xml` (also `/feed.xml`): RSS 2.0 feed of the newest 50 articles
- `/sitemap.xml` and `/robots.txt`
- `/articles/<slug>` and `/projects/<slug>`: shareable URLs whose HTML already contains the page's title, description, Open Graph / Twitter tags, canonical link and JSON-LD, so link previews and crawlers see real content. Browsers are moved onto the matching `#/articles/<slug>` route automatically.

Set `SITE_URL` in production so these links use your public domain rather than the request's `Host` header.

Static builds (GitHub Pages, Cloudflare) cannot run the server, so `npm run build` writes `dist/rss.xml`, `dist/sitemap.xml` and `dist/robots.txt` from the seed content in `src/data/siteContent.js` when `SITE_URL` is set. The GitHub Pages workflow sets it to `https://<owner>.github.io/<repo>/` (override with a repository variable named `SITE_URL`). These static links use hash routes (`#/articles/<slug>`); search engines treat those as the home page, so per-article indexing needs the Node server.

RSS、站点地图与 SEO：Node 服务提供 `/rss.xml`、`/sitemap.xml`、`/robots.txt`，以及带有完整元信息的 `/articles/<slug>` 分享链接；静态部署在设置 `SITE_URL` 后会在构建时生成这些文件。

## Article Search

The article index searches titles, excerpts, body text and footnotes in every language, plus tags, slugs and dates. Several words must all match. Compound tags such as `ESSAY / DIRECTION` become separate filter chips with counts, and tags on an article page link to the filtered list. The query and tag are kept in the URL (`#/articles?q=glass&tag=BUILD`), so filtered views can be shared and bookmarked. Press `Esc` in the search box to clear it.

## Windows Scripts

After building, you can use:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-blog.ps1
```

Stop it with:

```powershell
powershell -ExecutionPolicy Bypass -File .\stop-blog.ps1
```

## Deployment Notes

### GitHub Pages

This repository includes a GitHub Pages workflow:

- [`.github/workflows/pages.yml`](./.github/workflows/pages.yml)

When you push to `main`:

- the static site is built automatically
- GitHub Pages is updated automatically
- the Node backend is not deployed there

### Cloudflare Workers (static)

[`wrangler.jsonc`](./wrangler.jsonc) serves the built `dist/` folder as static assets with SPA fallback. Like GitHub Pages, this is front end only.

```bash
npm run deploy:cloudflare
```

### Node Hosting

If you want the secure studio to work in production, deploy it to a Node-capable environment such as:

- Render
- Railway
- VPS + Nginx + PM2
- any other standard Node host

如果你希望正式环境里也能使用安全开发者编辑，请部署到支持 Node 的平台，而不是只放在 GitHub Pages 上。

## Project Structure

```text
.
├─ src/
│  ├─ App.jsx                 routes, layout, pages
│  ├─ pages/StudioPage.jsx    the studio editor (lazy-loaded)
│  ├─ lib/                    content model, search, fonts, storage, API helpers
│  ├─ hooks/                  shared hooks
│  ├─ components/
│  ├─ data/siteContent.js
│  ├─ styles.css
│  ├─ theme-presets.css
│  └─ theme-scenes.css
├─ server.js                  entry point (loads .env, starts server/app.js)
├─ server/
│  ├─ app.js                  Express app: auth, API, feeds, SEO, static hosting
│  └─ lib/                    password hashing, sessions, slugs, feeds, SEO
├─ scripts/hash-password.js
├─ test/                      node:test suite
├─ eslint.config.js
├─ .env.example
├─ start-blog.ps1
├─ stop-blog.ps1
└─ .github/workflows/         pages.yml (deploy), ci.yml (lint, test, build)
```

## Main Files You’ll Edit

- [src/data/siteContent.js](./src/data/siteContent.js): seed content, UI copy, presets, and defaults
- [src/App.jsx](./src/App.jsx): app structure, routes, pages, theme switching
- [src/pages/StudioPage.jsx](./src/pages/StudioPage.jsx): the studio editor
- [src/styles.css](./src/styles.css): shared styling
- [src/theme-presets.css](./src/theme-presets.css): per-theme page styling
- [src/theme-scenes.css](./src/theme-scenes.css): theme scene visuals
- [server/app.js](./server/app.js): auth, persistence, API, feeds, SEO, and static hosting

## Data Storage

When the Node server runs, content is stored in:

- `server/data/store.json`: articles, projects, site content, guestbook
- `server/data/sessions.json`: active studio sessions (hashed ids)
- `server/data/auth.json`: upgraded password hash, only after a legacy SHA-256 login

The whole `server/data/` folder is ignored by Git and acts as runtime storage. Back it up together.

Slugs are unique: saving an article or project whose slug is already used by another item stores it as `slug-2`, `slug-3`, ... and the studio switches to the stored slug.

Node 服务运行时，内容会写入：

- `server/data/store.json`

这个文件已被 Git 忽略，用作运行时存储。

## Security Boundary

This project is safer than a pure front-end password gate because the studio login is handled on the server. But it is still a template, not a hardened SaaS product.

Current protection includes:

- server-side credential verification with salted scrypt hashes
- signed, HttpOnly, SameSite=Strict session cookies backed by a file store with idle and absolute expiry
- basic security headers
- request origin checks
- lockout for repeated failed login attempts (5 failures per username + IP locks for 15 minutes)
- guestbook rate limit (5 posts per minute per IP) and a 100 KB body limit on public endpoints
- external links in editable content are limited to `http(s)`, `mailto:` and `tel:`

这比“纯前端写死密码”的做法安全得多，但它仍然是模板，不是完整商用后台系统。

## Design Inspiration

This README structure was rewritten with the clarity patterns commonly seen in mature GitHub repositories such as:

- [microsoft/vscode](https://github.com/microsoft/vscode)
- [vercel/next.js](https://github.com/vercel/next.js)
- [facebook/react](https://github.com/facebook/react)

参考的是这些高星仓库在 README 中对“项目价值、快速开始、文档入口、边界说明”的组织方式，而不是照搬它们的内容。

## License

MIT
