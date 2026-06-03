/**
 * 存储管理模块
 *
 * 封装Chrome Storage API，提供基金数据的本地存储功能
 * 支持基金列表管理、持仓数据、设置和历史缓存
 */

// 默认设置
const DEFAULT_SETTINGS = {
  refreshInterval: 30,       // 刷新间隔（分钟）
  notificationEnabled: true, // 是否启用通知
  theme: 'light'             // 主题
};

/**
 * 获取所有基金列表
 *
 * @returns {Promise<Array>} 基金列表
 */
async function getFunds() {
  const result = await chrome.storage.local.get('funds');
  return result.funds || [];
}

/**
 * 保存基金列表
 *
 * @param {Array} funds - 基金列表
 */
async function saveFunds(funds) {
  await chrome.storage.local.set({ funds });
}

/**
 * 添加基金
 *
 * @param {Object} fund - 基金对象
 * @param {string} fund.code - 基金代码
 * @param {string} fund.name - 基金名称
 * @param {number} fund.costPrice - 持仓成本价
 * @param {number} fund.shares - 持有份额
 * @param {boolean} fund.alertEnabled - 是否启用提醒
 * @param {number} fund.alertThreshold - 涨跌幅阈值（%）
 */
async function addFund(fund) {
  const funds = await getFunds();

  // 检查是否已存在
  const exists = funds.find(f => f.code === fund.code);
  if (exists) {
    throw new Error(`基金 ${fund.code} 已存在`);
  }

  // 添加默认字段
  const newFund = {
    code: fund.code,
    name: fund.name || '',
    addedAt: new Date().toISOString(),
    costPrice: fund.costPrice || 0,
    shares: fund.shares || 0,
    alertEnabled: fund.alertEnabled !== undefined ? fund.alertEnabled : true,
    alertThreshold: fund.alertThreshold || 2.0
  };

  funds.push(newFund);
  await saveFunds(funds);
  return newFund;
}

/**
 * 更新基金信息
 *
 * @param {string} code - 基金代码
 * @param {Object} updates - 要更新的字段
 */
async function updateFund(code, updates) {
  const funds = await getFunds();
  const index = funds.findIndex(f => f.code === code);

  if (index === -1) {
    throw new Error(`基金 ${code} 不存在`);
  }

  // 合并更新
  funds[index] = { ...funds[index], ...updates };
  await saveFunds(funds);
  return funds[index];
}

/**
 * 删除基金
 *
 * @param {string} code - 基金代码
 */
async function deleteFund(code) {
  const funds = await getFunds();
  const filtered = funds.filter(f => f.code !== code);

  if (filtered.length === funds.length) {
    throw new Error(`基金 ${code} 不存在`);
  }

  await saveFunds(filtered);

  // 同时删除该基金的历史缓存
  await chrome.storage.local.remove(`history_${code}`);
}

/**
 * 获取设置
 *
 * @returns {Object} 设置对象
 */
async function getSettings() {
  const result = await chrome.storage.local.get('settings');
  return { ...DEFAULT_SETTINGS, ...result.settings };
}

/**
 * 保存设置
 *
 * @param {Object} settings - 设置对象
 */
async function saveSettings(settings) {
  const current = await getSettings();
  await chrome.storage.local.set({
    settings: { ...current, ...settings }
  });
}

/**
 * 获取历史缓存
 *
 * @param {string} code - 基金代码
 * @returns {Promise<Object|null>} 缓存数据
 */
async function getHistoryCache(code) {
  const result = await chrome.storage.local.get(`history_${code}`);
  return result[`history_${code}`] || null;
}

/**
 * 保存历史缓存
 *
 * @param {string} code - 基金代码
 * @param {Array} data - 历史数据
 */
async function saveHistoryCache(code, data) {
  const cache = {
    lastUpdated: new Date().toISOString(),
    data
  };
  await chrome.storage.local.set({ [`history_${code}`]: cache });
}

// 导出存储函数（兼容浏览器和Service Worker）
globalThis.FundStorage = {
  getFunds,
  saveFunds,
  addFund,
  updateFund,
  deleteFund,
  getSettings,
  saveSettings,
  getHistoryCache,
  saveHistoryCache
};
