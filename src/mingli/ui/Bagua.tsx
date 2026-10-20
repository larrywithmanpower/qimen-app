import { useLitTrigrams, useRealm } from './fx'

// 先天八卦：乾南（上）坤北，離東（左）坎西；爻由內往外＝由初爻往上
const TRI: [string, number[]][] = [
  ['乾', [1, 1, 1]], ['巽', [0, 1, 1]], ['坎', [0, 1, 0]], ['艮', [0, 0, 1]],
  ['坤', [0, 0, 0]], ['震', [1, 0, 0]], ['離', [1, 0, 1]], ['兌', [1, 1, 0]],
]

// 東方頁的背景八卦盤，亮起的卦用朱砂色
export function Bagua() {
  const realm = useRealm()
  const lit = useLitTrigrams()
  return (
    <div className="ml-bagua" data-on={realm === 'east'} aria-hidden="true">
      <svg viewBox="-100 -100 200 200">
        <circle className="ml-bagua-ring" r="44" />
        <circle className="ml-bagua-ring" r="84" />
        {TRI.map(([nm, ls], k) => (
          <g key={nm} transform={`rotate(${k * 45})`}>
            {ls.map((v, i) => {
              const y = -(56 + i * 7.5)
              const d = v ? `M-15 ${y} L15 ${y}` : `M-15 ${y} L-3.5 ${y} M3.5 ${y} L15 ${y}`
              return <path key={i} className={`ml-bagua-tri${lit.includes(nm) ? ' ml-lit' : ''}`} d={d} />
            })}
            <text className={`ml-bagua-name${lit.includes(nm) ? ' ml-lit' : ''}`} y="-88">{nm}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}

// 三個共用 SVG 濾鏡：筆畫毛邊、八卦細線毛邊、印章粗糙邊。範圍給足，細線才不會被裁掉
export function BrushFilters() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <filter id="ml-brush" filterUnits="userSpaceOnUse" x="-40" y="-40" width="380" height="410">
        <feTurbulence type="fractalNoise" baseFrequency="0.035 0.6" numOctaves="2" seed="7" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="9" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <filter id="ml-brush-s" filterUnits="userSpaceOnUse" x="-120" y="-120" width="240" height="240">
        <feTurbulence type="fractalNoise" baseFrequency="0.08 0.9" numOctaves="2" seed="3" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="2.5" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <filter id="ml-rough" x="-25%" y="-25%" width="150%" height="150%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="5" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="3" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  )
}
