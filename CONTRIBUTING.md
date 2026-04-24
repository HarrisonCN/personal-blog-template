# Contributing

Thanks for your interest in contributing.

This repository is a personal blog template, so contributions should improve clarity, usability, maintainability, or deployment experience without making the default template harder to understand.

## Before You Start

- Read the [README](./README.md)
- Check existing issues or discussions before opening a new one
- Keep changes focused and easy to review

## Ways to Contribute

- report bugs
- improve documentation
- polish UI or accessibility
- fix layout or interaction issues
- improve developer experience
- add optional template features with clear defaults

## Development Setup

Install dependencies:

```bash
npm install
```

Front-end only:

```bash
npm run dev
```

Full local stack:

```bash
npm run dev:full
```

Production build check:

```bash
npm run build
```

## Contribution Guidelines

- Prefer small pull requests over giant rewrites
- Preserve the template’s editable workflow
- Avoid introducing heavy dependencies unless they provide clear value
- Keep visual changes intentional and production-usable
- Do not commit runtime data from `server/data/store.json`
- Update docs when behavior changes

## Pull Request Checklist

Before opening a PR, make sure:

- the project builds successfully
- your change has been manually verified
- README or docs are updated if needed
- no secrets or local runtime files are included

## Design Contributions

For visual changes:

- keep the result reusable as a template
- avoid breaking the built-in editor flow
- consider both desktop and mobile
- preserve readability and accessibility

## Issues

If you are reporting a bug, include:

- what you expected
- what actually happened
- steps to reproduce
- screenshots or screen recordings when useful
- environment details when relevant

## License

By contributing, you agree that your contributions will be licensed under the project’s [MIT License](./LICENSE).
