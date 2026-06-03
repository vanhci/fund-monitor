/**
 * 通知管理模块
 *
 * 封装Chrome Notifications API，提供基金涨跌提醒功能
 */

/**
 * 发送浏览器通知
 *
 * @param {string} title - 通知标题
 * @param {string} message - 通知内容
 * @param {string} [id] - 通知ID（用于去重）
 */
function sendNotification(title, message, id) {
  const options = {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: title,
    message: message,
    priority: 2
  };

  const notificationId = id || `fund-${Date.now()}`;

  chrome.notifications.create(notificationId, options);
}

/**
 * 检查基金涨跌是否需要发送通知
 *
 * @param {Object} fund - 基金对象
 * @param {number} currentNav - 当前净值
 * @param {number} previousNav - 前一交易日净值
 * @param {Object} settings - 设置对象
 */
function checkAndNotify(fund, currentNav, previousNav, settings) {
  // 检查是否启用通知
  if (!settings.notificationEnabled || !fund.alertEnabled) {
    return;
  }

  // 计算当日涨跌幅
  const dailyChangePercent = ((currentNav - previousNav) / previousNav) * 100;

  // 当日涨跌幅超过阈值时触发通知
  if (Math.abs(dailyChangePercent) >= fund.alertThreshold) {
    const direction = dailyChangePercent >= 0 ? '上涨' : '下跌';
    const title = '基金净值提醒';
    const message = `${fund.name}(${fund.code}) 当日${direction} ${Math.abs(dailyChangePercent).toFixed(2)}%`;

    sendNotification(title, message, `fund-${fund.code}`);
  }
}

/**
 * 发送错误通知
 *
 * @param {string} message - 错误信息
 */
function sendErrorNotification(message) {
  sendNotification('基金监控错误', message, 'fund-error');
}

// 导出通知函数（兼容浏览器和Service Worker）
globalThis.FundNotification = {
  sendNotification,
  checkAndNotify,
  sendErrorNotification
};
