# dsh-btw-plugin

[![npm version](https://img.shields.io/npm/v/@wlv-zedd/dsh-btw-plugin.svg?style=flat&color=3b82f6)](https://www.npmjs.com/package/@wlv-zedd/dsh-btw-plugin)
[![dsh-market](https://img.shields.io/badge/dsh--market-available-c0392b?style=flat)](https://dshmarket.com/p/WLV-ZEDD/dsh-btw/)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/WLV-ZEDD/dsh-btw/blob/main/LICENSE)

> **DeepSeek Harness 侧边助手面板**
> 随时提问，不打断也不污染当前主 Agent 运行。

<p align="center">
  <img src="https://raw.githubusercontent.com/WLV-ZEDD/dsh-btw/main/assets/promo-dshmarket-official.png" alt="dsh-btw on DSH Market" width="100%">
</p>

![dsh-btw 交互演示](https://raw.githubusercontent.com/WLV-ZEDD/dsh-btw/main/assets/demo.gif)

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

- **主动会话与循环上下文感知：**
  动态继承当前会话模型，并通过 `session.deriveMessages()` 和活跃工作区提取近期对话历史，使 `/btw` 在不打断执行的前提下完全了解你和主 Agent 正在处理的内容。

- **准确性优先的系统提示词：**
  六条简洁正向指令引导模型精确保留名词、忠实合成会话历史并直接作答——无过度防御性约束导致幻觉。

- **富 Markdown 渲染：**
  粗体、斜体、行内代码、编号列表（以主题蓝色渲染真实的 `1.` `2.` 数字）和项目符号——紧凑卡片中无多余 Markdown 表格干扰。

- **独立 JSON 存储：**
  将会话问答历史持久化到 `~/.dsh/storages/btw-history.json`，不修改或污染其他插件。

---

## 安装

### 方式一：通过 DSH 插件市场（推荐）
在 DSH Web UI 中通过 **设置 → 插件市场**（搜索 `dsh-btw`）直接安装，或运行：

```bash
pnpm dsh plugin add @wlv-zedd/dsh-btw-plugin
```

### 方式二：手动 npm 与 Cordis 配置
将 dsh-btw-plugin 安装到你的 DeepSeek Harness 环境：

```bash
pnpm add @wlv-zedd/dsh-btw-plugin
```

在 `cordis.yml`（或 `cordis.patch.yml`）中启用插件：

```yaml
# cordis.yml
plugins:
  @wlv-zedd/dsh-btw-plugin:
    # 可选：指定专用模型，或省略以自动继承活跃会话模型
    # model: deepseek:deepseek-chat
```

---

## 使用方法

### 在 Web 对话界面中
在 `/btw` 后输入你的问题：

```text
/btw PostgreSQL 的端口号是多少？
/btw TCP 和 UDP 有什么区别？
```

- **浮动面板：** 问题立即显示在输入框上方，量子均衡器开始脉冲。回答生成后，富 Markdown 答案随即呈现。
- **分页（`< 1/5 >`）：** 使用 `<` 和 `>` 在当前会话的历史侧边问题间切换。
- **操作控件：**
  - **复制：** 将答案复制到剪贴板。
  - **删除：** 从会话历史中移除该问题。
  - **折叠 / 展开：** 切换答案视图，保持工作区整洁。
  - **关闭 [X]：** 关闭浮动面板。

---

## 支持与社区福利

[![通过 PayPal 赞助](https://img.shields.io/badge/Sponsor-PayPal-0070ba?style=flat&logo=paypal&logoColor=white)](https://paypal.me/wlvzedd) 如果你觉得此插件有用，欢迎小额打赏。

[![AgentRouter 免费 AI 额度](https://img.shields.io/badge/Free%20AI%20Credits-%24200-ff6b35?style=flat&logoColor=white)](https://agentrouter.org/register?aff=bIJf) 使用 GitHub 账号在 AgentRouter 注册，即可获得最高 **$200 的免费 API 额度**，用于你的 DeepSeek 和 LLM 工作流。

---

## 许可证

MIT © [WLV-ZEDD](https://github.com/WLV-ZEDD)
