# dsh-btw

> **DeepSeek Harness Side-Assistant Dock**
> Ask quick side questions without interrupting or polluting the active agent loop.

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

Install dsh-btw into your DeepSeek Harness environment:

```bash
pnpm add @wlv-zedd/dsh-btw
```

Enable the plugin in your cordis.yml (or via cordis.patch.yml):

```yaml
# cordis.yml
plugins:
  @wlv-zedd/dsh-btw:
    # Optional: specify a dedicated model, or omit to auto-inherit active session model
    # model: deepseek:deepseek-chat
```

---

## Usage

### In the Web Chat Interface
Type /btw followed by your question:

```text
/btw What is the port number of PostgreSQL?
/btw Sinong kalaban ni Superman na malakas din?
```

- **Floating Banner:** The question immediately displays above the composer with Thinking... status. Once resolved, the rich Markdown answer smoothly appears.
- **Pagination:** Navigate previous questions in the session using < and >.
- **Action Controls:**
  - **Copy:** Copies the answer to clipboard.
  - **Delete:** Removes the question from session history.
  - **Collapse / Expand:** Toggles the answer view to keep your workspace tidy.
  - **Dismiss [X]:** Closes the floating banner.

---

## License

MIT © [WLV-ZEDD](https://github.com/WLV-ZEDD)
