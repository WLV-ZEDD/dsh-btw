# dsh-btw-plugin

[![npm version](https://img.shields.io/npm/v/@wlv-zedd/dsh-btw-plugin.svg?style=flat&color=3b82f6)](https://www.npmjs.com/package/@wlv-zedd/dsh-btw-plugin)
[![dsh-market](https://img.shields.io/badge/dsh--market-available-c0392b?style=flat)](https://dshmarket.com/)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/WLV-ZEDD/dsh-btw/blob/main/LICENSE)

> **DeepSeek Harness Side-Assistant Dock**
> Ask quick side questions without interrupting or polluting the active agent loop.

<p align="center">
  <img src="https://raw.githubusercontent.com/WLV-ZEDD/dsh-btw/main/assets/promo-dshmarket-official.png" alt="dsh-btw on DSH Market" width="100%">
</p>

![dsh-btw Interactive Demo](https://raw.githubusercontent.com/WLV-ZEDD/dsh-btw/main/assets/demo.gif)

---

## Features

- **Instant Non-Blocking /btw Command:**
  Type /btw <question> in the chat bar. The input clears instantly (0ms) and executes in the background without disturbing the main agent run.
- **Docked Floating Banner Above Composer:**
  Appears right above the message input with real-time pulsating Thinking... animation, Markdown rendering, pagination (< 1/5 >), and collapse/expand toggle.
- **Pure ctx.llm & Zero-Config Auto-Inheritance:**
  Automatically uses the active session model from ctx.llm or falls back across configured providers in settings.yaml.
- **Isolated JSON Storage:**
  Persists session Q&A history in ~/.dsh/storages/btw-history.json without modifying or polluting other plugins.

---

## Installation

### Option 1: Via DSH Plugin Market (Recommended)
Install directly in the DSH Web UI via **Settings → Plugin Market** (search for `dsh-btw`), or run:

```bash
pnpm dsh plugin add @wlv-zedd/dsh-btw-plugin
```

### Option 2: Manual npm & Cordis Config
Install dsh-btw-plugin into your DeepSeek Harness environment:

```bash
pnpm add @wlv-zedd/dsh-btw-plugin
```

Enable the plugin in your `cordis.yml` (or via `cordis.patch.yml`):

```yaml
# cordis.yml
plugins:
  @wlv-zedd/dsh-btw-plugin:
    # Optional: specify a dedicated model, or omit to auto-inherit active session model
    # model: deepseek:deepseek-chat
```

---

## Usage

### In the Web Chat Interface
Type /btw followed by your question:

```text
/btw What is the port number of PostgreSQL?
/btw What is the difference between TCP and UDP?
```

- **Floating Banner:** The question immediately displays above the composer with Thinking... status. Once resolved, the rich Markdown answer smoothly appears.
- **Pagination (`< 1/5 >`):** Seamlessly cycle through previous side questions in the active session using `<` and `>`.
- **Action Controls:**
  - **Copy:** Copies the answer to clipboard.
  - **Delete:** Removes the question from session history.
  - **Collapse / Expand:** Toggles the answer view to keep your workspace tidy.
  - **Dismiss [X]:** Closes the floating banner.

---

## Support & Community Perks

- 💖 **Sponsor directly:** If you find this plugin helpful, consider sending a small tip via [PayPal](https://paypal.me/wlvzedd).
- 🎁 **Get Free AI Credits:** Sign up on AgentRouter using [this link](https://agentrouter.org/register?aff=bIJf) with your GitHub account to receive up to **$200 in free API credits** for your DeepSeek and LLM workflows.

---

## License

MIT © [WLV-ZEDD](https://github.com/WLV-ZEDD)
