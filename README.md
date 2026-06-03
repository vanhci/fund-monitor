# 基金净值监控

一款 Chrome 浏览器扩展，用于监控国内场外基金净值变动，支持实时估值、涨跌提醒和持仓收益计算。

## 功能特性

- **实时净值显示**：表格形式展示基金最新估算净值和涨跌幅
- **涨跌提醒**：当日涨跌幅超过设定阈值时发送浏览器通知
- **历史图表**：查看基金净值走势图（1周/1月/3月/1年/全部）
- **持仓管理**：记录持仓成本价和份额，自动计算持仓收益
- **数据导入导出**：支持 JSON 格式的备份和恢复
- **自动刷新**：可配置 15分钟/30分钟/1小时/2小时 刷新间隔

## 安装方法

### 从 Chrome 商店安装

暂未上架，请使用开发者模式安装。

### 开发者模式安装

1. 克隆本项目到本地
   ```bash
   git clone https://github.com/vanhci/fund-monitor.git
   ```
2. 打开 Chrome 浏览器，访问 `chrome://extensions/`
3. 开启右上角的「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择项目根目录
6. 插件图标将出现在浏览器工具栏

## 使用说明

### 添加基金

1. 点击浏览器工具栏中的插件图标
2. 点击右上角的「+」按钮
3. 输入 6 位基金代码（如：000001）
4. 可选填持仓成本价和持有份额
5. 点击「确认添加」

### 查看详情

点击列表中的基金可查看详细信息，包括：
- 当前净值、估算净值、估算涨跌
- 持仓成本、持有份额、持仓收益
- 历史净值走势图

### 设置提醒

在基金详情中可修改涨跌提醒阈值（默认 2%），在设置页面可开启/关闭通知功能。

### 数据备份

在设置页面可导出所有基金数据为 JSON 文件，也可从文件导入数据（将覆盖现有数据）。

## 数据来源

- **估算净值**：[天天基金](https://fund.eastmoney.com/) 盘中实时估值（仅供参考）
- **历史净值**：东方财富基金历史数据

## 技术栈

- Chrome Extension Manifest V3
- 原生 JavaScript（无框架依赖）
- [Chart.js](https://www.chartjs.org/) 图表库
- Chrome Storage API / Alarms API / Notifications API

## 项目结构

```
fund-monitor/
├── manifest.json          # 扩展配置
├── rules.json             # declarativeNetRequest 规则（CORS 处理）
├── background/
│   └── service-worker.js  # 后台服务脚本
├── popup/
│   ├── popup.html         # 弹窗页面
│   ├── popup.js           # 弹窗逻辑
│   └── popup.css          # 弹窗样式
├── options/
│   ├── options.html       # 设置页面
│   └── options.js         # 设置逻辑
├── utils/
│   ├── api.js             # 天天基金 API 封装
│   ├── storage.js         # 本地存储管理
│   └── notification.js    # 通知管理
├── lib/
│   └── chart.min.js       # Chart.js 图表库
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## 浏览器兼容性

- Chrome 93+
- Edge 93+（基于 Chromium）

## 注意事项

1. 盘中时段（9:30-15:00）显示的是估算净值，收盘后显示真实净值
2. 数据每 30 分钟自动刷新一次（可在设置中调整）
3. 估算净值仅供参考，以基金公司公布的实际净值为准

## 许可证

[MIT License](LICENSE)
