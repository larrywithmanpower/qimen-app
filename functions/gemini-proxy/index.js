import functions from '@google-cloud/functions-framework';
import { callClaude } from './claude.js';
import { recordFirestore } from './cost.js';
import { createHandler } from './handler.js';
import { consumeFirestore } from './usage.js';

// 函式名稱 geminiProxy 不改，避免部署網址變動
functions.http('geminiProxy', createHandler({
  claude: callClaude,
  usage: { consume: consumeFirestore },
  cost: { record: recordFirestore },
}));
