<img src="https://raw.githubusercontent.com/resonaura/resomd/main/icon.svg" width="64" alt="ResoMD Icon" />

# ResoMD

[![Version](https://img.shields.io/badge/Version-0.0.1-blue.svg)](package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Web](https://img.shields.io/badge/Web-React%2019%20%7C%20Vite%20%7C%20Tailwind%20v4-61DAFB.svg?logo=react&logoColor=black)](apps/web)
[![API](https://img.shields.io/badge/API-NestJS%20%7C%20Fastify-E0234E.svg?logo=nestjs&logoColor=white)](apps/api)
[![Editor](https://img.shields.io/badge/Editor-Monaco-blue.svg)](apps/web)
[![Website](https://img.shields.io/badge/Website-md.rsnra.com-8A2BE2.svg)](https://md.rsnra.com)

[![Sponsor on GitHub](https://img.shields.io/badge/Sponsor%20on%20GitHub-EA4AAA?logo=github-sponsors&logoColor=white)](https://github.com/sponsors/resonaura)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-FFDD00?logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/resonaura)

A high-performance Markdown editor with live preview, block-based scroll synchronization, cloud document storage with autosave, and server-side PDF export.


<p align="center">
  <img src="https://raw.githubusercontent.com/resonaura/resomd/main/media/resomd-editor.png" width="800" alt="ResoMD Split-Pane Markdown Editor" />
</p>

---

## Services

| Service | Port | Stack |
| ------- | ---- | -------------------------------------------------- |
| **API** | `3004` | NestJS, Fastify, TypeORM, SQLite, Puppeteer |
| **Web** | `3003` | React 19, Vite, shadcn/ui, Tailwind v4, Monaco Editor |

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
