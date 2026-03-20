# 极简待办

一个基于 `Next.js 15 + Tauri 2 + SQLite` 的桌面待办工具，面向个人日常管理和轻量办公场景。

它不仅能管理待办，还集成了：

- 快捷指令模板
- 倒计时
- 番茄钟
- 备忘录
- 剪切板历史
- 统计看板
- AI 日报 / 周报生成

所有核心数据默认保存在本地 SQLite 中，不依赖远程数据库。

## 功能概览

### 1. 待办管理

- 按日期分组管理任务
- 支持完成 / 未完成切换
- 支持拖拽排序、跨日期移动
- 支持置顶待办
- 支持标签颜色
- 支持右键菜单快速编辑

### 2. 快捷指令

- 支持定义类似 `/bb 3 月 20 日` 的命令模板
- 输入后可自动展开为多条任务
- 适合固定流程性工作，如版本发布、日报前检查等

### 3. 提醒能力

- 支持弹窗提醒
- 支持机器人 Webhook 推送
- 支持自定义提醒时间和提醒内容

### 4. 倒计时

- 支持指定日期倒计时
- 支持固定周期倒计时
  - 每周多选
  - 每月某日
- 支持多种显示粒度：
  - `x 天`
  - `x 天 x 小时`
  - `x 天 x 小时 x 分`
  - `x 天 x 小时 x 分 x 秒`
- 支持启用 / 停用 / 编辑 / 删除
- 右侧日历下方会显示倒计时摘要

### 5. 番茄钟

- 支持工作 / 短休息 / 长休息阶段
- 支持开始、暂停、继续、重置
- 支持自定义时长
- 支持长休息周期
- 自动记录专注会话历史

### 6. 备忘录

- 支持新建、搜索、编辑、删除
- 支持自动保存
- 适合记录临时想法、会议纪要、账号信息等

### 7. 剪切板历史

- 自动记录系统剪切板文本历史
- 支持搜索、回填复制、删除、清空
- 说明：自动监听系统剪切板仅在 Tauri 桌面端生效，浏览器环境不会主动读取系统剪切板

### 8. 统计与总结

- 支持按天 / 周 / 月查看任务趋势
- 支持 AI 日报、周报生成
- 支持报告历史保存

### 9. 主题与界面

- 支持浅色 / 深色主题切换
- 右侧日历集成农历、节气、节假日信息
- 左右侧栏固定，中间区域滚动

## 技术栈

- `Next.js 15`
- `React 19`
- `TypeScript`
- `Tailwind CSS 4`
- `SQLite` + `sqlite3`
- `Tauri 2`

## 目录结构

```text
.
├── app/                    # 页面与 API 路由
├── components/             # 业务组件
├── hooks/                  # 自定义 hooks
├── lib/                    # 数据库、领域逻辑、工具函数
├── scripts/                # 构建辅助脚本
├── src-tauri/              # Tauri 桌面端代码
├── .github/workflows/      # GitHub Actions 工作流
├── 启动.bat                # Windows 便携包启动脚本
└── database.sqlite         # 本地开发数据库
```

## 本地开发

### 环境要求

- `Node.js 20.17+`
- `npm`
- 桌面端开发还需要：
  - `Rust stable`
  - 对应平台的 Tauri 构建依赖

### 启动 Web 开发环境

```bash
npm install
npm run dev
```

默认访问：

```text
http://localhost:3000
```

### 启动桌面开发环境

```bash
npm run tauri:dev
```

开发模式下：

- Next.js 使用 `3000` 端口
- Tauri 直接连接本地开发服务

## 桌面打包

### 1. 先构建 Next.js standalone 资源

```bash
npm run build:desktop-web
```

这个命令会：

1. 执行 `next build`
2. 生成 `.next/standalone`
3. 复制 `.next/static`
4. 为 Tauri 桌面运行准备服务端资源

### 2. 再构建 Tauri 可执行文件

```bash
npm run tauri:build
```

当前构建方式：

- 使用 `tauri build --no-bundle`
- 只生成可执行文件，不生成安装包
- 运行时由 Tauri 拉起内置的 Next.js standalone `server.js`
- 桌面端默认使用本地 `127.0.0.1:38749`

构建产物通常位于：

```text
src-tauri/target/release/
```

## Windows 分发说明

当前仓库的 Windows 分发方式是“便携 zip”，通常包含：

- `极简待办.exe`
- `server/`
- `启动.bat`

用户使用方式：

1. 解压 zip
2. 确认电脑已安装 `Node.js 20.17+`
3. 双击 `启动.bat`

注意：

- 当前便携版依赖本机 `Node.js`
- 桌面可执行文件会在运行时启动 `server/server.js`
- 如果目标机器没有 Node，应用无法正常启动

## GitHub Actions 手动构建

工作流文件：

```text
.github/workflows/build-windows.yml
```

当前构建方式已改为手动触发。

### 使用方式

1. 先在本地创建并推送 Git Tag，例如：

```bash
git tag v1.0.0
git push origin v1.0.0
```

2. 打开 GitHub Actions
3. 选择 `构建 Windows 桌面客户端`
4. 点击 `Run workflow`
5. 在输入框中填写 tag，例如 `v1.0.0`

### 工作流做的事情

1. 按输入的 tag 拉取代码
2. 安装 Node.js 20
3. 安装 Rust
4. 执行 `npm ci`
5. 执行 `npm run build:desktop-web`
6. 执行 `npx tauri build --no-bundle`
7. 组装 Windows 便携目录
8. 打包 zip 并上传 artifact
9. 自动创建对应 Release

## 数据存储

开发环境下：

- 默认使用项目根目录的 `database.sqlite`

桌面打包版：

- Tauri 会注入 `DATABASE_PATH`
- 实际数据库存放在当前用户的应用数据目录

当前主要数据表包括：

- `tasks`
- `commands`
- `settings`
- `reports`
- `bots`
- `countdowns`
- `pomodoro_settings`
- `pomodoro_sessions`
- `clipboard_history`
- `memos`

数据库会在启动时自动初始化和补迁移。

## 设置说明

AI 报告生成依赖设置页中的模型配置：

- `API Base`
- `API Key`
- `Model`

当前报告生成走的是 OpenAI 兼容接口的 `chat/completions`。

## 常用命令

```bash
npm install
npm run dev
npm run build
npm run build:desktop-web
npm run tauri:dev
npm run tauri:build
```

## 常见问题

### 1. AI 日报 / 周报无法生成

优先检查：

- 设置页是否已配置 `API Key`
- `API Base` 是否可访问
- 模型名是否正确
- 接口是否兼容 OpenAI `chat/completions`

### 2. Windows 便携版无法启动

优先检查：

- 是否安装了 `Node.js 20.17+`
- 是否完整解压 zip
- `server/` 目录是否仍在
- 是否通过 `启动.bat` 启动

### 3. 剪切板没有自动记录

请确认：

- 当前运行的是桌面端，而不是普通浏览器页面
- 已允许系统读取剪切板
- 使用的是文本内容复制

### 4. 开发中更新数据库结构后接口异常

如果你在开发过程中刚修改了表结构，建议：

1. 重启 `npm run dev`
2. 刷新页面

这样可以避免热更新过程中出现旧状态残留。

## 维护建议

- 如果后续希望彻底去掉用户侧 Node 依赖，可以考虑进一步改造桌面运行方式
- 如果准备长期用于团队内部，建议固定 AI 网关地址，并在发布说明中明确配置方式
- 如果后续功能继续增多，可以把任务、备忘录、倒计时拆成更明确的领域模块
