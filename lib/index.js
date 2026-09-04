import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import z from "@deepseek-ai/schemastery";

export const name = "@wlv-zedd/dsh-btw-plugin";
export const reusable = true;
export const inject = ["commands", "llm"];

export const Config = z.object({
	model: z.string().description("Explicit LLM model name to use for side questions (e.g. 'deepseek:deepseek-chat'). If omitted, auto-inherits the active session model."),
	maxItemsPerSession: z.number().default(50).description("Maximum number of side-question records to keep per session.")
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

async function readJsonBody(req) {
	return new Promise((resolve) => {
		let data = "";
		req.on("data", (chunk) => {
			data += chunk;
		});
		req.on("end", () => {
			try {
				resolve(JSON.parse(data || "{}"));
			} catch {
				resolve({});
			}
		});
		req.on("error", () => resolve({}));
	});
}

function sendJson(res, statusCode, body) {
	res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
	res.end(JSON.stringify(body));
}

function getFallbackModelConfig() {
	try {
		const settingsPath = path.join(os.homedir(), ".dsh", "settings.yaml");
		if (fs.existsSync(settingsPath)) {
			const yaml = fs.readFileSync(settingsPath, "utf8");
			const provMatch = yaml.match(/agent-default-model:\s*[\r\n]+\s*provider:\s*([^\s\r\n]+)/);
			const modelMatch = yaml.match(/agent-default-model:[\s\S]*?model:\s*([^\s\r\n]+)/);
			if (provMatch && modelMatch) {
				return { provider: provMatch[1], model: modelMatch[1] };
			}
		}
	} catch {}
	return { provider: "deepseek", model: "deepseek-chat" };
}

async function generateFastAnswer(ctx, agent, sessionId, question, wsName, configModel) {
	if (!ctx.llm) {
		throw new Error("LLM service is not mounted.");
	}

	const now = new Date();
	const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Manila";
	const timeStr = now.toLocaleString("en-US", {
		timeZone: tz,
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
		second: "2-digit"
	});

	const systemPromptText = `You are DSH BTW, the dedicated fast side-assistant for DeepSeek Harness.
Live Environment:
- Current Time: ${timeStr} (${tz})
- Active Workspace: ${wsName || "default"}

Instructions:
Answer the user's side question directly, accurately, and concisely in 1-3 sentences.
Format your response in clean Markdown (use **bold** for key names, bullet points for lists, and code blocks for code snippets).
Answer in the same language as the question (e.g. Tagalog, English).
Do NOT include conversational filler, greetings, or explanations of what /btw is.`;

	const candidateConfigs = [];

	if (configModel) {
		const parts = configModel.split(":");
		if (parts.length === 2) candidateConfigs.push({ provider: parts[0], model: parts[1] });
		else candidateConfigs.push({ provider: "deepseek", model: configModel });
	}

	const sessionConfig = agent?.session?.requestHeader?.()?.config;
	if (sessionConfig && sessionConfig.provider && sessionConfig.model) {
		candidateConfigs.push(sessionConfig);
	}

	const fallbackConfig = getFallbackModelConfig();
	if (fallbackConfig && fallbackConfig.provider) {
		if (!candidateConfigs.some(c => c.provider === fallbackConfig.provider && c.model === fallbackConfig.model)) {
			candidateConfigs.push(fallbackConfig);
		}
	}

	candidateConfigs.push({ provider: "vyce-ai", model: "deepseek-v4-flash" });
	candidateConfigs.push({ provider: "tabi-token", model: "claude-opus-5" });
	candidateConfigs.push({ provider: "seek-ai", model: "deepseek-v4-flash" });
	candidateConfigs.push({ provider: "deepseek", model: "deepseek-chat" });

	let lastError = null;

	for (const callConfig of candidateConfigs) {
		try {
			const prepared = await ctx.llm.prepareCall(callConfig);
			const options = {
				...prepared.config,
				system: systemPromptText,
				messages: [
					{
						id: "msg-" + Date.now().toString(36) + Math.random().toString(36).slice(-4),
						role: "user",
						content: [{ type: "text", text: question }],
						source: { kind: "user" }
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

	// 2. HTTP Endpoints via WebServer when mounted
	ctx.inject(["webServer"], (webCtx) => {
		webCtx.effect(() => {
			const unregisterFeed = webCtx.webServer.register({
				kind: "exact",
				path: "/api/dsh-btw/feed",
				handler: async (req, res) => {
					const url = new URL(req.url || "", "http://127.0.0.1");
					const sid = url.searchParams.get("sessionId");
					if (!sid) {
						sendJson(res, 400, { ok: false, error: "Missing sessionId" });
						return;
					}
					const history = loadHistory();
					sendJson(res, 200, { ok: true, items: history[sid] || [] });
				}
			});

			const unregisterAsk = webCtx.webServer.register({
				kind: "exact",
				path: "/api/dsh-btw/ask",
				handler: async (req, res) => {
					if (req.method !== "POST") {
						sendJson(res, 405, { ok: false, error: "Method not allowed" });
						return;
					}
					const body = await readJsonBody(req);
					const { sessionId, question, cwd } = body;
					if (!sessionId || !question) {
						sendJson(res, 400, { ok: false, error: "Missing sessionId or question" });
						return;
					}
					const wsName = cwd ? path.basename(cwd) : "default";
					void handleSideQuery(ctx, null, sessionId, question.trim(), wsName, config?.model, maxItems);
					sendJson(res, 200, { ok: true });
				}
			});

			const unregisterDelete = webCtx.webServer.register({
				kind: "exact",
				path: "/api/dsh-btw/delete",
				handler: async (req, res) => {
					if (req.method !== "POST") {
						sendJson(res, 405, { ok: false, error: "Method not allowed" });
						return;
					}
					const body = await readJsonBody(req);
					const { sessionId, itemId } = body;
					if (!sessionId || !itemId) {
						sendJson(res, 400, { ok: false, error: "Missing sessionId or itemId" });
						return;
					}
					const history = loadHistory();
					if (history[sessionId]) {
						history[sessionId] = history[sessionId].filter((i) => i.id !== itemId);
						saveHistory(history);
					}
					sendJson(res, 200, { ok: true });
				}
			});

			return () => {
				unregisterFeed();
				unregisterAsk();
				unregisterDelete();
			};
		});
	});
}
