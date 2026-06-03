/**
 * 设置页面逻辑
 *
 * 管理插件的配置选项
 */

// DOM元素
const refreshInterval = document.getElementById('refresh-interval');
const notificationToggle = document.getElementById('notification-toggle');
const defaultThreshold = document.getElementById('default-threshold');
const btnSave = document.getElementById('btn-save');
const btnExport = document.getElementById('btn-export');
const btnImport = document.getElementById('btn-import');
const importFile = document.getElementById('import-file');
const btnClear = document.getElementById('btn-clear');
const saveMessage = document.getElementById('save-message');

/**
 * 加载设置
 */
async function loadSettings() {
  const settings = await FundStorage.getSettings();

  // 刷新间隔
  refreshInterval.value = settings.refreshInterval;

  // 通知开关
  if (settings.notificationEnabled) {
    notificationToggle.classList.add('active');
  } else {
    notificationToggle.classList.remove('active');
  }
}

/**
 * 保存设置
 */
async function saveSettings() {
  const settings = {
    refreshInterval: parseInt(refreshInterval.value),
    notificationEnabled: notificationToggle.classList.contains('active')
  };

  await FundStorage.saveSettings(settings);

  // 更新定时任务
  chrome.alarms.create('refreshFunds', {
    periodInMinutes: settings.refreshInterval
  });

  // 显示保存成功消息
  saveMessage.classList.add('show');
  setTimeout(() => {
    saveMessage.classList.remove('show');
  }, 2000);
}

/**
 * 导出基金数据
 */
async function exportData() {
  const funds = await FundStorage.getFunds();
  const settings = await FundStorage.getSettings();

  const exportData = {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    funds,
    settings
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `fund-monitor-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 导入基金数据
 */
async function importData(file) {
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (!data.funds || !Array.isArray(data.funds)) {
      throw new Error('无效的备份文件格式');
    }

    if (!confirm(`确定要导入 ${data.funds.length} 只基金的数据吗？这将覆盖现有数据。`)) {
      return;
    }

    // 保存基金数据
    await FundStorage.saveFunds(data.funds);

    // 保存设置（如果有）
    if (data.settings) {
      await FundStorage.saveSettings(data.settings);
    }

    alert('数据导入成功！');
    await loadSettings();
  } catch (error) {
    alert('导入失败: ' + error.message);
  }
}

/**
 * 清除所有数据
 */
async function clearAllData() {
  if (!confirm('确定要清除所有数据吗？此操作不可恢复！')) {
    return;
  }

  if (!confirm('再次确认：这将删除所有基金数据、设置和缓存。')) {
    return;
  }

  await chrome.storage.local.clear();
  alert('所有数据已清除');
  await loadSettings();
}

// 事件监听

// 通知开关
notificationToggle.addEventListener('click', () => {
  notificationToggle.classList.toggle('active');
});

// 保存按钮
btnSave.addEventListener('click', saveSettings);

// 导出按钮
btnExport.addEventListener('click', exportData);

// 导入按钮
btnImport.addEventListener('click', () => {
  importFile.click();
});

// 文件选择
importFile.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    importData(e.target.files[0]);
  }
});

// 清除数据按钮
btnClear.addEventListener('click', clearAllData);

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', loadSettings);
