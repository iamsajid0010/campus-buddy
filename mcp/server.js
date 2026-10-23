"use strict";
// Campus Buddy as a self-hosted MCP server.
//   - Transport: Streamable HTTP, endpoint POST /mcp (stateless)
//   - Spec: MCP 2025-11-25 (the SDK negotiates down for older clients)
//   - The tools wrap the SAME engine.js + data.js the web app uses, so the
//     browser demo and any MCP client (an agent, Alexa+ style integration, an
//     inspector) answer from one source of truth. English and Bangla.
//
// Run:  cd mcp && npm install && npm start      (http://127.0.0.1:3333/mcp)
// Tip:  TZ=Asia/Dhaka npm start   so "today" and "next class" use campus time.

const http = require("node:http");
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const { z } = require("zod");
const data = require("../data.js");
const { createEngine } = require("../engine.js");

const engine = createEngine(data);

// ---------- shared schema pieces ----------
const language = z.enum(["en", "bn"]).optional()
  .describe("Reply language: 'en' (English, default) or 'bn' (Bangla).");
const nowArg = z.string().optional()
  .describe("Optional ISO date-time to use instead of the current time (handy for testing), e.g. 2026-10-25T08:00");
const outputShape = {
  say: z.string().describe("The assistant's answer as one sentence."),
  items: z.array(z.string()).describe("Detail lines (list entries, teacher, warnings)."),
  language: z.enum(["en", "bn"])
};
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const READ_ONLY = { readOnlyHint: true, idempotentHint: true, destructiveHint: false, openWorldHint: false };

function parseNow(s) {
  if (!s) return undefined;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid 'now' date-time: " + s);
  return d;
}
const toText = (r) => [r.say].concat(r.items.map((i) => "- " + i)).join("\n");
function toResult(r) {
  return {
    content: [{ type: "text", text: toText(r) }],
    structuredContent: { say: r.say, items: r.items, language: r.lang }
  };
}
// Run a natural-language question through the engine and wrap it as a tool result.
const run = (question, lang, now) => toResult(engine.answer(question, parseNow(now), lang || "en"));

// ---------- the tools ----------
function buildServer() {
  const server = new McpServer({ name: "campus-buddy", version: "1.0.0" }, {
    instructions:
      "Campus Buddy answers a university student's questions about their class routine, assignments, exams " +
      "and campus events (seminars, workshops, contests, hackathons), including clash warnings when an event " +
      "overlaps a class. Prefer the specific tools; use ask_campus_buddy for free-form questions. " +
      "All tools are read-only. Pass language 'bn' for Bangla replies."
  });

  server.registerTool("ask_campus_buddy", {
    title: "Ask Campus Buddy",
    description: "Answer any free-form schedule question in English or Bangla, e.g. 'When is my next class?' or 'আমার পরের পরীক্ষা কবে?'. Language is auto-detected from the question unless 'language' is given.",
    inputSchema: { question: z.string().min(1).describe("The student's question."), language: language, now: nowArg },
    outputSchema: outputShape,
    annotations: { title: "Ask Campus Buddy", ...READ_ONLY }
  }, async ({ question, language, now }) => toResult(engine.answer(question, parseNow(now), language)));

  server.registerTool("next_class", {
    title: "Next class",
    description: "The student's next upcoming class (or the one in progress plus the one after), with time, room and teacher.",
    inputSchema: { language: language, now: nowArg },
    outputSchema: outputShape,
    annotations: { title: "Next class", ...READ_ONLY }
  }, async ({ language, now }) => run("next class", language, now));

  server.registerTool("classes_on_day", {
    title: "Classes on a day",
    description: "All classes on a given day, with times and rooms.",
    inputSchema: { day: z.enum(["today", "tomorrow"].concat(WEEKDAYS)).describe("'today', 'tomorrow' or a weekday name."), language: language, now: nowArg },
    outputSchema: outputShape,
    annotations: { title: "Classes on a day", ...READ_ONLY }
  }, async ({ day, language, now }) => run("classes " + day, language, now));

  server.registerTool("assignments_due", {
    title: "Assignments due",
    description: "Upcoming assignments. With no arguments: due in the next 7 days. Optionally filter by course (name, code or alias like 'OOP') and/or by day.",
    inputSchema: {
      course: z.string().optional().describe("Course name, code or alias, e.g. 'OOP' or 'CSE215'."),
      day: z.enum(["today", "tomorrow"].concat(WEEKDAYS)).optional().describe("Only assignments due on this day."),
      language: language, now: nowArg
    },
    outputSchema: outputShape,
    annotations: { title: "Assignments due", ...READ_ONLY }
  }, async ({ course, day, language, now }) => run("assignments due " + (day || "") + " " + (course || ""), language, now));

  server.registerTool("next_exam", {
    title: "Next exam",
    description: "The next upcoming exam or quiz (optionally for one course), plus the ones after it.",
    inputSchema: { course: z.string().optional().describe("Course name, code or alias."), language: language, now: nowArg },
    outputSchema: outputShape,
    annotations: { title: "Next exam", ...READ_ONLY }
  }, async ({ course, language, now }) => run("next exam " + (course || ""), language, now));

  server.registerTool("upcoming_events", {
    title: "Upcoming campus events",
    description: "Campus events (seminars, workshops, contests, hackathons, fests), each flagged if it clashes with a class. Optionally filter by type and time window.",
    inputSchema: {
      type: z.enum(["seminar", "workshop", "contest", "hackathon", "fest"]).optional().describe("Only this kind of event."),
      when: z.enum(["today", "tomorrow", "this week", "next week", "this month"]).optional().describe("Time window."),
      language: language, now: nowArg
    },
    outputSchema: outputShape,
    annotations: { title: "Upcoming campus events", ...READ_ONLY }
  }, async ({ type, when, language, now }) => run("upcoming " + (type ? type + "s" : "events") + " " + (when || ""), language, now));

  server.registerTool("course_info", {
    title: "Course info",
    description: "Who teaches a course, or where and when it meets.",
    inputSchema: {
      course: z.string().min(1).describe("Course name, code or alias, e.g. 'Electronic Devices and Circuits' or 'EDC lab'."),
      detail: z.enum(["teacher", "schedule"]).describe("'teacher' for the instructor, 'schedule' for days, times and rooms."),
      language: language, now: nowArg
    },
    outputSchema: outputShape,
    annotations: { title: "Course info", ...READ_ONLY }
  }, async ({ course, detail, language, now }) =>
    run(detail === "teacher" ? "who is the instructor for " + course : "where is " + course, language, now));

  server.registerTool("check_event_clash", {
    title: "Check event clash",
    description: "Check whether a campus event overlaps any of the student's classes. Returns the event and the list of clashing classes.",
    inputSchema: { event: z.string().min(1).describe("Event title or a name people use for it, e.g. 'Tech Talk' or 'hackathon'."), language: language, now: nowArg },
    outputSchema: {
      hasClash: z.boolean(),
      event: z.object({ title: z.string(), type: z.string(), when: z.string(), end: z.string().nullable(), venue: z.string() }),
      clashes: z.array(z.object({ code: z.string(), name: z.string(), day: z.string(), start: z.string(), end: z.string(), room: z.string() })),
      say: z.string(), items: z.array(z.string()), language: z.enum(["en", "bn"])
    },
    annotations: { title: "Check event clash", ...READ_ONLY }
  }, async ({ event, language, now }) => {
    const found = engine.eventClashes(event);
    if (!found) {
      const names = (data.events || []).map((e) => e.title).join("; ");
      return { isError: true, content: [{ type: "text", text: "No campus event matches '" + event + "'. Known events: " + names }] };
    }
    const r = engine.answer(event, parseNow(now), language || "en");
    return {
      content: [{ type: "text", text: toText(r) }],
      structuredContent: {
        hasClash: found.clashes.length > 0, event: found.event, clashes: found.clashes,
        say: r.say, items: r.items, language: r.lang
      }
    };
  });

  return server;
}

// ---------- HTTP (Streamable HTTP, stateless) ----------
function sendJson(res, status, body, headers) {
  res.writeHead(status, Object.assign({ "content-type": "application/json" }, headers || {}));
  res.end(JSON.stringify(body));
}
const rpcError = (code, message) => ({ jsonrpc: "2.0", error: { code: code, message: message }, id: null });

// Protect against DNS-rebinding: browsers send an Origin header; only allow local pages
// (plus anything listed in ALLOWED_ORIGINS, comma-separated). Non-browser clients send none.
function originAllowed(origin) {
  if (!origin) return true;
  const extra = (process.env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (extra.includes(origin)) return true;
  try { return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(origin).hostname); } catch (e) { return false; }
}

function readJson(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on("data", (c) => { size += c.length; if (size > limit) { reject(Object.assign(new Error("Body too large"), { status: 413 })); req.destroy(); } else chunks.push(c); });
    req.on("end", () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); } catch (e) { reject(Object.assign(new Error("Parse error"), { status: 400 })); } });
    req.on("error", reject);
  });
}

function createHttpServer() {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      if (!originAllowed(req.headers.origin)) return sendJson(res, 403, rpcError(-32000, "Forbidden origin"));
      if (url.pathname === "/health") return sendJson(res, 200, { ok: true, name: "campus-buddy", transport: "streamable-http", endpoint: "/mcp" });
      if (url.pathname !== "/mcp") return sendJson(res, 404, rpcError(-32000, "Not found. The MCP endpoint is /mcp"));
      // Stateless mode: only POST is used (no server-initiated streams, no sessions to delete).
      if (req.method !== "POST") return sendJson(res, 405, rpcError(-32000, "Method not allowed. Use POST /mcp"), { allow: "POST" });

      const body = await readJson(req, 1024 * 1024);
      const server = buildServer();
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
      res.on("close", () => { transport.close(); server.close(); });
      await server.connect(transport);
      await transport.handleRequest(req, res, body);
    } catch (e) {
      if (!res.headersSent) sendJson(res, e.status || 500, rpcError(e.status === 400 ? -32700 : -32603, e.message || "Internal error"));
      else res.end();
    }
  });
}

if (require.main === module) {
  const PORT = Number(process.env.PORT || 3333);
  const HOST = process.env.HOST || "127.0.0.1";
  createHttpServer().listen(PORT, HOST, () => {
    console.error("Campus Buddy MCP server listening on http://" + HOST + ":" + PORT + "/mcp  (health: /health)");
  });
}

module.exports = { buildServer, createHttpServer, engine };
