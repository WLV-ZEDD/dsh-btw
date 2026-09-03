window.__ModuleLoader__.load({
  id: "dsh-btw",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    const React = require("react");
    const { useState, useEffect, useRef } = React;

    const inject = ["slots", "layout"];

    // ── Icons ─────────────────────────────────────────────────────────────
    const IconQuestion = () => (
      React.createElement("svg", { width: 13, height: 13, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" },
        React.createElement("circle", { cx: 8, cy: 8, r: 7 }),
        React.createElement("path", { d: "M6 6.5C6 5.395 6.895 4.5 8 4.5C9.105 4.5 10 5.395 10 6.5C10 7.37 9.443 8.11 8.651 8.358C8.272 8.477 8 8.826 8 9.222V9.75" }),
        React.createElement("circle", { cx: 8, cy: 12, r: 0.75, fill: "currentColor" })
      )
    );

    const IconChevronLeft = () => (
      React.createElement("svg", { width: 14, height: 14, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" },
        React.createElement("path", { d: "M10 12L6 8L10 4" })
      )
    );

    const IconChevronRight = () => (
      React.createElement("svg", { width: 14, height: 14, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" },
        React.createElement("path", { d: "M6 4L10 8L6 12" })
      )
    );

    const IconChevronDown = () => (
      React.createElement("svg", { width: 14, height: 14, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" },
        React.createElement("path", { d: "M4 6L8 10L12 6" })
      )
    );

    const IconChevronUp = () => (
      React.createElement("svg", { width: 14, height: 14, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" },
        React.createElement("path", { d: "M4 10L8 6L12 10" })
      )
    );

    const IconClose = () => (
      React.createElement("svg", { width: 13, height: 13, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" },
        React.createElement("path", { d: "M4 4L12 12M12 4L4 12" })
      )
    );

    const IconCopy = () => (
      React.createElement("svg", { width: 13, height: 13, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" },
        React.createElement("rect", { x: 5.5, y: 5.5, width: 8, height: 8, rx: 1.5 }),
        React.createElement("path", { d: "M10.5 5.5V3a1.5 1.5 0 00-1.5-1.5H3A1.5 1.5 0 001.5 3v6A1.5 1.5 0 003 10.5h2.5" })
      )
    );

    const IconCheck = () => (
      React.createElement("svg", { width: 13, height: 13, viewBox: "0 0 16 16", fill: "none", stroke: "#22c55e", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" },
        React.createElement("path", { d: "M3.5 8.5l3 3 6-7" })
      )
    );

    const IconTrash = () => (
      React.createElement("svg", { width: 13, height: 13, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" },
        React.createElement("path", { d: "M2.5 4.5h11M5.5 4.5V3a1 1 0 011-1h3a1 1 0 011 1v1.5M6.5 7.5v5M9.5 7.5v5M3.5 4.5l.8 9.2a1 1 0 001 .8h5.4a1 1 0 001-.8l.8-9.2" })
      )
    );

    // ── Floating Docked Banner Component ───────────────────────────────────
    function BtwDockedBanner({ sessionId }) {
      const [items, setItems] = useState([]);
      const [currentIndex, setCurrentIndex] = useState(0);
      const [dismissedId, setDismissedId] = useState(null);
      const [copied, setCopied] = useState(false);
      const [collapsed, setCollapsed] = useState(false);
      const prevCountRef = useRef(0);

      const fetchFeed = () => {
        if (!sessionId) return;
        fetch(`/api/dsh-btw/feed?sessionId=${encodeURIComponent(sessionId)}`)
          .then(res => res.json())
          .then(data => {
            if (data.ok && Array.isArray(data.items)) {
              setItems(data.items);
              if (data.items.length > prevCountRef.current) {
                setDismissedId(null);
                setCurrentIndex(0);
                setCollapsed(false);
              }
              prevCountRef.current = data.items.length;
            }
          })
          .catch(() => {});
      };

      useEffect(() => {
        fetchFeed();
        const hasLoading = items.some(i => i.loading);
        const interval = setInterval(fetchFeed, hasLoading ? 500 : 2500);
        return () => clearInterval(interval);
      }, [sessionId, items]);

      if (!sessionId || items.length === 0) return null;
      const currentItem = items[currentIndex];
      if (!currentItem || currentItem.id === dismissedId) return null;

      const total = items.length;
      const hasOlder = currentIndex < total - 1;
      const hasNewer = currentIndex > 0;

      const handleCopy = (e) => {
        e.stopPropagation();
        if (currentItem.loading) return;
        navigator.clipboard.writeText(currentItem.answer).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      };

      const handleDelete = (e) => {
        e.stopPropagation();
        const idToDelete = currentItem.id;
        setItems(prev => prev.filter(i => i.id !== idToDelete));
        if (currentIndex >= items.length - 1 && currentIndex > 0) setCurrentIndex(i => i - 1);
        fetch('/api/dsh-btw/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, itemId: idToDelete })
        }).catch(() => {});
      };

      const formattedDate = new Date(currentItem.timestamp).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
      });

      return React.createElement("section", {
        style: {
          boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 8,
          margin: "0 auto 8px auto", width: "calc(100% - 48px)", maxWidth: "720px",
          padding: "8px 12px", background: "var(--dsw-specific-tip, #18181b)",
          border: "0.5px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.1))",
          borderRadius: 12, boxShadow: "0 4px 16px rgba(0, 0, 0, 0.25)"
        }
      },
        React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, minHeight: 24 } },
          React.createElement("button", {
            type: "button",
            onClick: () => setCollapsed(c => !c),
            style: { display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1, padding: 0, border: "none", background: "transparent", cursor: "pointer", color: "inherit", textAlign: "left" }
          },
            React.createElement("span", { style: { color: "#3b82f6", display: "inline-flex" } }, React.createElement(IconQuestion)),
            React.createElement("span", { style: { fontSize: 13, fontWeight: 600, color: "var(--dsw-alias-label-primary, #f4f4f5)" } }, "Side Question:"),
            React.createElement("span", { style: { fontSize: 13, color: "var(--dsw-alias-label-secondary, #a1a1aa)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 } }, currentItem.question),
            currentItem.loading
              ? React.createElement("span", { style: { fontSize: 11, fontWeight: 600, color: "#3b82f6", background: "rgba(59, 130, 246, 0.15)", padding: "1px 6px", borderRadius: 4 } }, "Thinking...")
              : React.createElement("span", { style: { fontSize: 11, color: "var(--dsw-alias-label-tertiary, #71717a)", background: "rgba(255, 255, 255, 0.06)", padding: "1px 6px", borderRadius: 4 } }, formattedDate)
          ),
          React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 4 } },
            React.createElement("div", { style: { display: "inline-flex", alignItems: "center", gap: 2, marginRight: 4, fontSize: 11, color: "#71717a" } },
              React.createElement("button", { type: "button", disabled: !hasOlder, onClick: () => hasOlder && setCurrentIndex(i => i + 1), style: { border: "none", background: "transparent", cursor: hasOlder ? "pointer" : "default", color: "inherit", opacity: hasOlder ? 1 : 0.3 } }, React.createElement(IconChevronLeft)),
              React.createElement("span", { style: { fontVariantNumeric: "tabular-nums" } }, `${total - currentIndex}/${total}`),
              React.createElement("button", { type: "button", disabled: !hasNewer, onClick: () => hasNewer && setCurrentIndex(i => i - 1), style: { border: "none", background: "transparent", cursor: hasNewer ? "pointer" : "default", color: "inherit", opacity: hasNewer ? 1 : 0.3 } }, React.createElement(IconChevronRight))
            ),
            React.createElement("button", { type: "button", onClick: handleCopy, disabled: currentItem.loading, title: copied ? "Copied!" : "Copy answer", style: { border: "none", background: "transparent", cursor: "pointer", color: "#a1a1aa", padding: 4 } }, copied ? React.createElement(IconCheck) : React.createElement(IconCopy)),
            React.createElement("button", { type: "button", onClick: handleDelete, title: "Delete question", style: { border: "none", background: "transparent", cursor: "pointer", color: "#a1a1aa", padding: 4 } }, React.createElement(IconTrash)),
            React.createElement("button", { type: "button", onClick: () => setCollapsed(c => !c), title: collapsed ? "Expand" : "Collapse", style: { border: "none", background: "transparent", cursor: "pointer", color: "#a1a1aa", padding: 4 } }, collapsed ? React.createElement(IconChevronDown) : React.createElement(IconChevronUp)),
            React.createElement("button", { type: "button", onClick: (e) => { e.stopPropagation(); setDismissedId(currentItem.id); }, title: "Close banner", style: { border: "none", background: "transparent", cursor: "pointer", color: "#a1a1aa", padding: 4 } }, React.createElement(IconClose))
          )
        ),
        !collapsed && React.createElement("div", {
          style: { fontSize: 13, lineHeight: "20px", color: "var(--dsw-alias-label-primary, #e4e4e7)", wordBreak: "break-word", paddingTop: 6, borderTop: "0.5px solid rgba(255, 255, 255, 0.08)" }
        }, currentItem.loading
          ? React.createElement("div", { style: { fontStyle: "italic", color: "#a1a1aa" } }, "Thinking on the side...")
          : React.createElement("div", { style: { whiteSpace: "pre-wrap" } }, currentItem.answer)
        )
      );
    }

    // ── Cordis Slot Registration ──────────────────────────────────────────
    function apply(ctx) {
      // 1. Injects floating banner above message composer
      ctx.slots.inject("conversation.input.dock", () =>
        ctx.slots.register({
          name: "conversation.input.dock",
          id: "dsh-btw-banner",
          order: 15,
          inject: (sessionId) => ({ sessionId })
        }, BtwDockedBanner)
      );

      // 2. Suppress /btw command row in chat transcript
      ctx.slots.inject("conversation.chat.commandview", () =>
        ctx.slots.register({
          name: "conversation.chat.commandview",
          key: "btw"
        }, () => null)
      );
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
