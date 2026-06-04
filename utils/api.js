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
  // 请求头配置
  headers: {
    'Referer': 'https://fundf10.eastmoney.com/',
    'Accept': '*/*'
  }
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
        headers: API_CONFIG.headers
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

  try {
    const text = await fetchWithRetry(url);
    const data = parseJSONP(text);

    if (!data) {
      throw new Error('数据解析失败');
    }

    return {
      code: data.fundcode,
      name: data.name,
      navDate: data.jzrq,        // 净值日期
      nav: parseFloat(data.dwjz), // 单位净值
      estimateNav: parseFloat(data.gsz), // 估算净值
      estimateChange: parseFloat(data.gszzl), // 估算涨跌幅
      estimateTime: data.gztime   // 估算时间
    };
  } catch (error) {
    console.error(`获取基金 ${fundCode} 估值失败:`, error);
    throw error;
  }
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

  try {
    const text = await fetchWithRetry(url);
    const data = JSON.parse(text);

    // Data可能为空字符串（请求量过大或无数据时）
    if (data.Data && typeof data.Data === 'object' && data.Data.LSJZList) {
      return data.Data.LSJZList.map(item => ({
        date: item.FSRQ,
        nav: parseFloat(item.DWJZ),
        totalNav: parseFloat(item.LJJZ),
        changePercent: parseFloat(item.JZZZL)
      }));
    }

    // 返回空数组而不是抛错，让调用方处理
    return [];
  } catch (error) {
    console.error(`获取基金 ${fundCode} 历史数据失败:`, error);
    throw error;
  }
}

// 导出API函数
globalThis.FundAPI = {
  fetchFundEstimate,
  fetchFundHistory
};
