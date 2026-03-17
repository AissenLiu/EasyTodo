import { cpSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const standaloneDir = path.join('.next', 'standalone');
const standaloneNextDir = path.join(standaloneDir, '.next');
const standaloneStaticDir = path.join(standaloneNextDir, 'static');
const publicDir = 'public';
const nextStaticDir = path.join('.next', 'static');

if (!existsSync(standaloneDir)) {
  throw new Error('未找到 .next/standalone，请先执行 next build');
}

mkdirSync(standaloneNextDir, { recursive: true });

if (existsSync(nextStaticDir)) {
  cpSync(nextStaticDir, standaloneStaticDir, { recursive: true, force: true });
  console.log('已复制 .next/static -> .next/standalone/.next/static');
}

if (existsSync(publicDir)) {
  cpSync(publicDir, path.join(standaloneDir, 'public'), { recursive: true, force: true });
  console.log('已复制 public -> .next/standalone/public');
}
