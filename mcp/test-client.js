"use strict";
// End-to-end test: starts the MCP server on a free port and talks to it over HTTP
// with the official MCP client, the way an agent would.   Run: npm test
const assert = require("node:assert/strict");
const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StreamableHTTPClientTransport } = require("@modelcontextprotocol/sdk/client/streamableHttp.js");
const { createHttpServer } = require("./server.js");

// A fixed "now" so answers are deterministic: Friday 23 Oct 2026, 10:57 (sample data is relative to today).
const NOW = new Date().toISOString().slice(0, 10) + "T10:57";

let passed = 0;
async function check(name, fn) {
  try { await fn(); passed++; console.log("  ok   " + name); }
  catch (e) { console.log("  FAIL " + name + "\n       " + (e && e.message)); process.exitCode = 1; }
}

(async () => {
  const httpServer = createHttpServer();
  await new Promise((r) => httpServer.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + httpServer.address().port;
  console.log("MCP test against " + base + "/mcp\n");

  const client = new Client({ name: "campus-buddy-test", version: "1.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(base + "/mcp")));
  const call = (name, args) => client.callTool({ name: name, arguments: Object.assign({ now: NOW }, args || {}) });

  await check("negotiates MCP protocol 2025-11-25 (raw initialize request)", async () => {
    const r = await fetch(base + "/mcp", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize",
        params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "raw", version: "0" } } })
    });
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.result.protocolVersion, "2025-11-25");
    assert.equal(j.result.serverInfo.name, "campus-buddy");
  });

  await check("lists 8 read-only tools with schemas", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    assert.deepEqual(names, ["ask_campus_buddy", "assignments_due", "check_event_clash", "classes_on_day", "course_info", "next_class", "next_exam", "upcoming_events"]);
    tools.forEach((t) => { assert.ok(t.inputSchema && t.outputSchema, t.name + " missing schema"); assert.equal(t.annotations.readOnlyHint, true); });
  });

  await check("next_class returns a sentence, teacher and structured content", async () => {
    const r = await call("next_class");
    assert.ok(!r.isError);
    assert.match(r.structuredContent.say, /Your next class is/);
    assert.equal(r.structuredContent.language, "en");
    assert.match(r.structuredContent.items[0], /^Teacher:/);
  });

  await check("next_class in Bangla (language: bn)", async () => {
    const r = await call("next_class", { language: "bn" });
    assert.equal(r.structuredContent.language, "bn");
    assert.match(r.structuredContent.say, /আপনার পরের ক্লাস/);
  });

  await check("ask_campus_buddy auto-detects Bangla", async () => {
    const r = await call("ask_campus_buddy", { question: "আমার পরের পরীক্ষা কবে?" });
    assert.equal(r.structuredContent.language, "bn");
    assert.match(r.structuredContent.say, /পরের পরীক্ষা/);
  });

  await check("ask_campus_buddy answers English free-form", async () => {
    const r = await call("ask_campus_buddy", { question: "Who is the instructor for Electronic Devices and Circuits?" });
    assert.match(r.structuredContent.say, /Najeeb Ahmed Bhuiyan/);
  });

  await check("classes_on_day Sunday lists 2 classes", async () => {
    const r = await call("classes_on_day", { day: "Sunday" });
    assert.match(r.structuredContent.say, /2 classes/);
    assert.equal(r.structuredContent.items.length, 2);
  });

  await check("assignments_due (default) lists this week's assignments", async () => {
    const r = await call("assignments_due");
    assert.match(r.structuredContent.say, /assignments? due in the next 7 days/);
    assert.ok(r.structuredContent.items.length >= 1);
  });

  await check("assignments_due filtered by course", async () => {
    const r = await call("assignments_due", { course: "OOP" });
    assert.ok(r.structuredContent.items.every((i) => /Object Oriented Programming/.test(i)));
  });

  await check("next_exam for one course", async () => {
    const r = await call("next_exam", { course: "oop" });
    assert.match(r.structuredContent.say, /Object Oriented Programming Midterm/);
  });

  await check("upcoming_events filtered to hackathons this month", async () => {
    const r = await call("upcoming_events", { type: "hackathon", when: "this month" });
    assert.ok(!r.isError);
    assert.ok(/hackathon/i.test(r.structuredContent.say));
  });

  await check("course_info teacher and schedule", async () => {
    const t = await call("course_info", { course: "EDC lab", detail: "teacher" });
    assert.match(t.structuredContent.say, /Najeeb Ahmed Bhuiyan/);
    const s = await call("course_info", { course: "oop", detail: "schedule" });
    assert.match(s.structuredContent.say, /meets 2 times a week/);
  });

  await check("check_event_clash finds the Tech Talk vs EDC clash", async () => {
    const r = await call("check_event_clash", { event: "Tech Talk" });
    assert.equal(r.structuredContent.hasClash, true);
    assert.ok(r.structuredContent.clashes.some((c) => /Electronic Devices and Circuits/.test(c.name)));
  });

  await check("check_event_clash reports no clash for the hackathon", async () => {
    const r = await call("check_event_clash", { event: "campus hackathon" });
    assert.equal(r.structuredContent.hasClash, false);
  });

  await check("check_event_clash on an unknown event is a tool error that lists known events", async () => {
    const r = await call("check_event_clash", { event: "moon landing" });
    assert.equal(r.isError, true);
    assert.match(r.content[0].text, /Known events/);
  });

  await check("invalid arguments are rejected (bad weekday)", async () => {
    let failed = false;
    try { const r = await call("classes_on_day", { day: "Funday" }); failed = !!r.isError; } catch (e) { failed = true; }
    assert.ok(failed);
  });

  await check("browser requests from a foreign Origin are refused (DNS-rebinding guard)", async () => {
    const r = await fetch(base + "/mcp", { method: "POST", headers: { "content-type": "application/json", origin: "https://evil.example" }, body: "{}" });
    assert.equal(r.status, 403);
  });

  await check("GET /mcp is 405 and /health is 200", async () => {
    assert.equal((await fetch(base + "/mcp")).status, 405);
    const h = await fetch(base + "/health");
    assert.equal(h.status, 200);
    assert.equal((await h.json()).ok, true);
  });

  await client.close();
  httpServer.close();
  console.log("\n" + passed + " checks passed" + (process.exitCode ? ", some FAILED" : ""));
})();
