export type MemoRecord = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export function normalizeMemoTitle(title: unknown, content: unknown) {
  const titleText = typeof title === 'string' ? title.trim() : '';
  if (titleText) {
    return titleText.slice(0, 80);
  }

  const contentText = typeof content === 'string' ? content.trim() : '';
  const firstLine = contentText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  if (firstLine) {
    return firstLine.slice(0, 80);
  }

  return '未命名备忘录';
}

export function getMemoPreview(content: string) {
  const compact = content.replace(/\s+/g, ' ').trim();
  if (!compact) {
    return '空白备忘录';
  }
  return compact.slice(0, 72);
}

export function sortMemosByUpdatedAt<T extends { updated_at: string }>(memos: T[]) {
  return [...memos].sort((a, b) => {
    if (a.updated_at === b.updated_at) return 0;
    return a.updated_at < b.updated_at ? 1 : -1;
  });
}
