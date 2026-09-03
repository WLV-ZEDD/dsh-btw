import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { Schema } from "@deepseek-ai/cordis";

export const name = "@wlv-zedd/dsh-btw";
export const reusable = true;
export const inject = ["commands", "server", "llm"];

export const Config = Schema.object({
	model: Schema.string().description("Explicit LLM model name to use for side questions (e.g. 'deepseek:deepseek-chat'). If omitted, auto-inherits the active session model."),
	maxItemsPerSession: Schema.number().default(50).description("Maximum number of side-question records to keep per session.")
});

const STORAGE_FILE = path.join(os.homedir(), ".dsh", "storages", "btw-history.json");

function loadHistory() {
	try {
		if (fs.existsSync(STORAGE_FILE)) {
			const raw = fs.readFileSync(STORAGE_FILE, "utf-8");
			return JSON.parse(raw);
		}
	} catch {}
	return {};
}

function saveHistory(history) {
	try {
		const dir = path.dirname(STORAGE_FILE);
		if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
		fs.writeFileSync(STORAGE_FILE, JSON.stringify(history, null, 2), "utf-8");
	} catch (err) {
		console.error("[dsh-btw] Failed to save history:", err);
	}
}

async function generateFastAnswer(ctx, agent, sessionId, question, wsName, configModel) {
	const headerConfig = agent?.session?.requestHeader?.()?.config;
	const candidateModels = [];

	if (configModel) candidateModels.push(configModel);
	if (headerConfig?.model) candidateModels.push(headerConfig.model);

	// Provider candidates from ~/.dsh/settings.yaml if available
	try {
		const settingsPath = path.join(os.homedir(), ".dsh", "settings.yaml");
		if (fs.existsSync(settingsPath)) {
			const text = fs.readFileSync(settingsPath, "utf-8");
			for (const line of text.split("\n")) {
				const match = line.match(/^(\s*)([a-zA-Z0-9_-]+):\s*$/);
				if (match && !["models", "providers", "profiles", "settings"].includes(match[2])) {
					candidateModels.push(match[2]);
				}
			}
		}
	} catch {}

	candidateModels.push("deepseek-chat", "deepseek-reasoner", "default");
	const uniqueCandidates = Array.from(new Set(candidateModels.filter(Boolean)));

	let lastError = null;
	for (const modelCandidate of uniqueCandidates) {
		try {
			const prepared = ctx.llm.prepare(modelCandidate);
			const options = {
				messages: [
					{
						role: "system",
						content: `You are DSH BTW (DeepSeek Harness Side-Assistant).
The user is working in workspace [${wsName || "default"}].
Answer the following quick side question directly, accurately, and concisely.
Format your answer with clean Markdown (bolding, lists, code fences). Do not include unnecessary conversational preamble.`
					},
					{
						role: "user",
						content: question
					}
				],
				signal: AbortSignal.timeout(20000)
			};

			const stream = prepared.stream(options);
			let answer = "";
			let reasoning = "";
			let finishError = null;

			for await (const chunk of stream) {
				if (chunk.type === "text-delta" && typeof chunk.text === "string") {
					answer += chunk.text;
				} else if (chunk.type === "reasoning-delta" && typeof chunk.text === "string") {
					reasoning += chunk.text;
				} else if (chunk.type === "block-end" && chunk.block?.type === "text" && !answer) {
					answer = chunk.block.text || "";
				} else if (chunk.type === "finish") {
					if (chunk.reason?.kind === "error" || chunk.reason?.kind === "aborted") {
						finishError = chunk.reason.failure?.message || `Generation finished with ${chunk.reason.kind}`;
					}
				}
			}

			if (finishError) {
				lastError = new Error(finishError);
				continue;
			}

			const trimmed = (answer || reasoning).trim();
			if (trimmed) return trimmed;
		} catch (err) {
			lastError = err;
		}
	}

	throw lastError || new Error("Model returned empty response.");
}

async function handleSideQuery(ctx, agent, sessionId, question, wsName, configModel, maxItems) {
	const history = loadHistory();
	if (!history[sessionId]) history[sessionId] = [];

	const itemId = "btw-" + Date.now().toString(36) + Math.random().toString(36).slice(-4);
	const pendingItem = {
		id: itemId,
		question,
		answer: "",
		loading: true,
		source: "DSH BTW",
		timestamp: Date.now()
	};

	history[sessionId].unshift(pendingItem);
	if (history[sessionId].length > maxItems) {
		history[sessionId] = history[sessionId].slice(0, maxItems);
	}
	saveHistory(history);

	try {
		const answer = await generateFastAnswer(ctx, agent, sessionId, question, wsName, configModel);
		pendingItem.answer = answer;
		pendingItem.loading = false;
		saveHistory(history);
		return { answer, item: pendingItem };
	} catch (err) {
		const errorMsg = `Unable to resolve side question (${err?.message || "LLM error"}).`;
		pendingItem.answer = errorMsg;
		pendingItem.loading = false;
		saveHistory(history);
		return { answer: errorMsg, item: pendingItem };
	}
}

export function apply(ctx, config) {
	const maxItems = config?.maxItemsPerSession || 50;

	// 1. Register /btw slash command
	ctx.effect(() => {
		return ctx.commands.register({
			name: "btw",
			description: "Ask a quick side question without interrupting the active agent loop (/btw <question>)",
			input: { hint: "<question to ask on the side>" },
			handler: async (invocation) => {
				const question = (invocation.rawInput || "").trim();
				if (!question) return { kind: "error", text: "Usage: /btw <question to ask on the side>" };
				const agent = invocation.agent;
				const sessionId = agent?.session?.header?.id || agent?.id;
				const cwd = agent?.session?.header?.cwd || "";
				const wsName = cwd ? path.basename(cwd) : "default";

				// Launch query asynchronously so composer input clears instantly on Enter!
				void handleSideQuery(ctx, agent, sessionId, question, wsName, config?.model, maxItems);
				return {
					kind: "success",
					text: ""
				};
			}
		});
	});

	// 2. HTTP Endpoints
	ctx.effect(() => {
		// GET /api/dsh-btw/feed?sessionId=...
		ctx.server.get("/api/dsh-btw/feed", async (koaCtx) => {
			const sid = koaCtx.query.sessionId;
			if (!sid) {
				koaCtx.status = 400;
				koaCtx.body = { ok: false, error: "Missing sessionId" };
				return;
			}
			const history = loadHistory();
			koaCtx.body = { ok: true, items: history[sid] || [] };
		});

		// POST /api/dsh-btw/ask
		ctx.server.post("/api/dsh-btw/ask", async (koaCtx) => {
			const { sessionId, question, cwd } = koaCtx.request.body || {};
			if (!sessionId || !question) {
				koaCtx.status = 400;
				koaCtx.body = { ok: false, error: "Missing sessionId or question" };
				return;
			}
			const wsName = cwd ? path.basename(cwd) : "default";
			void handleSideQuery(ctx, null, sessionId, question.trim(), wsName, config?.model, maxItems);
			koaCtx.body = { ok: true };
		});

		// POST /api/dsh-btw/delete
		ctx.server.post("/api/dsh-btw/delete", async (koaCtx) => {
			const { sessionId, itemId } = koaCtx.request.body || {};
			if (!sessionId || !itemId) {
				koaCtx.status = 400;
				koaCtx.body = { ok: false, error: "Missing sessionId or itemId" };
				return;
			}
			const history = loadHistory();
			if (history[sessionId]) {
				history[sessionId] = history[sessionId].filter(i => i.id !== itemId);
				saveHistory(history);
			}
			koaCtx.body = { ok: true };
		});
	});
}
