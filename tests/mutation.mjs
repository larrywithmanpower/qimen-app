// 故意改錯測試：逐條把程式裡的一個值改錯 → 跑對應測試 → 必須紅燈 → 還原
// 規則放在 tests/mutations/*.json：[{ id, file, find, replace, test }]
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const dir = 'tests/mutations';
const only = process.argv[2];
const rules = readdirSync(dir).filter(f => f.endsWith('.json')).filter(f => !only || f.startsWith(only))
  .flatMap(f => JSON.parse(readFileSync(join(dir, f), 'utf8')).map(r => ({ ...r, group: f.replace('.json', '') })));

const rows = [];
for (const r of rules) {
  const orig = readFileSync(r.file, 'utf8');
  const hits = orig.split(r.find).length - 1;
  if (hits !== 1) { rows.push({ ...r, result: `改錯規則失效（find 出現 ${hits} 次）` }); continue; }
  try {
    writeFileSync(r.file, orig.replace(r.find, r.replace));
    const cmd = r.runner === 'playwright'
      ? ['playwright', 'test', '-c', 'playwright.mingli.config.ts', r.test]
      : ['vitest', 'run', r.test];
    const res = spawnSync('npx', cmd, { encoding: 'utf8' });
    rows.push({ ...r, result: res.status !== 0 ? '紅燈（正確）' : '仍綠燈（測試抓不到）' });
  } finally {
    writeFileSync(r.file, orig);
  }
}
console.log('\n| 組別 | 編號 | 改了什麼 | 結果 |\n|---|---|---|---|');
for (const r of rows) console.log(`| ${r.group} | ${r.id} | ${r.desc ?? r.file} | ${r.result} |`);
const bad = rows.filter(r => r.result !== '紅燈（正確）');
console.log(`\n共 ${rows.length} 條，紅燈 ${rows.length - bad.length} 條，沒抓到 ${bad.length} 條`);
process.exit(bad.length || !rows.length ? 1 : 0);
