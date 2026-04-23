# Personal Blog Template

An editable React + Vite personal blog template with:

- liquid-glass visual style
- homepage, article archive, article detail, and project detail pages
- built-in studio for editing articles, projects, and site copy
- multilingual UI
- font switching, theme switching, and live palette control
- music player with custom source support
- article covers, media attachments, and inline attachment placement

## Preview

GitHub Pages:

- [Live demo](https://harrisoncn.github.io/personal-blog-template/)

## Cover

![Template cover](./docs/cover.png)

## Default Studio Login

- Username: `ADMIN`
- Password: `CHANGE_ME_123`

Change these values before publishing your own version.

## Tech Stack

- React 18
- Vite
- React Router
- Plain CSS

## Getting Started

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
```

You can also preview the built site locally on Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-blog.ps1
```

## Editable Areas

- `src/data/siteContent.js`
- `src/App.jsx`
- `src/styles.css`

The built-in studio also lets you edit:

- site title, intro, stats, and social links
- articles and project entries
- article covers and media attachments
- palette, theme, language, and font preferences

## GitHub Pages

This repository includes a GitHub Actions workflow at `.github/workflows/pages.yml`.

After pushing to `main`, Pages deploys automatically.

## Notes

- local content editing uses browser storage by default
- uploaded media in the studio is stored in the current browser unless you add a backend
- the built-in login is front-end protection only, not a full server-side auth system
