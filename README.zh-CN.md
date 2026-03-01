中文 | [English](./README.md)

# Multi-Publisher 多平台发布工具

**一键将视频同步发布到多个国内自媒体平台。**

不用再一个一个平台手动上传了。填写一次标题、描述、标签，选好视频，点击发布 —— 同时推送到 B站、抖音、小红书、快手。

![Electron](https://img.shields.io/badge/Electron-33-blue)
![React](https://img.shields.io/badge/React-19-61dafb)
![License](https://img.shields.io/badge/License-MIT-green)
![Platform](https://img.shields.io/badge/Platform-Windows-0078d4)

## 为什么做这个

自媒体创作者每发一个视频，要在 4-5 个平台重复操作：打开创作者后台 → 上传视频 → 填标题 → 写描述 → 加标签 → 上传封面 → 点发布。每个平台操作一遍，**每条视频至少花 30-60 分钟在重复劳动上**。

市面上的多平台发布工具要么收费（年费几百上千），要么需要云端授权（数据不安全）。

Multi-Publisher 完全本地运行、开源免费，用真实 Chrome 浏览器自动化操作，数据全部存在你自己电脑上。

## 支持平台

| 平台 | 状态 | 创作者后台 |
|------|------|-----------|
| B站（哔哩哔哩） | ✅ 已支持 | member.bilibili.com |
| 抖音 | ✅ 已支持 | creator.douyin.com |
| 小红书 | ✅ 已支持 | creator.xiaohongshu.com |
| 快手 | ✅ 已支持 | cp.kuaishou.com |

## 工作原理

```
┌─────────────┐     IPC      ┌─────────────┐    fork()    ┌─────────────┐
│  React 界面  │ ◄──────────► │  Electron   │ ◄──────────► │  Worker     │
│  (渲染进程)   │              │  (主进程)    │              │ (浏览器自动化)│
└─────────────┘              └──────┬──────┘              └──────┬──────┘
                                    │                            │
                              ┌─────┴─────┐              ┌──────┴──────┐
                              │  SQLite   │              │ 真实 Chrome  │
                              │ (账号/历史) │              │ (持久化登录)  │
                              └───────────┘              └─────────────┘
```

1. **添加账号** — 每个平台首次登录一次，用真实 Chrome 浏览器扫码/密码登录
2. **填写内容** — 输入标题、描述、标签，选择视频和封面
3. **一键发布** — 选择要发布的平台和账号，点击发布，实时查看每个平台的进度
4. **查看结果** — 发布记录页面查看历史状态

## 核心特性

- **真实浏览器** — 使用系统安装的 Chrome，持久化登录会话，不是无头浏览器
- **反检测** — 模拟人类操作：随机延迟、鼠标轨迹、逐字输入
- **多账号** — 每个平台支持多个账号
- **并发发布** — 同时向所有选中的平台推送
- **本地优先** — 所有数据存在本机，无需注册、无需付费、无需联网授权
- **发布历史** — 完整的发布记录，包含状态、耗时、错误信息

## 快速开始

### 环境要求

- **Node.js** >= 18
- **pnpm** >= 8
- **Google Chrome** 浏览器

### 安装运行

```bash
git clone https://github.com/atxinsky/multi-publisher.git
cd multi-publisher
pnpm install
pnpm run dev
```

### 打包 EXE 安装包

```bash
pnpm run dist
# 产出: release/多平台发布工具 Setup x.x.x.exe
```

安装后桌面自动创建快捷方式，双击即用。

## 使用流程

### 1. 添加账号

进入「账号」页面 → 点击「添加账号」 → 选择平台 → 起个名字 → 点击「登录」

浏览器会自动打开对应平台的登录页面，手动完成登录后关闭浏览器，系统自动检测登录状态。

### 2. 发布视频

进入「发布」页面：
- 选择视频文件（mp4, avi, mov, mkv, flv）
- 填写标题（必填）
- 填写描述（可选）
- 添加标签（回车添加，支持多个）
- 选择封面图（可选）
- 勾选要发布的平台和账号
- 点击「发布」

弹出进度窗口，实时显示每个平台的上传/填写/发布进度。

### 3. 查看记录

进入「记录」页面，查看所有发布历史，包含成功/失败状态和耗时。

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Electron 33 |
| 前端 | React 19 + Tailwind CSS 4 |
| 构建工具 | electron-vite + esbuild |
| 浏览器自动化 | Playwright（支持 Patchright 反检测） |
| 数据库 | better-sqlite3（WAL 模式） |
| 包管理 | pnpm |

## 项目结构

```
src/
├── main/                   # Electron 主进程
│   ├── index.ts            # 应用入口，窗口创建
│   ├── db.ts               # SQLite 数据库
│   ├── worker-bridge.ts    # Worker 进程管理
│   └── ipc/                # IPC 处理器
│       ├── account-ipc.ts  # 账号增删改查 + 登录
│       ├── publish-ipc.ts  # 发布流程编排
│       └── file-ipc.ts     # 文件选择对话框
├── preload/
│   └── index.ts            # 安全桥接 API
├── renderer/src/           # React 前端
│   ├── App.tsx             # 导航框架
│   └── pages/
│       ├── PublishPage.tsx  # 发布表单 + 进度弹窗
│       ├── AccountsPage.tsx # 账号管理
│       └── HistoryPage.tsx  # 发布记录
└── worker/                 # 浏览器自动化（独立进程）
    ├── index.ts            # 消息处理
    ├── browser-manager.ts  # Chrome 启动器
    ├── humanize.ts         # 反检测工具
    └── platforms/          # 平台适配器
        ├── types.ts        # 类型定义
        ├── bilibili.ts     # B站
        ├── douyin.ts       # 抖音
        ├── xiaohongshu.ts  # 小红书
        └── kuaishou.ts     # 快手
```

## 开发路线

- [ ] 更多平台：微信视频号、头条、微博、知乎、YouTube
- [ ] 定时发布
- [ ] 视频封面自动生成
- [ ] 批量发布（从文件夹读取）
- [ ] 按平台自定义标题/标签
- [ ] 发布模板
- [ ] macOS 和 Linux 支持

## 常见问题

**Q: 安全吗？会被封号吗？**

使用真实 Chrome 浏览器 + 持久化登录会话 + 人类行为模拟（随机延迟、鼠标轨迹）。从平台角度看，跟你手动操作没有区别。但任何自动化工具都不能保证 100% 无风险，请自行评估。

**Q: 为什么不用平台官方 API？**

国内主流平台（B站、抖音、小红书、快手）不对个人创作者开放上传 API，只有 MCN 机构和企业账号才有资格申请。浏览器自动化是唯一可行方案。

**Q: 怎么添加新平台？**

在 `src/worker/platforms/` 下创建新文件，实现 `PlatformAdapter` 接口即可。参考现有适配器的写法。

**Q: 支持 Mac 吗？**

目前仅支持 Windows。Mac 和 Linux 支持在计划中。

## 参与贡献

欢迎 PR！如果想添加新平台或修复 bug，建议先开 issue 讨论方案。

## 开源协议

MIT

## 致谢

- 灵感来自 [social-auto-upload](https://github.com/dreammis/social-auto-upload) 和 [AiToEarn](https://github.com/AiToEarn/AiToEarn)
- 基于 [Playwright](https://playwright.dev/) 和 [Electron](https://www.electronjs.org/) 构建
