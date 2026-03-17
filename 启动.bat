@echo off
chcp 65001 >nul
where node >nul 2>nul
if errorlevel 1 (
  echo 未检测到 Node.js，请先安装 Node.js 20.17 或更高版本后再启动。
  pause
  exit /b 1
)

node -e "const [major, minor] = process.versions.node.split('.').map(Number); process.exit(major > 20 || (major === 20 && minor >= 17) ? 0 : 1)" >nul 2>nul
if errorlevel 1 (
  echo 当前 Node.js 版本过低，请升级到 20.17 或更高版本后再启动。
  pause
  exit /b 1
)

echo 正在启动极简待办...
start "" "%~dp0极简待办.exe"
