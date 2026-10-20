// 22 張大阿爾克那：編號、羅馬數字、中英文名、正逆位短義（沿用 demo 範例牌義）
export interface TarotCard {
  index: number
  roman: string
  zh: string
  en: string
  upright: string
  reversed: string
}

const RAW: [string, string, string, string, string][] = [
  ['0', '愚者', 'The Fool', '新的開始，放膽一試', '太衝動，還沒想清楚'],
  ['I', '魔術師', 'The Magician', '手上資源夠，做得成', '有能力卻用錯地方'],
  ['II', '女祭司', 'The High Priestess', '先觀察，相信直覺', '資訊還不完整'],
  ['III', '皇后', 'The Empress', '豐收，被好好照顧', '太依賴別人'],
  ['IV', '皇帝', 'The Emperor', '穩定，按規矩來', '太強勢，卡在控制'],
  ['V', '教皇', 'The Hierophant', '照傳統走，找前輩', '不想照規矩'],
  ['VI', '戀人', 'The Lovers', '要做選擇，適合合作', '選擇搖擺不定'],
  ['VII', '戰車', 'The Chariot', '衝得過去', '力氣分散了'],
  ['VIII', '力量', 'Strength', '用耐心化解', '缺一點自信'],
  ['IX', '隱者', 'The Hermit', '先停下來想清楚', '把自己關太緊'],
  ['X', '命運之輪', 'Wheel of Fortune', '轉機要來了', '時機還沒到'],
  ['XI', '正義', 'Justice', '公平，照實來', '判斷有偏差'],
  ['XII', '倒吊人', 'The Hanged Man', '換個角度看', '白白空等'],
  ['XIII', '死神', 'Death', '舊的結束，新的開始', '抗拒改變'],
  ['XIV', '節制', 'Temperance', '慢慢調和', '兩邊失衡'],
  ['XV', '惡魔', 'The Devil', '被慾望綁住', '正在掙脫'],
  ['XVI', '高塔', 'The Tower', '突然的變動', '躲過一劫但不安'],
  ['XVII', '星星', 'The Star', '方向對，慢慢會亮', '希望變淡'],
  ['XVIII', '月亮', 'The Moon', '不明朗，有疑慮', '迷霧正在散'],
  ['XIX', '太陽', 'The Sun', '順利，明朗', '好事延後一點'],
  ['XX', '審判', 'Judgement', '被重新評估', '猶豫不決'],
  ['XXI', '世界', 'The World', '完成，圓滿', '差最後一步'],
]

export const CARDS: readonly TarotCard[] = RAW.map(([roman, zh, en, upright, reversed], index) => ({
  index, roman, zh, en, upright, reversed,
}))
