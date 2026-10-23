// Campus Buddy - the interface: opening page, chat, microphone, and spoken replies.
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
  const clock = document.getElementById("clock");
  const nextText = document.getElementById("nextText");
  const splash = document.getElementById("splash");
  const enterBtn = document.getElementById("enter");
  const splashTitle = document.getElementById("splashTitle");

  const SUGGESTIONS = [
    "When is my next class?",
    "What classes do I have tomorrow?",
    "Which assignments are due this week?",
    "Where is the Object Oriented Programming class held?",
    "Who is the instructor for Electronic Devices and Circuits?",
    "When is my next exam?",
    "What events are coming up?",
    "Are there any hackathons this month?",
    "Where is the Tech Talk being held?"
  ];

  // ---- Opening page ----
  // Split the title into letters so each one can be "written" in turn.
  if (splashTitle) {
    const text = splashTitle.textContent;
    splashTitle.setAttribute("aria-label", text);
    splashTitle.textContent = "";
    Array.from(text).forEach((c, i) => {
      const s = document.createElement("span");
      s.className = "ch";
      s.setAttribute("aria-hidden", "true");
      s.style.setProperty("--i", i);
      s.textContent = c;
      splashTitle.appendChild(s);
    });
  }

  let splashClosed = false;
  function closeSplash() {
    if (splashClosed || !splash) return;
    splashClosed = true;
    splash.classList.add("out");
    document.body.classList.add("ready");
    setTimeout(() => { splash.remove(); }, 1000);
  }
  if (enterBtn) enterBtn.addEventListener("click", closeSplash);
  document.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === "Escape") closeSplash(); });
  setTimeout(closeSplash, 7000);
  if (!splash) document.body.classList.add("ready");

  // ---- Clock and "Next up" slip ----
  function tick() {
    const now = new Date();
    clock.textContent = now.toLocaleString("en-US", { weekday: "long", hour: "numeric", minute: "2-digit" });
    nextText.textContent = engine.answer("next class", now).say;
  }
  tick();
  setInterval(tick, 30000);

  // ---- Chat ----
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
      items.forEach((t, n) => {
        const li = document.createElement("li");
        li.textContent = t;
        li.style.setProperty("--n", n);
        ul.appendChild(li);
      });
      row.appendChild(ul);
    }
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
    return row;
  }

  function addTyping() {
    const row = document.createElement("div");
    row.className = "bubble bot typing";
    row.setAttribute("aria-label", "Campus Buddy is thinking");
    row.innerHTML = "<span></span><span></span><span></span>";
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
    return row;
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
    const typing = addTyping();
    setState("thinking", "Thinking...");
    setTimeout(() => {
      typing.remove();
      const res = engine.answer(text);
      addBubble("bot", res.say, res.items);
      // Read the sentence plus up to 4 list items aloud
      speak([res.say].concat(res.items.slice(0, 4)).join(". "));
    }, 650);
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
      let gotResult = false, gotError = false;
      const why = {
        "not-allowed": "The microphone is blocked. Click the lock icon in the address bar, allow the microphone, then try again.",
        "service-not-allowed": "This browser blocked speech recognition. Open the site in Google Chrome or Microsoft Edge.",
        "no-speech": "I didn't hear anything. Tap the microphone and speak after it starts listening.",
        "audio-capture": "No microphone was found. Check that one is connected and not used by another app.",
        "network": "Speech recognition needs an internet connection. Check your connection and try again.",
        "language-not-supported": "This browser doesn't support that language for voice. Pick English, or type your question."
      };
      rec.onstart = () => { listening = true; micBtn.classList.add("live"); setState("listening", "Listening..."); };
      rec.onend = () => {
        listening = false; micBtn.classList.remove("live");
        if (!gotResult && !gotError) {
          addBubble("bot", "I didn't catch that. Tap the microphone and try again.");
        }
        if (orb.classList.contains("listening")) setState("idle", "Ready");
      };
      rec.onerror = (e) => {
        gotError = true;
        setState("idle", "Ready");
        if (e.error !== "aborted") addBubble("bot", why[e.error] || ("Voice input stopped (" + e.error + "). You can type your question instead."));
      };
      rec.onresult = (e) => { gotResult = true; ask(e.results[0][0].transcript); };
      rec.start();
    });
  }

  // Welcome message (no auto-speech: browsers block that until you click)
  const hi = engine.answer("help");
  addBubble("bot", hi.say, hi.items);
  log.scrollTop = 0;
  setState("idle", "Ready");
})();
