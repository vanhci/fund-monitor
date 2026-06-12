/**
 * 存储管理模块
 *
 * 封装 Chrome Storage API，提供基金列表、设置和历史缓存存储。
 */

const DEFAULT_SETTINGS = {
  refreshInterval: 30,
  notificationEnabled: true,
  theme: 'light'
};

async function getFunds() {
  const result = await chrome.storage.local.get('funds');
  return result.funds || [];
}

async function saveFunds(funds) {
  await chrome.storage.local.set({ funds });
}

async function addFund(fund) {
  const funds = await getFunds();
  const exists = funds.find(f => f.code === fund.code);

  if (exists) {
    throw new Error(`基金 ${fund.code} 已存在`);
  }

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

async function updateFund(code, updates) {
  const funds = await getFunds();
  const index = funds.findIndex(f => f.code === code);

  if (index === -1) {
    throw new Error(`基金 ${code} 不存在`);
  }

  funds[index] = { ...funds[index], ...updates };
  await saveFunds(funds);
  return funds[index];
}

async function deleteFund(code) {
  const funds = await getFunds();
  const filtered = funds.filter(f => f.code !== code);

  if (filtered.length === funds.length) {
    throw new Error(`基金 ${code} 不存在`);
  }

  await saveFunds(filtered);
  await chrome.storage.local.remove(`history_${code}`);
}

async function getSettings() {
  const result = await chrome.storage.local.get('settings');
  return { ...DEFAULT_SETTINGS, ...result.settings };
}

async function saveSettings(settings) {
  const current = await getSettings();
  await chrome.storage.local.set({
    settings: { ...current, ...settings }
  });
}

async function getHistoryCache(code) {
  const result = await chrome.storage.local.get(`history_${code}`);
  return result[`history_${code}`] || null;
}

async function saveHistoryCache(code, data) {
  const cache = {
    lastUpdated: new Date().toISOString(),
    data
  };
  await chrome.storage.local.set({ [`history_${code}`]: cache });
}

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
