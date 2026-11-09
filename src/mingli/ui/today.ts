import { Solar } from 'lunar-javascript'

// 首頁頂端的「今天」：干支、節氣、月相，一律照台灣日期算

// lunar-javascript 回的是簡體字，節氣名稱裡跟繁體不同的字在這裡換掉
const TRAD: Record<string, string> = { 惊蛰: '驚蟄', 小满: '小滿', 芒种: '芒種', 处暑: '處暑' }
const NUM = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五']

// 依農曆日數取月相（朔望月約 29.5 天，用農曆日最貼近萬年曆的寫法）
export function moonName(lunarDay: number): string {
  if (lunarDay === 1) return '新月'
  if (lunarDay <= 6) return '眉月'
  if (lunarDay <= 8) return '上弦月'
  if (lunarDay <= 14) return '盈凸月'
  if (lunarDay <= 16) return '滿月'
  if (lunarDay <= 22) return '虧凸月'
  if (lunarDay <= 24) return '下弦月'
  return '殘月'
}

// 台灣日期的年月日（不管使用者手機設哪個時區）
export function taipeiYmd(at: Date): [number, number, number] {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(at)
  const [y, m, d] = p.split('-').map(Number)
  return [y, m, d]
}

export interface TodayInfo {
  year: string
  month: string
  day: string
  // 節氣當天寫節氣名，其他天寫「立冬第二天」
  term: string
  moon: string
}

export function todayInfo(at: Date = new Date()): TodayInfo {
  const [y, m, d] = taipeiYmd(at)
  const solar = Solar.fromYmd(y, m, d)
  const lunar = solar.getLunar()
  const prev = lunar.getPrevJieQi(true)
  const name = TRAD[prev.getName()] ?? prev.getName()
  const ps = prev.getSolar()
  const diff = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ps.getYear(), ps.getMonth() - 1, ps.getDay())) / 86400000)
  return {
    year: lunar.getYearInGanZhiByLiChun(),
    month: lunar.getMonthInGanZhiExact(),
    day: lunar.getDayInGanZhi(),
    term: diff === 0 ? name : `${name}第${NUM[diff + 1] ?? diff + 1}天`,
    moon: moonName(lunar.getDay()),
  }
}
