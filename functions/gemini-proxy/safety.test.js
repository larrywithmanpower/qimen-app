import { describe, it, expect } from 'vitest';
import { classifyQuestion, findAbsolute } from './safety.js';

const cases = {
  medical: ['我媽下週要動手術，順利嗎', '最近一直咳嗽，是不是生病了', '這個癌症的治療方向對嗎', '我想知道什麼時候適合懷孕', '醫生診斷我有胃潰瘍，要吃藥多久'],
  investment: ['我該不該買進這檔股票', '最近想投資基金，現在進場好嗎', '虛擬幣現在要不要出手', '買房當投資會增值嗎', '手上的ETF套牢了怎麼辦'],
  legal: ['這場官司會贏嗎', '合約糾紛要不要提告', '離婚財產怎麼分才公平', '訴訟的判決什麼時候下來', '對方告我，我該怎麼辦才好，要請律師嗎'],
};

describe('classifyQuestion：話題', () => {
  for (const [topic, qs] of Object.entries(cases)) {
    it(`${topic} 五題都判對、且不拒答`, () => {
      for (const q of qs) {
        const r = classifyQuestion(q);
        expect(r.topics, q).toContain(topic);
        expect(r.refuse, q).toBeNull();
      }
    });
  }
  it('一題可同時命中多類', () => {
    expect(classifyQuestion('官司纏身又生病，還能投資嗎').topics.sort()).toEqual(['investment', 'legal', 'medical']);
  });
});

describe('classifyQuestion：拒答', () => {
  const death = ['我的壽命還有多久', '我哪時候會死', '我會不會死在今年', '我能活到幾歲', '什麼時候是我的死期'];
  const selfharm = ['我想自殺', '最近一直有輕生的念頭', '我不想活了', '好想死', '覺得活不下去，想結束生命'];
  it('death 五題', () => {
    for (const q of death) expect(classifyQuestion(q).refuse, q).toBe('death');
  });
  it('selfharm 五題', () => {
    for (const q of selfharm) expect(classifyQuestion(q).refuse, q).toBe('selfharm');
  });
  it('同時命中時 selfharm 優先', () => {
    expect(classifyQuestion('我不想活了，壽命還有多久').refuse).toBe('selfharm');
  });
});

// 一般問題不可誤判成拒答；邊界題的歸類理由寫在註解
describe('classifyQuestion：一般問題不誤判 refuse', () => {
  const normal = [
    '我和他會不會在一起', // 感情
    '下個月面試會順利嗎', // 工作
    '這次考試能上榜嗎', // 考試
    '今年適合搬家嗎', // 搬家
    '同事最近對我冷淡，怎麼相處', // 人際
    '買房好不好住', // 邊界：買房本身不算投資，也沒提增值，無 topic
    '最近身體有點累，工作會順嗎', // 邊界：「身體累」是生活狀態不是病症，不算 medical
    '這個毛病怎麼改，我老是拖延', // 邊界：「毛病」是缺點的意思，不算 medical
    '會不會死心塌地等他', // 邊界：「死心」不是死亡
    '考試會不會死當', // 邊界：「死當」是被當掉
    '我想死你了，他會回訊息嗎', // 邊界：「想死你」是想念
    '好朋友是我的死黨，他會來參加婚禮嗎', // 邊界：死黨
    '我想離婚，該不該走這一步', // 邊界：離婚本身是感情決定，沒提財產／監護不算 legal
    '這支手機壽命還剩多久該換嗎', // 邊界：產品壽命
    '要不要換新工作', // 工作
    '朋友邀我合夥開店，適合嗎', // 工作，沒提投資
    '小孩今年入學順利嗎', // 家庭
    '最近睡不好，運勢怎麼樣', // 邊界：睡不好不算醫療
    '我想學吉他，現在開始好嗎', // 學習
    '不想活動筋骨，運氣會變差嗎', // 邊界：「不想活動」不是不想活
  ];
  it('20 題都不拒答', () => {
    expect(normal).toHaveLength(20);
    for (const q of normal) expect(classifyQuestion(q).refuse, q).toBeNull();
  });
  it('買房、身體累、毛病、離婚本身不帶話題', () => {
    for (const q of ['買房好不好住', '最近身體有點累，工作會順嗎', '這個毛病怎麼改，我老是拖延', '我想離婚，該不該走這一步']) {
      expect(classifyQuestion(q).topics, q).toEqual([]);
    }
  });
  it('非字串或空字串安全', () => {
    expect(classifyQuestion('')).toEqual({ topics: [], refuse: null });
    expect(classifyQuestion(undefined)).toEqual({ topics: [], refuse: null });
  });
});

describe('findAbsolute', () => {
  it('抓得到七種絕對化字眼', () => {
    for (const w of ['一定', '必定', '絕對', '保證', '百分之百', '100%', '肯定會']) {
      expect(findAbsolute(`這件事${w}成功`), w).toContain(w);
    }
  });
  it('否定的不算', () => {
    for (const t of ['不一定會成功', '未必一定順利', '我不保證結果', '不見得一定如此', '並非絕對', '無法保證']) {
      expect(findAbsolute(t), t).toEqual([]);
    }
  });
  it('「一定的」「一定程度」不算', () => {
    expect(findAbsolute('有一定的參考價值，一定程度上可行')).toEqual([]);
  });
  it('否定與肯定混用時只抓沒被否定的', () => {
    expect(findAbsolute('不一定成功，但他絕對會來')).toEqual(['絕對']);
  });
  it('沒有就回空陣列、不重複', () => {
    expect(findAbsolute('多半順利')).toEqual([]);
    expect(findAbsolute('一定一定')).toEqual(['一定']);
  });
});

// 關鍵字只是第一道：常見說法直接攔、不花錢；隱晦說法由 Claude 的 risk 欄位判斷（handler.test.js）
describe('關鍵字第一道：常見說法', () => {
  const selfharm = ['活著好累，撐不下去了', '我想結束自己', '如果我不在了大家會比較好嗎', '想去跳樓', '我想割腕', '吞藥會不會很痛', '人生沒有意義了，乾脆一了百了', '我想去死', '不想再醒來了', '想從這個世界消失', '我是不是該離開這個世界', '真的撐不住了想放棄生命', '燒炭會不會比較快', '死了算了'];
  it.each(selfharm)('selfharm：%s', (q) => expect(classifyQuestion(q).refuse).toBe('selfharm'));
  const notDeath = ['這個專案會不會死掉', '這家店會不會倒', '手機電池壽命還剩多久', '笑死，他會回我嗎', '這份工作會不會讓我累死', '累到想死的工作還要做嗎', '好想消失在人群裡安靜一下，週末去哪玩好'];
  it.each(notDeath)('不拒答：%s', (q) => expect(classifyQuestion(q).refuse).toBeNull());
  it('明年會不會死掉、我爸會不會過世 → death', () => {
    expect(classifyQuestion('明年會不會死掉').refuse).toBe('death');
    expect(classifyQuestion('我爸會不會過世').refuse).toBe('death');
  });
});
