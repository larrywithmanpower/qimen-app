// 部署前端：全套測試改在 GitHub Actions 跑，這裡只確認「要上線的這一版」在 GitHub 上已全部通過
// 條件：沒有未 commit 的改動、HEAD 已推到 origin/main、該 commit 的 E2E workflow 成功
import { execFileSync } from 'node:child_process'

const PROXY_URL = 'https://asia-east1-qimen-app-487007.cloudfunctions.net/gemini-proxy'
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: 'utf8', ...opts }).trim()
const fail = (msg) => {
  console.error(`\n✗ 不部署：${msg}`)
  process.exit(1)
}

if (run('git', ['status', '--porcelain', '--untracked-files=no'])) fail('還有沒 commit 的改動，GitHub 沒測過這些內容')

run('git', ['fetch', '-q', 'origin', 'main'])
const sha = run('git', ['rev-parse', 'HEAD'])
if (sha !== run('git', ['rev-parse', 'origin/main'])) fail('這一版還沒推到 origin/main（或 main 上有更新的版本）')

const list = (() => JSON.parse(run('gh', ['run', 'list', '--workflow', 'e2e.yml', '--commit', sha, '--event', 'push', '--limit', '1', '--json', 'databaseId,status,conclusion,url'])))
let [ci] = list()
if (!ci) fail(`GitHub 上找不到 ${sha.slice(0, 7)} 的測試紀錄（剛推的話等幾秒再試）`)
if (ci.status !== 'completed') {
  console.log(`GitHub 測試還在跑，等它跑完：${ci.url}`)
  try {
    execFileSync('gh', ['run', 'watch', String(ci.databaseId), '--exit-status', '--interval', '15'], { stdio: 'ignore' })
  } catch { /* 失敗與否下面再查一次 */ }
  ;[ci] = list()
}
if (ci.conclusion !== 'success') fail(`GitHub 測試沒通過（${ci.conclusion}）：${ci.url}`)
console.log(`✓ GitHub 測試已通過：${ci.url}`)

execFileSync('npm', ['run', 'build'], { stdio: 'inherit', env: { ...process.env, VITE_GEMINI_PROXY_URL: PROXY_URL } })
execFileSync('npx', ['firebase-tools', 'deploy', '--only', 'hosting', '--project', 'qimen-app-487007'], { stdio: 'inherit' })
