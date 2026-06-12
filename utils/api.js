/**
 * 天天基金 API 封装模块
 *
 * 提供基金净值数据获取功能：
 * - 盘中估算净值
 * - 历史净值数据
 */

const API_CONFIG = {
  estimateUrl: 'https://fundgz.1234567.com.cn/js/',
  historyUrl: 'https://api.fund.eastmoney.com/f10/lsjz',
  headers: {
    'Referer': 'https://fundf10.eastmoney.com/',
    'Accept': '*/*'
  }
};

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
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

function parseJSONP(text) {
  const match = text.match(/^\s*jsonpgz\((.+)\);?\s*$/);
  if (!match || !match[1]) {
    return null;
  }

  try {
    return JSON.parse(match[1]);
  } catch (error) {
    console.error('JSONP 解析失败:', error);
    return null;
  }
}

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
      navDate: data.jzrq,
      nav: parseFloat(data.dwjz),
      estimateNav: parseFloat(data.gsz),
      estimateChange: parseFloat(data.gszzl),
      estimateTime: data.gztime
    };
  } catch (error) {
    console.error(`获取基金 ${fundCode} 估值失败:`, error);
    throw error;
  }
}

async function fetchFundHistory(fundCode, pageSize = 30, pageIndex = 1) {
  const safePageSize = Math.min(pageSize, 40);
  const url = `${API_CONFIG.historyUrl}?fundCode=${fundCode}&pageIndex=${pageIndex}&pageSize=${safePageSize}`;

  try {
    const text = await fetchWithRetry(url);
    const data = JSON.parse(text);

    if (data.Data && typeof data.Data === 'object' && data.Data.LSJZList) {
      return data.Data.LSJZList.map(item => ({
        date: item.FSRQ,
        nav: parseFloat(item.DWJZ),
        totalNav: parseFloat(item.LJJZ),
        changePercent: parseFloat(item.JZZZL)
      }));
    }

    return [];
  } catch (error) {
    console.error(`获取基金 ${fundCode} 历史数据失败:`, error);
    throw error;
  }
}

globalThis.FundAPI = {
  fetchFundEstimate,
  fetchFundHistory
};
