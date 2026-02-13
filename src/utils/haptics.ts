/**
 * Web Vibrator API 封裝，提升 PWA 在移動端的操作反饋感。
 */

/**
 * 輕微的觸覺回饋（用於一般點擊）
 */
export const triggerLightHaptic = () => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(15);
  }
};

/**
 * 成功的觸覺回饋（用於排盤、解析成功）
 */
export const triggerSuccessHaptic = () => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate([20, 30, 20]);
  }
};

/**
 * 警告或錯誤的回饋
 */
export const triggerWarningHaptic = () => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate([50, 50, 50]);
  }
};
