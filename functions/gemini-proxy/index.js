import functions from '@google-cloud/functions-framework';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { callClaude } from './claude.js';
import { recordFirestore } from './cost.js';
import { createHandler } from './handler.js';
import { firestoreUsage } from './usage.js';

initializeApp();

// 函式名稱 geminiProxy 不改，避免部署網址變動
functions.http('geminiProxy', createHandler({
  claude: callClaude,
  usage: firestoreUsage,
  cost: { record: recordFirestore },
  // 驗證 Firebase ID token，回傳 uid；無效（過期、偽造、格式錯）會丟錯
  auth: { verify: async (token) => (await getAuth().verifyIdToken(token)).uid },
}));
