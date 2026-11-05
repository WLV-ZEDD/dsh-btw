import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientJsPath = path.resolve(__dirname, "../lib/client.js");

test("Issue #2: Answer container enforces bounded vertical scrolling", () => {
  assert.ok(fs.existsSync(clientJsPath), "lib/client.js must exist");
  const code = fs.readFileSync(clientJsPath, "utf8");

  // Verify that the answer container sets maxHeight and overflowY: auto
  assert.match(
    code,
    /maxHeight:\s*["']min\(380px,\s*45vh\)["']/,
    "Answer container must have a bounded maxHeight (e.g. min(380px, 45vh))"
  );
  assert.match(
    code,
    /overflowY:\s*["']auto["']/,
    "Answer container must enable vertical scrolling (overflowY: 'auto')"
  );
  assert.match(
    code,
    /overscrollBehavior:\s*["']contain["']/,
    "Answer container should contain overscroll to prevent parent scrolling"
  );

  // Verify that bare overflow: "hidden" without height bounds is not present on answer body
  const hasUnboundedHidden = /borderTop:\s*["']0\.5px solid rgba\(255, 255, 255, 0\.08\)["'],\s*overflow:\s*["']hidden["']/m.test(code);
  assert.equal(
    hasUnboundedHidden,
    false,
    "Answer container must not have bare unbounded overflow: 'hidden'"
  );
});

test("Issue #3: Feed polling effect is decoupled from items identity", () => {
  assert.ok(fs.existsSync(clientJsPath), "lib/client.js must exist");
  const code = fs.readFileSync(clientJsPath, "utf8");

  // Verify itemsRef is declared and synchronized with items
  assert.match(
    code,
    /const\s+itemsRef\s*=\s*useRef\(items\)/,
    "itemsRef must be initialized with items"
  );
  assert.match(
    code,
    /itemsRef\.current\s*=\s*items/,
    "itemsRef.current must synchronize with items"
  );

  // Verify feed polling useEffect dependency array is strictly [sessionId]
  const effectWithItems = /useEffect\s*\(\s*\(\)\s*=>\s*\{[\s\S]*?fetchFeed[\s\S]*?\},\s*\[sessionId,\s*items\]\)/m.test(code);
  assert.equal(
    effectWithItems,
    false,
    "Polling useEffect must NOT include items in its dependency array"
  );

  assert.match(
    code,
    /useEffect\s*\(\s*\(\)\s*=>\s*\{[\s\S]*?\},\s*\[sessionId\]\)/,
    "Polling useEffect must depend only on [sessionId]"
  );
});

test("Issue #3: Feed polling uses recursive timeout without synchronous self-triggering", () => {
  assert.ok(fs.existsSync(clientJsPath), "lib/client.js must exist");
  const code = fs.readFileSync(clientJsPath, "utf8");

  // Verify that active polling cadence checks loading state (500ms vs 2500ms)
  assert.match(
    code,
    /itemsRef\.current\.some\(i\s*=>\s*i\.loading\)\s*\?\s*500\s*:\s*2500/,
    "Polling interval should be 500ms when an item is loading and 2500ms when idle"
  );

  // Verify that setTimeout is used for sequential non-overlapping polling
  assert.match(
    code,
    /setTimeout\s*\(\s*poll,\s*(?:hasLoading|loadingDelay)/,
    "Next poll must be scheduled via setTimeout after response resolution"
  );
});
