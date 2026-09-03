# dsh-btw

> **DeepSeek Harness Side-Assistant Dock & Drawer**  
> Ask quick side questions without interrupting or polluting the active agent loop.

---

## Features

- **Instant Non-Blocking /btw Command:**
  Type /btw <question> in the chat bar. The input clears instantly (0ms) and executes in the background without disturbing the main agent run.
- **Docked Floating Banner Above Composer:**
  Appears right above the message input with real-time pulsating Thinking... animation, Markdown rendering, pagination (< 1/5 >), and collapse/expand toggle.
- **Right Drawer By The Way Feed:**
  Full searchable history feed with rich Markdown, **Show more / Show less** toggling for long answers, one-click **Copy answer**, and **Save to Notes**.
- **Pure ctx.llm & Zero-Config Auto-Inheritance:**
  Automatically uses the active session model from ctx.llm or falls back across configured providers in settings.yaml.
- **Isolated JSON Storage:**
  Persists session Q&A history in ~/.dsh/storages/btw-history.json without modifying or polluting other plugins.

---

## Installation

Install dsh-btw into your DeepSeek Harness environment:

`ash
pnpm add dsh-btw
`

Enable the plugin in your cordis.yml (or via cordis.patch.yml):

`yaml
# cordis.yml
plugins:
  dsh-btw:
    # Optional: specify a dedicated model, or omit to auto-inherit active session model
    # model: deepseek:deepseek-chat
`

---

## Usage

### 1. In the Web Chat Interface
Type /btw followed by your question:
`	ext
/btw What is the port number of PostgreSQL?
/btw Sinong kalaban ni Superman na malakas din?
`

- **Floating Banner:** The question immediately displays above the composer with Thinking... status. Once resolved, the rich Markdown answer smoothly appears.
- **Pagination:** Navigate previous questions in the session using < and >.
- **Action Controls:**
  - **Copy:** Copies the answer to clipboard.
  - **Save as Note:** Promotes the answer directly to the session notes drawer.
  - **Delete:** Removes the question from history.
  - **Dismiss:** Closes the floating banner.

### 2. In the Right Drawer (By The Way Tab)
Click the **By The Way** tab in the details panel to view all session side-questions, search through history, and ask new side questions directly.

---

## License

MIT © [WLV-ZEDD](https://github.com/WLV-ZEDD)
