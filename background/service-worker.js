/**
 * 后台服务脚本
 *
 * 主要职责：
 * - 定时刷新基金数据
 * - 检查涨跌并发送通知
 */

// 导入工具模块
importScripts('../utils/api.js', '../utils/storage.js', '../utils/notification.js');

/**
 * 刷新所有基金数据并检查通知
 */
async function refreshAllFunds() {
  try {
    const funds = await FundStorage.getFunds();
    const settings = await FundStorage.getSettings();

    for (const fund of funds) {
      try {
        // 获取最新估值数据
        const estimateData = await FundAPI.fetchFundEstimate(fund.code);

        // 获取历史数据（取最近2天用于计算涨跌）
        const history = await FundAPI.fetchFundHistory(fund.code, 2);
        const currentNav = estimateData.estimateNav || estimateData.nav;
        const previousNav = history.length >= 2 ? history[1].nav : estimateData.nav;

        // 检查是否需要发送通知
        FundNotification.checkAndNotify(fund, currentNav, previousNav, settings);
      } catch (error) {
        console.error(`刷新基金 ${fund.code} 失败:`, error);
      }
    }
  } catch (error) {
    console.error('刷新基金列表失败:', error);
    FundNotification.sendErrorNotification('基金数据刷新失败，请检查网络连接');
  }
}

// 监听手动刷新消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'refreshAll') {
    refreshAllFunds()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// 点击扩展图标时打开独立窗口
chrome.action.onClicked.addListener(async () => {
  // 检查是否已有窗口打开
  const windows = await chrome.windows.getAll();
  const existingWindow = windows.find(w => w.type === 'popup');

  if (existingWindow) {
    // 如果已有窗口，聚焦到该窗口
    await chrome.windows.update(existingWindow.id, { focused: true });
  } else {
    // 创建新窗口
    await chrome.windows.create({
      url: chrome.runtime.getURL('popup/popup.html'),
      type: 'popup',
      width: 700,
      height: 650,
      focused: true
    });
  }
});

// 设置定时任务
chrome.alarms.create('refreshFunds', {
  periodInMinutes: 30 // 每30分钟刷新一次
});

// 监听定时任务
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'refreshFunds') {
    refreshAllFunds();
  }
});

// 插件安装时初始化
chrome.runtime.onInstalled.addListener(() => {
  console.log('基金净值监控插件已安装');
});
