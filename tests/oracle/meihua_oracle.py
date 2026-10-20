# 梅花易數標準答案：獨立的 Python 第二套算法，不 import 任何 JS
# 讀 meihua_cases.json（農曆數字取自香港天文台對照表），輸出 meihua_answers.json
import json, os
TRI = {1:('乾',(1,1,1),'金'),2:('兌',(1,1,0),'金'),3:('離',(1,0,1),'火'),4:('震',(1,0,0),'木'),
       5:('巽',(0,1,1),'木'),6:('坎',(0,1,0),'水'),7:('艮',(0,0,1),'土'),8:('坤',(0,0,0),'土')}  # 爻由下往上
BY = {v[1]: v[0] for v in TRI.values()}
WX = {v[0]: v[2] for v in TRI.values()}
SHENG = {'金':'水','水':'木','木':'火','火':'土','土':'金'}
KE = {'金':'木','木':'土','土':'水','水':'火','火':'金'}
def m(n, k): return n % k or k

def build(up, lo, dong):
    lines = list(lo[1] + up[1])
    hu_lo, hu_up = BY[tuple(lines[1:4])], BY[tuple(lines[2:5])]
    ch = lines[:]; ch[dong-1] ^= 1
    bian = (BY[tuple(ch[3:6])], BY[tuple(ch[0:3])])
    yong, ti = (lo[0], up[0]) if dong <= 3 else (up[0], lo[0])
    a, b = WX[ti], WX[yong]
    rel = '比和' if a == b else '用生體' if SHENG[b] == a else '體生用' if SHENG[a] == b else '體剋用' if KE[a] == b else '用剋體'
    return dict(本卦上=up[0], 本卦下=lo[0], 動爻=dong, 互卦上=hu_up, 互卦下=hu_lo,
                變卦上=bian[0], 變卦下=bian[1], 體=ti, 用=yong, 生剋=rel)

def cast(nian_zhi, yue, ri, shi_zhi):
    s1 = nian_zhi + yue + ri; s2 = s1 + shi_zhi
    return build(TRI[m(s1, 8)], TRI[m(s2, 8)], m(s2, 6))

def cast_numbers(a, b):
    return build(TRI[m(a, 8)], TRI[m(b, 8)], m(a + b, 6))

here = os.path.dirname(os.path.abspath(__file__))
cases = json.load(open(os.path.join(here, 'meihua_cases.json'), encoding='utf-8'))
answers = {}
for c in cases:
    if c['type'] == 'time':
        l = c['lunar']
        answers[c['id']] = cast(l['yearZhi'], l['month'], l['day'], l['hourZhi'])
    else:
        answers[c['id']] = cast_numbers(c['a'], c['b'])
json.dump(answers, open(os.path.join(here, 'meihua_answers.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
# 自檢古書兩例
assert cast(5, 12, 17, 9)['本卦上'] == '兌'
print(f'已輸出 {len(answers)} 案')
