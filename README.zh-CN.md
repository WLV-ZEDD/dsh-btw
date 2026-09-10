# dsh-btw-plugin

[English](./README.md) | [中文](./README.zh-CN.md)

[![npm version](https://img.shields.io/npm/v/@wlv-zedd/dsh-btw-plugin.svg?style=flat&color=3b82f6)](https://www.npmjs.com/package/@wlv-zedd/dsh-btw-plugin)
[![dsh-market](https://img.shields.io/badge/dsh--market-available-c0392b?style=flat)](https://dshmarket.com/p/WLV-ZEDD/dsh-btw/)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/WLV-ZEDD/dsh-btw/blob/main/LICENSE)

> **DeepSeek Harness 侧边助手面板**
> 随时提问，不打断也不污染当前主 Agent 运行。

<p align="center">
  <img src="https://raw.githubusercontent.com/WLV-ZEDD/dsh-btw/main/assets/promo-dshmarket-official.png?v=1.0.3" alt="dsh-btw on DSH Market" width="100%">
</p>

![dsh-btw 交互演示](https://raw.githubusercontent.com/WLV-ZEDD/dsh-btw/main/assets/demo.gif?v=1.0.3)

---

## 功能特性

- **即时非阻塞 /btw 命令：**
  在对话框中输入 `/btw <问题>`，输入框立即清空（0ms），并在后台执行，不影响主 Agent 的运行。

- **悬浮于输入框上方的浮动面板：**
  紧贴消息输入框上方显示，带有实时量子均衡器动画、Markdown 渲染、分页（`< 1/5 >`）以及展开/折叠切换。

- **量子均衡器可视化：**
  五根动态药丸条在生成回答时以主题蓝色脉冲。自动重试期间，所有条形和状态徽章切换为琥珀色，让你随时掌握当前状态。

- **智能自动重试（5 步）：**
  遇到瞬态模型错误时，插件以快速连发方式最多重试 5 次（1 秒 → 1.5 秒 → 2 秒 → 2.5 秒 → 3 秒，约 10 秒总计）。状态徽章以琥珀色显示 `Retrying (X/5)...`，让你一目了然。

- **当前会话与循环上下文感知：**
  动态继承当前会话的模型，并提取最近轮次历史（`session.deriveMessages()`、当前工作区），让 `/btw` 清楚了解你与主 Agent 正在进行的工作，无需中断当前执行。

- **精准优先系统提示词：**
  6 条明确的积极指示，指导模型忠实保留专有名词与会话历史，直接作答，避免因过度防御性限制导致幻觉。

- **丰富的 Markdown 渲染：**
  支持粗体、斜体、行内代码、有序列表（在 UI 中呈现为主题蓝色的真实数字序号 `1.` `2.`）与无序列表，无需用表格占用紧凑空间。

- **隔离的 JSON 持久化：**
  在 `~/.dsh/storages/btw-history.json` 中独立保存会话问答历史，不污染也不修改其他插件的数据。

---

## 安装方法

### 方式 1：通过 DSH 插件市场安装（推荐）
在 DSH Web UI 中点击 **Settings → Plugin Market**，搜索 `dsh-btw` 并安装，或者运行：

```bash
pnpm dsh plugin add @wlv-zedd/dsh-btw-plugin
```

### 方式 2：通过 npm 手动安装并配置 Cordis
将插件安装到你的 DeepSeek Harness 环境中：

```bash
pnpm add @wlv-zedd/dsh-btw-plugin
```

在 `cordis.yml`（或 `cordis.patch.yml`）中启用插件：

```yaml
# cordis.yml
plugins:
  @wlv-zedd/dsh-btw-plugin:
    # 可选：指定独立模型；留空则自动继承当前会话模型
    # model: deepseek:deepseek-chat
```

---

## 使用指南

### 在 Web 聊天界面中
在输入框输入 `/btw` 紧跟你的问题：

```text
/btw PostgreSQL 的默认端口是多少？
/btw 简要解释 TCP 和 UDP 的区别
```

- **浮动面板：** 输入框上方立即出现问题卡片，伴随量子均衡器脉冲。生成完毕后展示富文本 Markdown 回答。
- **分页导航（`< 1/5 >`）：** 点击 `<` 与 `>` 翻阅当前会话历史中的侧边问答。
- **操作按钮：**
  - **复制：** 一键将回答复制到剪贴板。
  - **删除：** 从会话历史中移除该条记录。
  - **折叠 / 展开：** 收起回答内容，保持工作区清爽。
  - **关闭 [X]：** 关闭浮动卡片面板。

---

## 支持与社区福利

[![Sponsor via PayPal](https://img.shields.io/badge/Sponsor-PayPal-0070ba?style=flat&logo=paypal&logoColor=white)](https://paypal.me/wlvzedd) 如果你觉得本插件对你有帮助，欢迎赞助支持。

[![Free AI Credits on AgentRouter](https://img.shields.io/badge/Free%20AI%20Credits-%24200-ff6b35?style=flat&logoColor=white)](https://agentrouter.org/register?aff=bIJf) 使用 GitHub 注册 AgentRouter 即可领取最高 **$200 免费额度**，用于 LLM 工作流。

[![Free AI Credits on Vyce AI](https://img.shields.io/badge/Free%20AI%20Credits-%2450-7c3aed?style=flat&logoColor=white)](https://vyceai.com/signup?ref=VYCE_BL6YAG) 注册 Vyce AI 即可领取 **$50 免费额度**，用于高速 LLM 工作流。

---

## 开源协议

MIT © [WLV-ZEDD](https://github.com/WLV-ZEDD)
