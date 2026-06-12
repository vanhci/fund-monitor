/**
 * Popup界面逻辑
 *
 * 处理用户交互、基金列表渲染和图表显示
 */

// 当前查看的基金代码
let currentFundCode = null;
// Chart.js实例
let historyChartInstance = null;

/**
 * 判断当前是否为交易时段
 *
 * @returns {boolean} 是否在交易时段（9:30-15:00）
 */
function isTradingHours() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const time = hours * 60 + minutes;

  // 9:30 = 570分钟, 15:00 = 900分钟
  return time >= 570 && time <= 900;
}

/**
 * 计算持仓收益
 *
 * @param {Object} fund - 基金对象
 * @param {number} currentNav - 当前净值
 * @returns {Object} 收益信息
 */
function calculateProfit(fund, currentNav) {
  if (!fund.costPrice || !fund.shares) {
    return { amount: 0, percent: 0 };
  }

  const currentValue = currentNav * fund.shares;
  const costValue = fund.costPrice * fund.shares;
  const profit = currentValue - costValue;
  const profitPercent = (profit / costValue) * 100;

  return {
    amount: profit,
    percent: profitPercent
  };
}

/**
 * 计算今日持仓收益
 *
 * @param {Object} fund - 基金对象
 * @param {number} estimateNav - 估算净值
 * @param {number} yesterdayNav - 昨日净值
 * @returns {number} 今日收益金额
 */
function calculateTodayProfit(fund, estimateNav, yesterdayNav) {
  if (!fund.shares || !estimateNav || !yesterdayNav) {
    return 0;
  }
  return fund.shares * (estimateNav - yesterdayNav);
}

/**
 * 渲染基金列表行
 *
 * @param {Object} fund - 基金对象
 * @param {Object} estimateData - 估值数据
 */
function renderFundRow(fund, estimateData) {
  const currentNav = estimateData.estimateNav || estimateData.nav;
  const changePercent = estimateData.estimateChange || 0;
  const profit = calculateProfit(fund, currentNav);
  const todayProfit = calculateTodayProfit(fund, estimateData.estimateNav, estimateData.nav);

  const direction = changePercent >= 0 ? 'up' : 'down';
  const profitDirection = profit.amount >= 0 ? 'up' : 'down';
  const todayProfitDirection = todayProfit >= 0 ? 'up' : 'down';
  const hasProfit = fund.costPrice && fund.shares;
  const hasTodayProfit = fund.shares && estimateData.estimateNav && estimateData.nav;

  const row = document.createElement('tr');
  row.className = 'fund-row';
  row.dataset.code = fund.code;

  row.innerHTML = `
    <td class="col-name">
      <div class="name-text">${fund.name || estimateData.name}</div>
      <div class="code-text">${fund.code}</div>
    </td>
    <td class="col-nav ${direction}">${currentNav.toFixed(4)}</td>
    <td class="col-change ${direction}">${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%</td>
    <td class="col-today ${todayProfitDirection}">${hasTodayProfit ? (todayProfit >= 0 ? '+' : '') + '¥' + todayProfit.toFixed(2) : '--'}</td>
    ${hasProfit ? `
    <td class="col-profit ${profitDirection}">
      ${profit.amount >= 0 ? '+' : ''}¥${profit.amount.toFixed(2)}
      <span class="profit-pct">(${profit.percent >= 0 ? '+' : ''}${profit.percent.toFixed(2)}%)</span>
    </td>
    ` : '<td class="col-profit empty">--</td>'}
  `;

  row.addEventListener('click', () => showDetail(fund));

  return row;
}

/**
 * 加载并显示基金列表
 */
async function loadFundList() {
  const fundList = document.getElementById('fund-list');
  const emptyState = document.getElementById('empty-state');
  const footer = document.getElementById('footer');

  try {
    const funds = await FundStorage.getFunds();

    // 清空列表
    fundList.innerHTML = '';

    if (funds.length === 0) {
      fundList.innerHTML = `
        <div class="empty-state">
          <p>暂无监控的基金</p>
          <p class="hint">点击 + 添加基金</p>
        </div>
      `;
      footer.style.display = 'none';
      return;
    }

    // 显示底部汇总
    footer.style.display = 'block';

    let totalAssets = 0;
    let totalCost = 0;
    let totalTodayProfit = 0;

    // 创建表格结构
    fundList.innerHTML = `
      <table class="fund-table">
        <colgroup>
          <col style="width:35%">
          <col style="width:13%">
          <col style="width:13%">
          <col style="width:16%">
          <col style="width:23%">
        </colgroup>
        <thead>
          <tr>
            <th>基金名称</th>
            <th>净值</th>
            <th>涨跌幅</th>
            <th>今日收益</th>
            <th>持仓收益</th>
          </tr>
        </thead>
        <tbody id="fund-tbody"></tbody>
      </table>
    `;
    const tbody = document.getElementById('fund-tbody');

    // 加载每个基金的数据
    for (const fund of funds) {
      try {
        const estimateData = await FundAPI.fetchFundEstimate(fund.code);
        const row = renderFundRow(fund, estimateData);
        tbody.appendChild(row);

        // 计算汇总
        const currentNav = estimateData.estimateNav || estimateData.nav;
        if (fund.shares) {
          totalAssets += currentNav * fund.shares;
          totalCost += fund.costPrice * fund.shares;
          totalTodayProfit += calculateTodayProfit(fund, estimateData.estimateNav, estimateData.nav);
        }
      } catch (error) {
        console.error(`加载基金 ${fund.code} 失败:`, error);
        // 显示错误行
        const errorRow = document.createElement('tr');
        errorRow.className = 'fund-row error';
        errorRow.innerHTML = `
          <td class="col-name">
            <div class="name-text">${fund.name || '--'}</div>
            <div class="code-text">${fund.code}</div>
          </td>
          <td colspan="3" class="col-error">数据获取失败</td>
        `;
        tbody.appendChild(errorRow);
      }
    }

    // 更新汇总信息
    const totalProfit = totalAssets - totalCost;
    const totalProfitPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
    const profitDirection = totalProfit >= 0 ? 'up' : 'down';
    const todayProfitDirection = totalTodayProfit >= 0 ? 'up' : 'down';

    document.getElementById('total-assets').textContent = `¥${totalAssets.toFixed(2)}`;
    document.getElementById('total-today-profit').innerHTML = `
      <span class="${todayProfitDirection}">
        ${totalTodayProfit >= 0 ? '+' : ''}¥${totalTodayProfit.toFixed(2)}
      </span>
    `;
    document.getElementById('total-profit').innerHTML = `
      <span class="${profitDirection}">
        ${totalProfit >= 0 ? '+' : ''}¥${totalProfit.toFixed(2)} (${totalProfitPercent >= 0 ? '+' : ''}${totalProfitPercent.toFixed(2)}%)
      </span>
    `;
  } catch (error) {
    console.error('加载基金列表失败:', error);
    fundList.innerHTML = `
      <div class="empty-state">
        <p style="color: #e74c3c;">加载失败</p>
        <p class="hint">请稍后重试</p>
      </div>
    `;
  }
}

/**
 * 显示基金详情对话框
 *
 * @param {Object} fund - 基金对象
 */
async function showDetail(fund) {
  currentFundCode = fund.code;
  const dialog = document.getElementById('dialog-detail');

  try {
    // 获取最新数据
    const estimateData = await FundAPI.fetchFundEstimate(fund.code);
    const currentNav = estimateData.estimateNav || estimateData.nav;
    const profit = calculateProfit(fund, currentNav);

    // 填充详情信息
    document.getElementById('detail-code').textContent = fund.code;
    document.getElementById('detail-name').textContent = fund.name || estimateData.name;
    document.getElementById('detail-nav').textContent = estimateData.nav.toFixed(4);
    document.getElementById('detail-estimate').textContent = estimateData.estimateNav.toFixed(4);

    const changePercent = estimateData.estimateChange;
    const changeDirection = changePercent >= 0 ? 'up' : 'down';
    document.getElementById('detail-change').innerHTML = `
      <span class="${changeDirection}">${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%</span>
    `;

    document.getElementById('detail-cost').value = fund.costPrice || '';
    document.getElementById('detail-shares').value = fund.shares || '';

    const profitDirection = profit.amount >= 0 ? 'up' : 'down';
    document.getElementById('detail-profit').innerHTML = `
      <span class="${profitDirection}">
        ${profit.amount >= 0 ? '+' : ''}¥${profit.amount.toFixed(2)} (${profit.percent >= 0 ? '+' : ''}${profit.percent.toFixed(2)}%)
      </span>
    `;

    // 显示对话框
    dialog.style.display = 'flex';

    // 加载历史图表
    loadHistoryChart(fund.code, '1w');
  } catch (error) {
    console.error('获取基金详情失败:', error);
    alert('获取基金详情失败，请稍后重试');
  }
}

/**
 * 加载历史净值图表
 *
 * @param {string} fundCode - 基金代码
 * @param {string} period - 时间周期（1w/1m/3m/1y/all）
 */
async function loadHistoryChart(fundCode, period) {
  const canvas = document.getElementById('history-chart');
  const ctx = canvas.getContext('2d');

  // 根据周期确定总请求数量（API单次最多40条）
  const pageCounts = {
    '1w': 1,    // 7条
    '1m': 1,    // 30条
    '3m': 3,    // 90条，分3页
    '1y': 10,   // 365条，分10页
    'all': 25   // 1000条，分25页
  };
  const pages = pageCounts[period] || 1;

  try {
    // 多页并发获取历史数据
    const promises = [];
    for (let i = 1; i <= pages; i++) {
      promises.push(FundAPI.fetchFundHistory(fundCode, 40, i));
    }
    const results = await Promise.all(promises);
    // 合并所有页数据（API返回按日期降序，第1页最新）
    const history = results.flat();

    if (history.length === 0) {
      ctx.fillStyle = '#999';
      ctx.textAlign = 'center';
      ctx.fillText('暂无历史数据', canvas.width / 2, canvas.height / 2);
      return;
    }

    // 准备图表数据
    const dates = history.map(item => item.date).reverse();
    const values = history.map(item => item.nav).reverse();

    // 销毁旧图表
    if (historyChartInstance) {
      historyChartInstance.destroy();
    }

    // 创建新图表
    historyChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: dates,
        datasets: [{
          label: '单位净值',
          data: values,
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => `净值: ${context.parsed.y.toFixed(4)}`
            }
          }
        },
        scales: {
          x: {
            display: true,
            ticks: {
              maxTicksLimit: 5,
              font: {
                size: 10
              }
            }
          },
          y: {
            display: true,
            ticks: {
              font: {
                size: 10
              }
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('加载历史数据失败:', error);
    ctx.fillStyle = '#999';
    ctx.textAlign = 'center';
    ctx.fillText('历史数据加载失败', canvas.width / 2, canvas.height / 2);
  }
}

/**
 * 添加基金
 */
async function addFund() {
  const codeInput = document.getElementById('fund-code');
  const costInput = document.getElementById('cost-price');
  const sharesInput = document.getElementById('shares');
  const thresholdInput = document.getElementById('alert-threshold');

  const code = codeInput.value.trim();

  // 验证基金代码
  if (!code || !/^\d{6}$/.test(code)) {
    alert('请输入有效的6位基金代码');
    return;
  }

  try {
    // 自动获取基金名称
    const estimateData = await FundAPI.fetchFundEstimate(code);
    const name = estimateData.name;

    // 添加到存储
    await FundStorage.addFund({
      code,
      name,
      costPrice: parseFloat(costInput.value) || 0,
      shares: parseFloat(sharesInput.value) || 0,
      alertThreshold: parseFloat(thresholdInput.value) || 2.0
    });

    // 关闭对话框
    document.getElementById('dialog-add').style.display = 'none';

    // 清空表单
    codeInput.value = '';
    costInput.value = '';
    sharesInput.value = '';
    thresholdInput.value = '2.0';

    // 重新加载列表
    await loadFundList();
  } catch (error) {
    alert(error.message);
  }
}

/**
 * 删除基金
 *
 * @param {string} code - 基金代码
 */
async function deleteFund(code) {
  if (!confirm(`确定要删除基金 ${code} 吗？`)) {
    return;
  }

  try {
    await FundStorage.deleteFund(code);
    document.getElementById('dialog-detail').style.display = 'none';
    await loadFundList();
  } catch (error) {
    alert(error.message);
  }
}

/**
 * 初始化事件监听
 */
function initEventListeners() {
  // 添加基金按钮
  document.getElementById('btn-add').addEventListener('click', () => {
    document.getElementById('dialog-add').style.display = 'flex';
  });

  // 取消按钮
  document.getElementById('btn-cancel').addEventListener('click', () => {
    document.getElementById('dialog-add').style.display = 'none';
  });

  // 确认添加按钮
  document.getElementById('btn-confirm').addEventListener('click', addFund);

  // 刷新按钮
  document.getElementById('btn-refresh').addEventListener('click', async () => {
    const btn = document.getElementById('btn-refresh');
    btn.textContent = '刷新中...';
    btn.disabled = true;

    try {
      await loadFundList();
    } finally {
      btn.textContent = '刷新';
      btn.disabled = false;
    }
  });

  // 设置按钮
  document.getElementById('btn-settings').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // 关闭详情对话框
  document.getElementById('btn-close').addEventListener('click', () => {
    document.getElementById('dialog-detail').style.display = 'none';
  });

  // 删除基金按钮
  document.getElementById('btn-delete').addEventListener('click', () => {
    if (currentFundCode) {
      deleteFund(currentFundCode);
    }
  });

  // 保存持仓信息
  document.getElementById('btn-save-detail').addEventListener('click', async () => {
    if (!currentFundCode) return;
    const cost = parseFloat(document.getElementById('detail-cost').value) || 0;
    const shares = parseFloat(document.getElementById('detail-shares').value) || 0;
    try {
      await FundStorage.updateFund(currentFundCode, { costPrice: cost, shares: shares });
      document.getElementById('dialog-detail').style.display = 'none';
      await loadFundList();
    } catch (error) {
      alert(error.message);
    }
  });

  // 图表时间切换
  document.querySelectorAll('.chart-tabs .tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      // 更新选中状态
      document.querySelectorAll('.chart-tabs .tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');

      // 加载对应周期的数据
      const period = e.target.dataset.period;
      if (currentFundCode) {
        loadHistoryChart(currentFundCode, period);
      }
    });
  });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  loadFundList();
});

