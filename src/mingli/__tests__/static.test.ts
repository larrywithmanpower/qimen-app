import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// 命理 App 原始碼靜態檢查：色碼只准寫在 tokens.css、class 全部帶 ml- 前綴（防撞名）
const ROOT = join(__dirname, '..');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap(f => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return f === '__tests__' ? [] : walk(p);
    return /\.(css|tsx?|glsl)$/.test(f) ? [p] : [];
  });
}

const files = walk(ROOT);
const rel = (p: string) => relative(ROOT, p);

describe('色碼只寫在 tokens.css', () => {
  it('其他檔案沒有 #hex、rgb()、hsl()', () => {
    const hits: string[] = [];
    for (const f of files) {
      if (rel(f) === join('styles', 'tokens.css')) continue;
      readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
        const code = line.replace(/\/\/.*$/, '');
        if (/#[0-9a-fA-F]{3,8}\b(?![\w-])/.test(code) && !/&#\d+;|href="#|url\(#|'#\/|"#\/|`#\/|#\//.test(code)) {
          hits.push(`${rel(f)}:${i + 1} ${line.trim()}`);
        }
        if (/\b(rgba?|hsla?)\(/.test(code)) hits.push(`${rel(f)}:${i + 1} ${line.trim()}`);
      });
    }
    expect(hits).toEqual([]);
  });
});

describe('class 名稱帶 ml- 前綴', () => {
  it('CSS 選擇器裡的 class 都以 ml- 開頭', () => {
    const bad: string[] = [];
    for (const f of files.filter(f => f.endsWith('.css'))) {
      // 去掉註解與宣告區塊，只留選擇器
      const src = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      const selectors = src.replace(/\{[^{}]*\}/g, '\n').replace(/@[^{\n]*\{/g, '\n');
      for (const m of selectors.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) {
        if (!m[1].startsWith('ml-')) bad.push(`${rel(f)} .${m[1]}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('TSX／TS 裡的 className 都以 ml- 開頭', () => {
    const bad: string[] = [];
    for (const f of files.filter(f => /\.tsx?$/.test(f))) {
      const src = readFileSync(f, 'utf8');
      for (const m of src.matchAll(/class(?:Name)?=["']([^"'{}$]+)["']/g)) {
        for (const c of m[1].split(/\s+/).filter(Boolean)) {
          if (!c.startsWith('ml-')) bad.push(`${rel(f)} ${c}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});
