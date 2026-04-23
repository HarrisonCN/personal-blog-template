# Personal Blog Template / 个人博客模板

一个可编辑的个人博客模板，包含首页、文章页、项目页、写作台、音乐播放器、液态玻璃视觉和多语言切换。  
An editable personal blog template with a homepage, article pages, project pages, a studio dashboard, music player, liquid-glass visuals, and multilingual controls.

## Preview / 预览

- GitHub repository: [HarrisonCN/personal-blog-template](https://github.com/HarrisonCN/personal-blog-template)
- GitHub Pages preview: [https://harrisoncn.github.io/personal-blog-template/](https://harrisoncn.github.io/personal-blog-template/)

说明：
- GitHub Pages 只提供前端静态预览。
- 安全写作台登录和服务端存储只能在 Node 后端运行时启用。

Notes:
- GitHub Pages is a static preview only.
- Secure studio login and server-side persistence are available only when the Node backend is running.

## Cover / 封面

![Template cover](./docs/cover.png)

## Features / 功能

- 文章、项目、站点文字都可以在写作台中修改
- 支持文章封面、图片、音频、视频和其他附件
- 支持将附件插入到正文中的指定位置
- 支持语言切换、字体切换、主题切换和调色盘
- 支持音乐播放器和自定义音源
- 写作台登录改为服务端鉴权，不再把密码校验放在前端
- 服务端保存文章、项目、站点内容和留言板数据

- Edit articles, projects, and site copy from the built-in studio
- Support article covers, images, audio, video, and general attachments
- Insert attachments at custom positions inside article content
- Switch language, font, theme, and global palette
- Music player with custom source support
- Studio auth moved to the server instead of client-side password checks
- Server-side persistence for articles, projects, site content, and guestbook data

## Stack / 技术栈

- React 18
- Vite
- React Router
- Express
- Plain CSS

## Secure Studio / 安全写作台

默认开发环境变量：

- `STUDIO_USERNAME=ADMIN`
- `STUDIO_PASSWORD=CHANGE_ME_123`

请在正式使用前修改。推荐通过环境变量而不是前端代码保存登录凭据。

Default development credentials:

- `STUDIO_USERNAME=ADMIN`
- `STUDIO_PASSWORD=CHANGE_ME_123`

Change them before real use. Store credentials in environment variables, not in client-side code.

## Environment / 环境变量

参考文件：[.env.example](./.env.example)

```bash
STUDIO_USERNAME=ADMIN
STUDIO_PASSWORD=CHANGE_ME_123
SESSION_SECRET=replace-with-a-long-random-secret
PORT=8787
```

## Local Development / 本地开发

只开前端预览：

```bash
npm install
npm run dev
```

前后端一起启动：

```bash
npm install
npm run dev:full
```

Front-end only preview:

```bash
npm install
npm run dev
```

Run the secure full stack locally:

```bash
npm install
npm run dev:full
```

## Production Build / 生产构建

构建前端：

```bash
npm run build
```

构建后运行 Node 服务：

```bash
npm run start
```

Build the front end:

```bash
npm run build
```

Run the Node server after build:

```bash
npm run start
```

## Windows Preview Scripts / Windows 预览脚本

构建完成后可以直接运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\start-blog.ps1
```

停止预览：

```powershell
powershell -ExecutionPolicy Bypass -File .\stop-blog.ps1
```

## Editable Files / 主要可编辑文件

- [src/data/siteContent.js](./src/data/siteContent.js)
- [src/App.jsx](./src/App.jsx)
- [src/styles.css](./src/styles.css)
- [server.js](./server.js)

## Storage / 数据存储

- 服务器运行时会在 `server/data/store.json` 中保存内容
- 这个文件已经被 `.gitignore` 忽略
- GitHub Pages 预览模式下，写作台不会启用服务端编辑

- When the server runs, content is stored in `server/data/store.json`
- That runtime file is already ignored by `.gitignore`
- In GitHub Pages preview mode, the studio does not run with secure server-side editing

## GitHub Pages / GitHub Pages

仓库包含自动部署工作流：[.github/workflows/pages.yml](./.github/workflows/pages.yml)

推送到 `main` 后：

- 会自动构建静态前端
- 会自动发布到 GitHub Pages
- 但不会部署 Node 后端

The repo includes an automatic Pages workflow: [.github/workflows/pages.yml](./.github/workflows/pages.yml)

When you push to `main`:

- the static front end is built automatically
- GitHub Pages is updated automatically
- the Node backend is not deployed there
