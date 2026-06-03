/**
 * 天天基金API封装模块
 *
 * 提供基金净值数据的获取功能，包括：
 * - 盘中估算净值（实时）
 * - 历史净值数据
 */

// API基础配置
const API_CONFIG = {
  // 估算净值接口（JSONP格式）
  estimateUrl: 'https://fundgz.1234567.com.cn/js/',
  // 历史净值接口
  historyUrl: 'https://api.fund.eastmoney.com/f10/lsjz',
  // 请求头Referer
  referer: 'https://fundf10.eastmoney.com/'
};

/**
 * 解析JSONP响应，提取JSON数据
 *
 * @param {string} text - JSONP格式的响应文本
 * @returns {Object|null} 解析后的JSON对象，解析失败返回null
 */
function parseJSONP(text) {
  // 使用正则提取jsonpgz({...})中的JSON部分
  const match = text.match(/^\s*jsonpgz\((.+)\);?\s*$/);
  if (match && match[1]) {
    try {
      return JSON.parse(match[1]);
    } catch (e) {
      console.error('JSONP解析失败:', e);
      return null;
    }
  }
  return null;
}

/**
 * 获取基金估算净值（盘中实时）
 *
 * @param {string} fundCode - 6位基金代码
 * @returns {Promise<Object>} 基金估值数据
 */
async function fetchFundEstimate(fundCode) {
  const url = `${API_CONFIG.estimateUrl}${fundCode}.js`;

  return new Promise((resolve, reject) => {
    // 通过background script发送请求，避免CORS限制
    chrome.runtime.sendMessage(
      { action: 'fetchEstimate', url },
      response => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (response.success) {
          const data = parseJSONP(response.data);
          if (data) {
            resolve({
              code: data.fundcode,
              name: data.name,
              navDate: data.jzrq,        // 净值日期
              nav: parseFloat(data.dwjz), // 单位净值
              estimateNav: parseFloat(data.gsz), // 估算净值
              estimateChange: parseFloat(data.gszzl), // 估算涨跌幅
              estimateTime: data.gztime   // 估算时间
            });
          } else {
            reject(new Error('数据解析失败'));
          }
        } else {
          reject(new Error(response.error));
        }
      }
    );
  });
}

/**
 * 获取基金历史净值
 *
 * @param {string} fundCode - 6位基金代码
 * @param {number} pageSize - 每页数量（7=1周, 30=1月, 90=3月, 365=1年）
 * @param {number} pageIndex - 页码（从1开始）
 * @returns {Promise<Array>} 历史净值数组
 */
async function fetchFundHistory(fundCode, pageSize = 30, pageIndex = 1) {
  // API单次最多返回40条，超过会返回空数据
  const safePageSize = Math.min(pageSize, 40);
  const url = `${API_CONFIG.historyUrl}?fundCode=${fundCode}&pageIndex=${pageIndex}&pageSize=${safePageSize}`;

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action: 'fetchHistory', url },
      response => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (response.success) {
          const data = response.data;
          // Data可能为空字符串（请求量过大或无数据时）
          if (data.Data && typeof data.Data === 'object' && data.Data.LSJZList) {
            const history = data.Data.LSJZList.map(item => ({
              date: item.FSRQ,
              nav: parseFloat(item.DWJZ),
              totalNav: parseFloat(item.LJJZ),
              changePercent: parseFloat(item.JZZZL)
            }));
            resolve(history);
          } else {
            // 返回空数组而不是抛错，让调用方处理
            resolve([]);
          }
        } else {
          reject(new Error(response.error));
        }
      }
    );
  });
}

// 导出API函数（兼容浏览器和Service Worker）
globalThis.FundAPI = {
  fetchFundEstimate,
  fetchFundHistory
};
