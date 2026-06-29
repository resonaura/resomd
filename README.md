# ResoMD

Markdown editor with live preview, cloud sync, and PDF export.

## Services

| Service | Port | Stack                                              |
| ------- | ---- | -------------------------------------------------- |
| API     | 3004 | NestJS, Fastify, TypeORM, SQLite, Puppeteer        |
| Web     | 3003 | React, Vite, shadcn/ui, Tailwind v4, Monaco Editor |

## Features

- Monaco-based markdown editor with live split preview
- Cloud documents & folders with autosave
- Block-based scroll sync between editor and preview
- GitHub-flavored markdown (checklists, footnotes, admonitions, tables)
- Server-side PDF export via headless Chromium
- Animated file tree sidebar
- Authentication via RSNRA Auth (shared cookie on .rsnra.com)

## Quick start

```bash
pnpm setup    # Generate .env files
pnpm dev      # Start both API and Web
```
