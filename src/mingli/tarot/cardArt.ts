// 塔羅牌面 SVG：viewBox 0 0 100 160，顏色全由 cardArt.css 的 class 決定
import './cardArt.css'
import { CARDS } from './cards'

const L = 'class="ml-tc-line"'
const F = 'class="ml-tc-fill"'
const D = 'class="ml-tc-dim"'

// 圖騰畫在 x 20～80、y 28～76 的範圍，之後整組下移 18
const lemniscate = (cx: number, cy: number, w: number, h: number) =>
  `<path ${L} d="M${cx} ${cy}C${cx + w * .4} ${cy - h} ${cx + w} ${cy - h * .8} ${cx + w} ${cy}C${cx + w} ${cy + h * .8} ${cx + w * .4} ${cy + h} ${cx} ${cy}C${cx - w * .4} ${cy - h} ${cx - w} ${cy - h * .8} ${cx - w} ${cy}C${cx - w} ${cy + h * .8} ${cx - w * .4} ${cy + h} ${cx} ${cy}Z"/>`

const heart = (x: number, y: number) =>
  `<path ${L} transform="translate(${x} ${y})" d="M0 10C-14 0-9-12 0-5C9-12 14 0 0 10Z"/>`

const spokes = (cx: number, cy: number, r1: number, r2: number, n: number) =>
  Array.from({ length: n }, (_, k) => {
    const a = (k * 2 * Math.PI) / n
    const f = (v: number) => v.toFixed(2)
    return `<line ${L} x1="${f(cx + Math.cos(a) * r1)}" y1="${f(cy + Math.sin(a) * r1)}" x2="${f(cx + Math.cos(a) * r2)}" y2="${f(cy + Math.sin(a) * r2)}"/>`
  }).join('')

// 五芒星：pointDown 為 true 時尖端朝下（惡魔的倒五芒星）
const pentagram = (cx: number, cy: number, r: number, pointDown: boolean) => {
  const start = pointDown ? Math.PI / 2 : -Math.PI / 2
  const pts = Array.from({ length: 5 }, (_, k) => {
    const a = start + (k * 2 * Math.PI) / 5
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]
  })
  const order = [0, 2, 4, 1, 3]
  return `<path ${L} d="M${order.map((i) => `${pts[i][0].toFixed(2)} ${pts[i][1].toFixed(2)}`).join('L')}Z"/>`
}

const MOTIFS: string[] = [
  // 0 愚者：懸崖、行者、太陽
  `<path ${L} d="M20 76H46L52 62"/><circle ${F} cx="42" cy="48" r="3.5"/><path ${L} d="M42 53V66M42 58L35 63M42 58L50 54"/><circle ${L} cx="68" cy="38" r="7"/><path ${D} d="M68 27V24M68 52V49M57 38H54M82 38H79"/>`,
  // 1 魔術師：無限符號與權杖
  lemniscate(50, 38, 18, 9) + `<path ${L} d="M50 50V76M42 76H58M44 58H56"/>`,
  // 2 女祭司：雙柱與月
  `<path ${L} d="M27 32H39V76H27ZM61 32H73V76H61Z"/><path ${F} d="M54 40a10 10 0 1 0 0 20a8 8 0 1 1 0-20z"/><path ${D} d="M44 66H56"/>`,
  // 3 皇后：金星符號
  `<circle ${L} cx="50" cy="46" r="11"/><path ${L} d="M50 57V77M41 68H59"/><path ${D} d="M30 34Q50 22 70 34"/>`,
  // 4 皇帝：方座與權杖
  `<path ${L} d="M30 76V40H70V76M30 58H70M24 40H76"/><path ${L} d="M50 40V30M45 34H55"/><path ${F} d="M50 48l4 6-4 6-4-6z"/>`,
  // 5 教皇：三重十字
  `<path ${L} d="M50 28V76M43 36H57M38 47H62M33 58H67"/>`,
  // 6 戀人：雙心
  heart(40, 46) + heart(60, 56) + `<path ${D} d="M50 30L50 34"/>`,
  // 7 戰車：車輪與華蓋
  `<path ${L} d="M28 42Q50 28 72 42"/><circle ${L} cx="50" cy="60" r="15"/><circle ${F} cx="50" cy="60" r="3"/>` + spokes(50, 60, 3, 15, 6),
  // 8 力量：無限符號與獅首
  lemniscate(50, 34, 12, 6) + `<circle ${L} cx="50" cy="58" r="10"/><circle ${D} cx="50" cy="58" r="16"/><path ${L} d="M46 56H46.5M54 56H54.5M47 63Q50 66 53 63"/>`,
  // 9 隱者：提燈與手杖
  `<path ${L} d="M66 30V76M66 34H46V46"/><path ${L} d="M38 46H54V64H38ZM38 46L46 40L54 46"/><circle ${F} cx="46" cy="55" r="3"/>`,
  // 10 命運之輪：雙圈八輻輪
  `<circle ${L} cx="50" cy="52" r="23"/><circle ${L} cx="50" cy="52" r="17"/><circle ${F} cx="50" cy="52" r="4"/>` + spokes(50, 52, 4, 17, 8),
  // 11 正義：天平
  `<path ${L} d="M50 30V76M40 76H60M28 42H72"/><path ${L} d="M28 42L22 58H34ZM72 42L66 58H78Z"/><path ${L} d="M22 58Q28 65 34 58M66 58Q72 65 78 58"/>`,
  // 12 倒吊人：倒三角與光環
  `<path ${L} d="M26 32H74M50 32V38"/><path ${L} d="M34 38H66L50 66Z"/><circle ${D} cx="50" cy="71" r="5"/>`,
  // 13 死神：鐮刀
  `<path ${L} d="M40 78L56 32"/><path ${L} d="M56 32Q80 30 80 54Q72 42 53 44"/><path ${D} d="M26 70Q36 64 46 70"/>`,
  // 14 節制：雙杯傾注
  `<path ${L} d="M24 36H42L38 50H28ZM33 50V58M28 58H38"/><path ${L} d="M58 60H76L72 72H62ZM67 72V76"/><path ${D} d="M42 40Q56 40 62 58"/>`,
  // 15 惡魔：倒五芒星
  `<circle ${L} cx="50" cy="52" r="24"/>` + pentagram(50, 53, 22, true),
  // 16 高塔：塔與閃電
  `<path ${L} d="M40 76V48H58V76M36 48H62L58 36H40Z"/><path ${L} d="M76 28L66 46H74L62 66"/><path ${D} d="M26 40H30M24 52H28"/>`,
  // 17 星星：八芒星與水波
  `<path ${L} d="M50 28L54 42L68 46L54 50L50 64L46 50L32 46L46 42Z"/><circle ${F} cx="28" cy="34" r="1.5"/><circle ${F} cx="74" cy="32" r="1.5"/><circle ${F} cx="72" cy="60" r="1.2"/><path ${D} d="M26 74Q38 68 50 74T74 74"/>`,
  // 18 月亮：弦月與雙塔
  `<path ${L} d="M56 28a17 17 0 1 0 0 32a13 13 0 1 1 0-32z"/><path ${L} d="M24 76V62H34V76M66 76V62H76V76"/><path ${D} d="M44 70H56M50 64V68"/>`,
  // 19 太陽：圓日與十六道光芒
  `<circle ${L} cx="50" cy="52" r="11"/><circle ${F} cx="50" cy="52" r="5"/>` +
    Array.from({ length: 16 }, (_, k) => {
      const a = (k * Math.PI) / 8
      const r2 = k % 2 === 0 ? 25 : 20
      return `<line ${L} x1="${(50 + Math.cos(a) * 15).toFixed(2)}" y1="${(52 + Math.sin(a) * 15).toFixed(2)}" x2="${(50 + Math.cos(a) * r2).toFixed(2)}" y2="${(52 + Math.sin(a) * r2).toFixed(2)}"/>`
    }).join(''),
  // 20 審判：號角與聲波
  `<path ${L} d="M26 66L62 40L70 52L34 72Z"/><path ${L} d="M62 40L74 32M70 52L80 46"/><path ${D} d="M40 36Q50 30 60 32M34 30Q48 22 64 24"/>`,
  // 21 世界：花環
  `<ellipse ${L} cx="50" cy="52" rx="19" ry="25"/>` +
    Array.from({ length: 12 }, (_, k) => {
      const a = (k * Math.PI) / 6
      return `<circle ${F} cx="${(50 + Math.cos(a) * 19).toFixed(2)}" cy="${(52 + Math.sin(a) * 25).toFixed(2)}" r="2"/>`
    }).join('') + `<path ${L} d="M50 44L56 52L50 60L44 52Z"/>`,
]

// 只有圖騰那一段，測試用來檢查 22 張各不相同
export function motifSVG(index: number): string {
  return `<g class="ml-tc-motif">${MOTIFS[index]}</g>`
}

export function faceSVG(index: number): string {
  const c = CARDS[index]
  return `<svg viewBox="0 0 100 160" preserveAspectRatio="xMidYMid meet">
    <rect class="ml-tc-frame" x="5" y="5" width="90" height="150" rx="6"/>
    <text class="ml-tc-roman" x="50" y="22" text-anchor="middle" font-size="12" letter-spacing="1">${c.roman}</text>
    <g transform="translate(0,18)">${motifSVG(index)}</g>
    <text class="ml-tc-name" x="50" y="126" text-anchor="middle" font-size="${c.zh.length > 3 ? 11 : 13}" letter-spacing="2">${c.zh}</text>
    <text class="ml-tc-en" x="50" y="142" text-anchor="middle" font-size="8.5">${c.en}</text>
  </svg>`
}

export function backSVG(): string {
  return `<svg viewBox="0 0 100 160" preserveAspectRatio="xMidYMid slice">
    <g>
      <circle class="ml-tc-back-line" cx="50" cy="80" r="26"/>
      <circle class="ml-tc-back-line" cx="50" cy="80" r="18" stroke-dasharray="1.5 2.5"/>
      <path class="ml-tc-back-line" d="M50 46 L54 76 L84 80 L54 84 L50 114 L46 84 L16 80 L46 76 Z"/>
      <path class="ml-tc-back-fill" d="M58 20a10 10 0 1 0 0 16a8 8 0 1 1 0-16z"/>
      <path class="ml-tc-back-fill" d="M50 136l2 5 5 .5-4 3 1.5 5-4.5-3-4.5 3 1.5-5-4-3 5-.5z"/>
    </g></svg>`
}
