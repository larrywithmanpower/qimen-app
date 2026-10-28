// 每日用量計數（Firestore）。db 由外面注入，測試時換成假的
// 路徑：
//   usage/{台灣日期}              → { anon: 未登入共用次數 }
//   usage/{台灣日期}/users/{uid}  → { count: 該會員今日次數 }（只存 uid，不存 email、名字）
//   ai_cost_daily/{台灣日期}      → { totalUsd: 今日累計美金成本 }（由 cost.js 寫入）
import { Firestore } from '@google-cloud/firestore';

// uid 有值走會員計數，沒有走未登入共用計數
function counterOf(db, dateKey, uid) {
  const day = db.collection('usage').doc(dateKey);
  return uid
    ? { ref: day.collection('users').doc(uid), field: 'count' }
    : { ref: day, field: 'anon' };
}

export function createUsage(db) {
  return {
    // 未滿上限就加一並回傳 true，滿了回傳 false
    async consume(dateKey, { uid, limit }) {
      const { ref, field } = counterOf(db, dateKey, uid);
      return db.runTransaction(async (t) => {
        const snap = await t.get(ref);
        const used = snap.exists ? snap.data()[field] ?? 0 : 0;
        if (used >= limit) return false;
        t.set(ref, { [field]: used + 1 }, { merge: true });
        return true;
      });
    },
    // 只讀今天已用幾次，不扣
    async used(dateKey, { uid }) {
      const { ref, field } = counterOf(db, dateKey, uid);
      const snap = await ref.get();
      return snap.exists ? snap.data()[field] ?? 0 : 0;
    },
    // 今日累計美金成本
    async spentUsd(dateKey) {
      const snap = await db.collection('ai_cost_daily').doc(dateKey).get();
      return snap.exists ? Number(snap.data().totalUsd) || 0 : 0;
    },
  };
}

let usage;
// 真的 Firestore 實例，第一次用才建立
export const firestoreUsage = {
  consume: (...a) => (usage ??= createUsage(new Firestore())).consume(...a),
  used: (...a) => (usage ??= createUsage(new Firestore())).used(...a),
  spentUsd: (...a) => (usage ??= createUsage(new Firestore())).spentUsd(...a),
};
