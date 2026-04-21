/**
 * 從不同起卦輸入推算「用事宮」1-9。
 * 規則取自 KNOWLEDGE.md 九宮奇門系統。
 */

/**
 * 手機號起卦：取末位數字
 * 0 視為特殊「空」，退回中五宮（坤二寄宮的處理鏡像）
 */
export function palaceFromPhone(phone: string): number {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return 5;
  const last = parseInt(digits[digits.length - 1], 10);
  if (Number.isNaN(last)) return 5;
  return last === 0 ? 5 : last;
}

/**
 * 出生日起卦：以日數對 9 取模（1-9 循環）
 * 日 9/18/27 映射回 9 宮，0 情況不存在
 */
export function palaceFromBirthDate(date: Date): number {
  const day = date.getDate();
  const mod = day % 9;
  return mod === 0 ? 9 : mod;
}

/**
 * 時間起卦：取當下小時的地支序數再取模
 * 子時(23-0) 1, 丑時(1-2) 2 ...（簡化版）
 */
export function palaceFromTime(date: Date = new Date()): number {
  const hour = date.getHours();
  // 子時 23-0 → 1, 丑 1-2 → 2, 寅 3-4 → 3, ...
  // 地支序數（0=子, 1=丑, ... 11=亥）
  const branchIdx = Math.floor(((hour + 1) % 24) / 2);
  const mod = (branchIdx + 1) % 9; // 1-12 → 1-9 循環
  return mod === 0 ? 9 : mod;
}
