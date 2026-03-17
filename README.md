# 极简待办

一个面向个人与团队日常工作的桌面待办工具，支持本地任务管理、快捷指令、提醒、统计分析，以及基于 OpenAI 兼容接口的日报/周报生成。

## 功能特性

- 按日期管理待办，支持完成状态切换、置顶、标签、右键菜单编辑
- 支持拖拽排序，以及跨日期分组移动任务
- 支持快捷指令模板，例如 `/日报 张三` 自动展开成多条任务
- 支持提醒能力：弹窗提醒、机器人 Webhook 推送
- 支持统计看板：按天 / 周 / 月查看完成趋势
- 支持 AI 日报、周报生成，并保存历史记录
- 所有核心数据默认保存在本地 SQLite，不依赖远程数据库

## 技术栈

- `Next.js 15` + `React 19`
- `Tailwind CSS 4`
- `SQLite` + `sqlite3`
- `Tauri 2`
- `TypeScript`

## 目录结构

```text
.
├── app/                    # Next.js 页面与 API 路由
├── components/             # 业务组件
├── hooks/                  # 自定义 hooks
├── lib/                    # 数据库与通用工具
├── scripts/                # 构建辅助脚本
├── src-tauri/              # Tauri 桌面端代码
├── .github/workflows/      # GitHub Actions 构建流程
└── database.sqlite         # 本地开发数据库
```

## 本地开发

### 环境要求

- `Node.js 20.17+`
- `npm`
- 如果需要本地调试桌面版，还需要：
  - `Rust stable`
  - 对应平台的 Tauri 构建依赖

### 启动 Web 版本

```bash
npm install
npm run dev
```

启动后访问：

```text
http://localhost:3000
```

说明：

- 普通待办、快捷指令、机器人配置、报表记录等数据会写入本地 SQLite
- AI 生成功能不依赖环境变量，请在应用“设置”页中配置：
  - 接口地址
  - API Key
  - 模型名称

## 桌面版开发与打包

### 启动桌面开发版

```bash
npm run tauri:dev
```

该命令会自动启动 Next.js 开发服务，并由 Tauri 打开桌面窗口。

### 构建桌面运行资源

```bash
npm run build:desktop-web
```

这个命令会：

1. 执行 `next build`
2. 生成 `.next/standalone`
3. 自动补齐 `.next/static`
4. 如果存在 `public/`，也会一并复制到 standalone 目录

### 构建 Tauri 可执行文件

```bash
npm run tauri:build
```

当前构建方式为：

- 仅生成可执行文件，不生成安装包
- Tauri 在运行时拉起内置的 Next.js standalone `server.js`
- 桌面端默认访问本地 `127.0.0.1:38749`

构建产物通常位于：

```text
src-tauri/target/release/
```

## Windows 分发说明

当前仓库的 Windows 分发方式是“便携 zip”：

- `极简待办.exe`
- `server/`
- `启动.bat`

用户解压后双击 `启动.bat` 即可运行。

注意：

- 当前便携版依赖 `Node.js 20.17+`
- `启动.bat` 会在启动前检查 Node 是否存在以及版本是否满足要求

## GitHub Actions 构建流程

工作流文件：

```text
.github/workflows/build-windows.yml
```

触发方式：

- 推送到 `main`
- 推送 `v*` 标签
- 手动触发 `workflow_dispatch`

流程概览：

1. 安装 Node.js
2. 安装 Rust
3. 执行 `npm ci`
4. 执行 `npm run build:desktop-web`
5. 执行 `npx tauri build --no-bundle`
6. 组装 Windows 便携目录并压缩为 zip
7. 上传 artifact
8. 如果是 tag，则自动创建 GitHub Release

## 数据存储

开发环境下：

- 默认使用项目根目录下的 `database.sqlite`

桌面打包版：

- Tauri 会将数据库路径注入为 `DATABASE_PATH`
- 实际数据库会存放在当前用户的应用数据目录中

当前会自动初始化或迁移的主要数据表包括：

- `tasks`
- `commands`
- `settings`
- `reports`
- `bots`

## 常用命令

```bash
npm run dev
npm run build
npm run build:desktop-web
npm run tauri:dev
npm run tauri:build
```

## 常见问题

### 1. AI 报告无法生成

通常是以下原因：

- 未在设置页配置 API Key
- 接口地址不可访问
- 所选模型名称不正确

### 2. Windows 便携版无法启动

请优先检查：

- 是否已安装 `Node.js 20.17+`
- 是否完整解压了 zip
- 是否保留了 `server` 目录与 `启动.bat`

### 3. 任务无法拖动

请确认使用的是最新构建包。Windows 打包版已经针对 Tauri WebView 的 HTML5 拖拽兼容性做过处理，旧包可能会出现拖拽无效。

## 维护建议

- 如果后续希望降低用户环境依赖，可以考虑改成安装包分发，或进一步去掉运行时 Node 依赖
- 如果需要更稳定的企业内网部署，建议固定模型网关地址，并在发布说明中明确 API 配置方式
