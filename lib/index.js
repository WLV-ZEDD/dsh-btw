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
			const sectionMatch = yaml.match(/agent-default-model:\s*[\r\n]+((?:[ \t]+[^\r\n]+[\r\n]+)*)/);
			if (sectionMatch && sectionMatch[1]) {
				const section = sectionMatch[1];
				const prov = section.match(/provider:\s*([^\s\r\n]+)/)?.[1];
				const mod = section.match(/model:\s*([^\s\r\n]+)/)?.[1];
				if (prov && mod) return { provider: prov, model: mod };
			}
		}
	} catch {}
	return null;
}

function resolveSessionObject(ctx, sessionOrAgent, sessionId) {
	if (sessionOrAgent?.session) {
		return sessionOrAgent.session;
	}
	if (sessionOrAgent && typeof sessionOrAgent.deriveMessages === "function") {
		return sessionOrAgent;
	}
	if (sessionId && ctx.sessions && typeof ctx.sessions.get === "function") {
		try {
			return ctx.sessions.get(sessionId);
		} catch {}
	}
	return null;
}

function resolveModelConfig(ctx, session, configModel) {
	if (configModel) {
		const parts = configModel.split(":");
		if (parts.length === 2) return { provider: parts[0], model: parts[1] };
		return { provider: "deepseek", model: configModel };
	}

	if (session) {
		// 1. Sync with UI model picker: check latest model/selection projection
		try {
			const projected = ctx.sessionProjections?.stateOf?.(session, "modelSelection");
			if (projected?.provider && projected?.model) {
				return { provider: projected.provider, model: projected.model };
			}
		} catch {}

		// 2. Sync with UI model picker: inspect model/selection events from session log
		try {
			const events = typeof session.snapshotEvents === "function"
				? session.snapshotEvents()
				: typeof session.ownEvents === "function"
					? session.ownEvents()
					: null;
			if (Array.isArray(events)) {
				for (let i = events.length - 1; i >= 0; i--) {
					const ev = events[i];
					if (ev.type === "model/selection" && ev.data?.provider && ev.data?.model) {
						return { provider: ev.data.provider, model: ev.data.model };
					}
				}
			}
		} catch {}

		// 3. Fallback to active request header from previous turns
		const sessionConfig = session.requestHeader?.()?.config;
		if (sessionConfig && sessionConfig.provider && sessionConfig.model) {
			return { provider: sessionConfig.provider, model: sessionConfig.model };
		}
	}

	// 4. Fallback to default model from settings.yaml
	const fallback = getFallbackModelConfig();
	if (fallback && fallback.provider && fallback.model) {
		return fallback;
	}

	throw new Error("No active session model or configured model found. Please specify 'model' in config or run inside an active session.");
}

function extractSessionContext(session) {
	if (!session) return { title: "", workspace: "", recentHistory: "" };

	const title = session.header?.title || session.title || "";
	const cwd = session.header?.cwd || session.cwd || "";
	const workspace = cwd ? path.basename(cwd) : "";

	let recentHistory = "";
	try {
		if (typeof session.deriveMessages === "function") {
			const messages = session.deriveMessages();
			if (Array.isArray(messages) && messages.length > 0) {
				const recent = messages.slice(-8);
				const formatted = [];

				for (const msg of recent) {
					const role = msg.role === "assistant" ? "Assistant (Main Agent)" : msg.role === "user" ? "User" : "System/Tool";
					const parts = [];

					if (Array.isArray(msg.content)) {
						for (const block of msg.content) {
							if (block.type === "text" && block.text) {
								const textSnippet = block.text.trim();
								if (textSnippet) {
									parts.push(textSnippet.length > 300 ? textSnippet.slice(0, 300) + "..." : textSnippet);
								}
							} else if (block.type === "tool-call" || block.type === "tool_use") {
								const toolName = block.name || "tool";
								const args = typeof block.arguments === "string" ? block.arguments : JSON.stringify(block.arguments || block.input || {});
								const argsSnippet = args.length > 150 ? args.slice(0, 150) + "..." : args;
								parts.push(`[Tool Call: ${toolName}(${argsSnippet})]`);
							} else if (block.type === "tool-result" || block.type === "tool_result") {
								let resText = "";
								if (Array.isArray(block.content)) {
									resText = block.content.map(c => c.text || (typeof c === "string" ? c : JSON.stringify(c))).join(" ");
								} else if (typeof block.output === "string") {
									resText = block.output;
								} else if (block.output) {
									resText = JSON.stringify(block.output);
								}
								const resSnippet = resText.trim();
								parts.push(`[Tool Result: ${resSnippet.length > 200 ? resSnippet.slice(0, 200) + "..." : resSnippet || "done"}]`);
							}
						}
					} else if (typeof msg.content === "string") {
						const textSnippet = msg.content.trim();
						parts.push(textSnippet.length > 300 ? textSnippet.slice(0, 300) + "..." : textSnippet);
					}

					if (parts.length > 0) {
						formatted.push(`- ${role}: ${parts.join(" ")}`);
					}
				}

				if (formatted.length > 0) {
					recentHistory = formatted.join("\n");
				}
			}
		}
	} catch (err) {
		console.warn("[dsh-btw] Failed to derive session messages:", err?.message);
	}

	return { title, workspace, recentHistory };
}

async function generateFastAnswer(ctx, sessionOrAgent, sessionId, question, wsName, configModel) {
	if (!ctx.llm) {
		throw new Error("LLM service is not mounted.");
	}

	const session = resolveSessionObject(ctx, sessionOrAgent, sessionId);
	const targetConfig = resolveModelConfig(ctx, session, configModel);
	const sessionCtx = extractSessionContext(session);

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

	let systemPromptText = `You are DSH BTW, the dedicated fast side-assistant for DeepSeek Harness.
Live Environment:
- Current Time: ${timeStr} (${tz})
- Active Workspace: ${sessionCtx.workspace || wsName || "default"}`;

	if (sessionCtx.title) {
		systemPromptText += `\n- Session Title: ${sessionCtx.title}`;
	}

	if (sessionCtx.recentHistory) {
		systemPromptText += `\n\nRecent Active Session History & Agent Loop Context:\n${sessionCtx.recentHistory}`;
	}

	systemPromptText += `\n\nInstructions:
Answer the user's side question directly, accurately, and concisely in 1-3 sentences.
You have full visibility of what the user and main agent are doing above. If the user asks what you/they are doing, what step was just performed, or context about the current session, answer accurately based on the session history above.
Format your response in clean Markdown (use **bold** for key names, bullet points for lists, and code blocks for code snippets).
Answer in the same language as the question (e.g. Tagalog, English).
Do NOT include conversational filler, greetings, or explanations of what /btw is.`;

	const prepared = await ctx.llm.prepareCall(targetConfig);
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
		throw new Error(finishError);
	}

	const trimmed = (answer || reasoning).trim();
	if (trimmed) return trimmed;
	throw new Error("Model returned empty response.");
}

async function handleSideQuery(ctx, sessionOrAgent, sessionId, question, wsName, configModel, maxItems) {
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
		const answer = await generateFastAnswer(ctx, sessionOrAgent, sessionId, question, wsName, configModel);
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
