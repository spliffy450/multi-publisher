[中文](./README.zh-CN.md) | English

# Multi-Publisher

**One-click publish your videos to multiple Chinese social media platforms simultaneously.**

Stop wasting hours uploading the same video to Bilibili, Douyin, Xiaohongshu, and Kuaishou one by one. Multi-Publisher automates the entire process — upload once, publish everywhere.

![Electron](https://img.shields.io/badge/Electron-33-blue)
![React](https://img.shields.io/badge/React-19-61dafb)
![License](https://img.shields.io/badge/License-MIT-green)
![Platform](https://img.shields.io/badge/Platform-Windows-0078d4)

## Why This Exists

Chinese content creators spend **30-60 minutes per video** manually uploading to each platform. Each platform has its own creator portal, different upload flows, and different tag systems. That's painful when you publish daily across 4+ platforms.

Multi-Publisher solves this by automating the browser-based upload process using real Chrome sessions — not APIs (which most Chinese platforms don't offer for individual creators).

## Supported Platforms

| Platform | Status | Creator Portal |
|----------|--------|----------------|
| Bilibili (B站) | ✅ Ready | member.bilibili.com |
| Douyin (抖音/TikTok CN) | ✅ Ready | creator.douyin.com |
| Xiaohongshu (小红书/RED) | ✅ Ready | creator.xiaohongshu.com |
| Kuaishou (快手) | ✅ Ready | cp.kuaishou.com |

## How It Works

```
┌─────────────┐     IPC      ┌─────────────┐    fork()    ┌─────────────┐
│  React UI   │ ◄──────────► │  Electron   │ ◄──────────► │   Worker    │
│  (Renderer) │              │   (Main)    │              │ (Playwright)│
└─────────────┘              └──────┬──────┘              └──────┬──────┘
                                    │                            │
                              ┌─────┴─────┐              ┌──────┴──────┐
                              │  SQLite   │              │ Real Chrome │
                              │ (accounts,│              │ (persistent │
                              │  history) │              │  sessions)  │
                              └───────────┘              └─────────────┘
```

1. **Add accounts** — One-time login per platform using a real Chrome browser
2. **Fill in once** — Enter title, description, tags, select video & cover image
3. **Publish** — Hit publish, watch progress bars for each platform in real-time
4. **Done** — View results and history

## Key Features

- **Real browser automation** — Uses actual Chrome with persistent login sessions, not headless bots
- **Anti-detection** — Human-like delays, mouse movements, and typing patterns
- **Multi-account support** — Multiple accounts per platform
- **Concurrent publishing** — Publishes to all selected platforms simultaneously
- **Local-first** — All data stays on your machine. No cloud, no accounts, no subscriptions
- **Publish history** — Track all past publishes with status and timing

## Quick Start

### Prerequisites

- **Node.js** >= 18
- **pnpm** >= 8
- **Google Chrome** installed on your system

### Install & Run

```bash
git clone https://github.com/atxinsky/multi-publisher.git
cd multi-publisher
pnpm install
pnpm run dev
```

### Build Installer (.exe)

```bash
pnpm run dist
# Output: release/多平台发布工具 Setup x.x.x.exe
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Framework | Electron 33 |
| Frontend | React 19 + Tailwind CSS 4 |
| Build Tool | electron-vite + esbuild |
| Browser Automation | Playwright (with Patchright anti-detect support) |
| Database | better-sqlite3 (WAL mode) |
| Package Manager | pnpm |

## Architecture

The app runs three processes:

- **Main Process** (Electron) — Window management, IPC routing, SQLite database
- **Renderer Process** (React) — UI for publishing form, account management, history
- **Worker Process** (Node.js child process) — Browser automation via Playwright. Runs in a separate process because Playwright cannot run inside Electron's main process ([playwright#19157](https://github.com/microsoft/playwright/issues/19157))

## Project Structure

```
src/
├── main/                   # Electron main process
│   ├── index.ts            # App entry, window creation
│   ├── db.ts               # SQLite schema & CRUD
│   ├── worker-bridge.ts    # Worker process management
│   └── ipc/                # IPC handlers
│       ├── account-ipc.ts  # Account CRUD + login flow
│       ├── publish-ipc.ts  # Publishing orchestration
│       └── file-ipc.ts     # File dialogs
├── preload/
│   └── index.ts            # Context bridge API
├── renderer/src/           # React frontend
│   ├── App.tsx             # Navigation shell
│   └── pages/
│       ├── PublishPage.tsx  # Publishing form + progress modal
│       ├── AccountsPage.tsx # Account management
│       └── HistoryPage.tsx  # Publish history table
└── worker/                 # Browser automation (separate process)
    ├── index.ts            # Message handler & orchestration
    ├── browser-manager.ts  # Chrome launcher (persistent context)
    ├── humanize.ts         # Anti-detection utilities
    └── platforms/          # Platform-specific adapters
        ├── types.ts        # Shared types & IPC protocol
        ├── bilibili.ts
        ├── douyin.ts
        ├── xiaohongshu.ts
        └── kuaishou.ts
```

## Roadmap

- [ ] More platforms: WeChat Video (微信视频号), Toutiao (头条), Weibo (微博), Zhihu (知乎), YouTube
- [ ] Scheduled publishing
- [ ] Video thumbnail auto-generation
- [ ] Batch publishing from folder
- [ ] Platform-specific content adaptation (different titles/tags per platform)
- [ ] Publish templates
- [ ] macOS & Linux support

## FAQ

**Q: Is this safe? Will my accounts get banned?**
A: Multi-Publisher uses real Chrome with persistent sessions, human-like timing, and anti-automation detection measures. It behaves like a human using Chrome — because it literally is Chrome. However, no automation tool is 100% risk-free. Use at your own discretion.

**Q: Why not use official APIs?**
A: Most Chinese social media platforms (Bilibili, Douyin, Xiaohongshu, Kuaishou) don't provide upload APIs for individual creators. Only MCN agencies and enterprise accounts get API access. Browser automation is the only viable approach.

**Q: Can I add my own platform?**
A: Yes! Create a new adapter in `src/worker/platforms/` implementing the `PlatformAdapter` interface. See existing adapters for reference.

**Q: Does it work on macOS/Linux?**
A: Currently Windows only. macOS/Linux support is planned.

## Contributing

PRs welcome! If you want to add a new platform adapter or fix a bug, please open an issue first to discuss the approach.

## License

MIT

## Acknowledgments

- Inspired by [social-auto-upload](https://github.com/dreammis/social-auto-upload) and [AiToEarn](https://github.com/AiToEarn/AiToEarn)
- Built with [Playwright](https://playwright.dev/) and [Electron](https://www.electronjs.org/)
