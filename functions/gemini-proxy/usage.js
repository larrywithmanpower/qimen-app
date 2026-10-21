// 每日用量計數：Firestore 文件 usage/{台灣日期}，transaction 加一
import { Firestore } from '@google-cloud/firestore';

let db;

// 未滿上限就加一並回傳 true，滿了回傳 false
export async function consumeFirestore(dateKey, limit) {
  db ??= new Firestore();
  const ref = db.collection('usage').doc(dateKey);
  return db.runTransaction(async (t) => {
    const snap = await t.get(ref);
    const count = snap.exists ? snap.data().count ?? 0 : 0;
    if (count >= limit) return false;
    t.set(ref, { count: count + 1 }, { merge: true });
    return true;
  });
}
