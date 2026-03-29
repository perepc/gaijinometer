import { createElement } from 'react';

// ── Markdown helpers ────────────────────────────────────────────────────────

export function stripArtifacts(text) {
  return text
    .replace(/\[[^\]]{1,40}\]/g, '')
    .replace(/\(\d+\s*palabras?\)/gi, '')
    .replace(/\(\d+\s*words?\)/gi, '')
    .replace(/([^\n])(#{1,3} )/g, '$1\n\n$2')
    .replace(/([^\n])(- )/g, '$1\n$2')
    .split('\n')
    .map((line) => {
      const count = (line.match(/\*\*/g) ?? []).length;
      return count % 2 !== 0 ? line.replace(/\*\*/, '') : line;
    })
    .join('\n')
    .trim();
}

export function renderInline(text) {
  const parts = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let last = 0, match, key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[0].startsWith('**'))
      parts.push(createElement('strong', { key: key++ }, match[2]));
    else
      parts.push(createElement('em', { key: key++ }, match[3]));
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
