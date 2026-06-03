/**
 * 后台服务脚本
 *
 * 主要职责：
 * - 处理来自popup的消息请求（获取基金数据）
 * - 定时刷新基金数据
 * - 检查涨跌并发送通知
 */

// 导入工具模块
importScripts('../utils/api.js', '../utils/storage.js', '../utils/notification.js');

// 请求头配置
const REQUEST_HEADERS = {
  'Referer': 'https://fundf10.eastmoney.com/',
  'Accept': '*/*'
};

/**
 * 发送带重试的fetch请求
 *
 * @param {string} url - 请求URL
 * @param {number} maxRetries - 最大重试次数
 * @returns {Promise<string>} 响应文本
 */
async function fetchWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        headers: REQUEST_HEADERS
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      // 指数退避
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

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

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 处理估算净值请求
  if (request.action === 'fetchEstimate') {
    fetchWithRetry(request.url)
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 保持消息通道开放
  }

  // 处理历史净值请求
  if (request.action === 'fetchHistory') {
    fetchWithRetry(request.url)
      .then(text => {
        console.log('[历史净值] 原始响应:', text.substring(0, 500));
        try {
          const data = JSON.parse(text);
          console.log('[历史净值] 解析结果:', JSON.stringify(data).substring(0, 500));
          sendResponse({ success: true, data });
        } catch (e) {
          console.error('[历史净值] JSON解析失败:', e, '原始文本:', text.substring(0, 200));
          sendResponse({ success: false, error: 'JSON解析失败: ' + text.substring(0, 100) });
        }
      })
      .catch(error => {
        console.error('[历史净值] 请求失败:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  // 处理手动刷新请求
  if (request.action === 'refreshAll') {
    refreshAllFunds()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
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
