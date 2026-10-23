"use strict";
// Engine tests (no dependencies):  node test/engine.test.js
const assert = require("node:assert/strict");
const data = require("../data.js");
const { createEngine, detectLang } = require("../engine.js");
const engine = createEngine(data);

// Friday 23 Oct 2026, 10:57, local time (sample data is relative to the day the file loads).
const now = new Date(); now.setHours(10, 57, 0, 0);

const EN = [
  "When is my next class?", "What classes do I have tomorrow?", "Which assignments are due this week?",
  "Where is the Object Oriented Programming class held?", "Who is the instructor for Electronic Devices and Circuits?",
  "When is my next exam?", "What events are coming up?", "Are there any hackathons this month?", "Where is the Tech Talk being held?"
];
const BN = [
  "আমার পরের ক্লাস কখন?", "কাল আমার কী কী ক্লাস আছে?", "এই সপ্তাহে কোন অ্যাসাইনমেন্ট জমা দিতে হবে?",
  "অবজেক্ট ওরিয়েন্টেড প্রোগ্রামিং ক্লাস কোথায় হয়?", "ইলেকট্রনিক ডিভাইসেস অ্যান্ড সার্কিটস এর শিক্ষক কে?",
  "আমার পরের পরীক্ষা কবে?", "আসছে কী কী ইভেন্ট আছে?", "এই মাসে কি কোনো হ্যাকাথন আছে?", "টেক টক কোথায় হচ্ছে?"
];
const FALLBACK = /^(Sorry, I didn't understand|দুঃখিত)/;
const BANGLA = /[ঀ-৿]/;
const LATIN_SENTENCE = /[A-Za-z]{4,} [A-Za-z]{3,} [A-Za-z]{3,}/; // an English sentence leaking into a Bangla reply

let n = 0;
function t(name, fn) { fn(); n++; console.log("  ok   " + name); }

t("detectLang: Bangla script means Bangla", () => {
  assert.equal(detectLang("আমার ক্লাস"), "bn");
  assert.equal(detectLang("my class"), "en");
  assert.equal(detectLang("OOP ক্লাস কখন"), "bn");
});

EN.forEach((q) => t("English chip answers: " + q, () => {
  const r = engine.answer(q, now);
  assert.equal(r.lang, "en");
  assert.ok(!FALLBACK.test(r.say), "fell back: " + r.say);
  assert.ok(!BANGLA.test(r.say + r.items.join(" ")), "Bangla leaked into English reply");
}));

BN.forEach((q) => t("Bangla chip answers in Bangla: " + q, () => {
  const r = engine.answer(q, now);
  assert.equal(r.lang, "bn");
  assert.ok(!FALLBACK.test(r.say), "fell back: " + r.say);
  assert.ok(BANGLA.test(r.say), "reply is not Bangla: " + r.say);
  assert.ok(!LATIN_SENTENCE.test(r.say + " " + r.items.join(" ")), "English sentence leaked: " + r.say + " | " + r.items.join(" | "));
}));

t("Bangla times and dates use Bangla digits and day periods", () => {
  const r = engine.answer("রবিবার কী ক্লাস?", now);
  assert.ok(r.items.some((i) => /সকাল ৮:৩০ থেকে সকাল ১০টা/.test(i)), r.items.join(" | "));
});

t("explicit language overrides detection", () => {
  assert.equal(engine.answer("next class", now, "bn").lang, "bn");
  assert.equal(engine.answer("আমার পরের ক্লাস কখন?", now, "en").lang, "en");
});

t("event clash is reported (Tech Talk vs EDC), in both languages", () => {
  const en = engine.answer("Where is the Tech Talk being held?", now);
  assert.ok(en.items.some((i) => /clashes with your/.test(i)));
  const bn = engine.answer("টেক টক কোথায় হচ্ছে?", now);
  assert.ok(bn.items.some((i) => /মিলে যাচ্ছে/.test(i)));
});

t("eventClashes() gives structured data", () => {
  const r = engine.eventClashes("tech talk");
  assert.equal(r.event.type, "Seminar");
  assert.ok(r.clashes.length >= 1);
  assert.equal(engine.eventClashes("nonexistent event"), null);
});

t("unknown question falls back politely in both languages", () => {
  assert.match(engine.answer("asdf qwer", now).say, /^Sorry/);
  assert.match(engine.answer("অমুক তমুক", now).say, /^দুঃখিত/);
});

console.log("\n" + n + " checks passed");
