// Campus Buddy - the interface: chat bubbles, microphone, and spoken replies.
(function () {
  "use strict";

  const engine = window.createEngine(window.CAMPUS_DATA);

  const log = document.getElementById("log");
  const input = document.getElementById("q");
  const form = document.getElementById("form");
  const micBtn = document.getElementById("mic");
  const orb = document.getElementById("orb");
  const status = document.getElementById("status");
  const voiceToggle = document.getElementById("voice");
  const langSel = document.getElementById("lang");
  const chips = document.getElementById("chips");

  const SUGGESTIONS = [
    "When is my next class?",
    "What classes do I have tomorrow?",
    "Which assignments are due this week?",
    "What is due tomorrow?",
    "Where is CSE221?",
    "Who teaches CSE215?",
    "When is my next exam?"
  ];

  function setState(state, text) {
    orb.className = "orb " + state;
    status.textContent = text;
  }

  function addBubble(who, text, items) {
    const row = document.createElement("div");
    row.className = "bubble " + who;
    const p = document.createElement("p");
    p.textContent = text;
    row.appendChild(p);
    if (items && items.length) {
      const ul = document.createElement("ul");
      items.forEach((t) => {
        const li = document.createElement("li");
        li.textContent = t;
        ul.appendChild(li);
      });
      row.appendChild(ul);
    }
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
  }

  function speak(text) {
    if (!voiceToggle.checked || !("speechSynthesis" in window)) { setState("idle", "Ready"); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.onstart = () => setState("speaking", "Speaking...");
    u.onend = () => setState("idle", "Ready");
    u.onerror = () => setState("idle", "Ready");
    window.speechSynthesis.speak(u);
  }

  function ask(text) {
    text = text.trim();
    if (!text) return;
    addBubble("user", text);
    const res = engine.answer(text);
    addBubble("bot", res.say, res.items);
    // Read the sentence plus up to 4 list items aloud
    speak([res.say].concat(res.items.slice(0, 4)).join(". "));
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    ask(input.value);
    input.value = "";
  });

  SUGGESTIONS.forEach((s) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = s;
    b.addEventListener("click", () => ask(s));
    chips.appendChild(b);
  });

  // ---- Microphone (speech recognition) ----
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    micBtn.disabled = true;
    micBtn.title = "Voice input needs Chrome or Edge. You can still type.";
    micBtn.classList.add("off");
  } else {
    let rec = null;
    let listening = false;
    micBtn.addEventListener("click", () => {
      if (listening && rec) { rec.stop(); return; }
      window.speechSynthesis && window.speechSynthesis.cancel();
      rec = new SR();
      rec.lang = langSel.value;
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onstart = () => { listening = true; micBtn.classList.add("live"); setState("listening", "Listening..."); };
      rec.onend = () => { listening = false; micBtn.classList.remove("live"); if (orb.classList.contains("listening")) setState("idle", "Ready"); };
      rec.onerror = (e) => { setState("idle", e.error === "not-allowed" ? "Microphone blocked" : "Ready"); };
      rec.onresult = (e) => ask(e.results[0][0].transcript);
      rec.start();
    });
  }

  // Welcome message (no auto-speech: browsers block that until you click)
  const hi = engine.answer("help");
  addBubble("bot", hi.say, hi.items);
  setState("idle", "Ready");
})();
