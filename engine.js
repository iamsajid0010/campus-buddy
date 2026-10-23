// Campus Buddy - the "brain". Pure logic, no browser code, so it can be tested in Node
// and reused by the MCP server in /mcp. Answers in English or Bangla.
(function (root) {
  "use strict";

  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const BN_DAY_NAMES = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"];
  const BN_DAYS = { "রবিবার": 0, "রোববার": 0, "সোমবার": 1, "মঙ্গলবার": 2, "বুধবার": 3, "বৃহস্পতিবার": 4, "শুক্রবার": 5, "শনিবার": 6 };
  const BN_MONTHS = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
  const BN_TYPES = { seminar: "সেমিনার", workshop: "ওয়ার্কশপ", contest: "কনটেস্ট", hackathon: "হ্যাকাথন", fest: "ফেস্ট",
    quiz: "কুইজ", midterm: "মিডটার্ম", final: "ফাইনাল" };
  const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

  const pad = (n) => String(n).padStart(2, "0");
  const bd = (s) => String(s).replace(/[0-9]/g, (d) => BN_DIGITS[d]); // Bangla digits
  const detectLang = (text) => (/[ঀ-৿]/.test(String(text || "")) ? "bn" : "en");
  const toMin = (t) => { const p = t.split(":").map(Number); return p[0] * 60 + p[1]; };
  const fmtTime = (t) => {
    let p = t.split(":").map(Number);
    const ap = p[0] >= 12 ? "PM" : "AM";
    const h = p[0] % 12 || 12;
    return h + ":" + pad(p[1]) + " " + ap;
  };
  // Bangla clock: "সকাল ৮:৩০", "দুপুর ২টা"
  const bnPeriod = (h) => (h < 4 ? "রাত" : h < 6 ? "ভোর" : h < 12 ? "সকাল" : h < 16 ? "দুপুর" : h < 18 ? "বিকাল" : h < 20 ? "সন্ধ্যা" : "রাত");
  const fmtTimeBnHM = (h, m) => bnPeriod(h) + " " + bd(h % 12 || 12) + (m ? ":" + bd(pad(m)) : "টা");
  const fmtTimeBn = (t) => { const p = t.split(":").map(Number); return fmtTimeBnHM(p[0], p[1]); };
  const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const plural = (n, w) => n + " " + (n === 1 ? w : w === "class" ? "classes" : w + "s");
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const roomText = (r) => (/^\d/.test(String(r)) ? "Room " + r : r);

  function createEngine(D) {
    // Keep only the lab groups the student attends (see myLabs in data.js)
    if (D.myLabs) {
      D = Object.assign({}, D, {
        classes: D.classes.filter((c) => !c.lab || !D.myLabs[c.code] || D.myLabs[c.code] === c.lab)
      });
    }
    const courseByCode = {};
    D.courses.forEach((c) => { courseByCode[c.code] = c; });
    const classesOn = (dow) =>
      D.classes.filter((c) => c.day === dow).sort((a, b) => toMin(a.start) - toMin(b.start));

    // Events matching: the event whose title/alias appears in the text (longest match wins)
    function matchEvent(q) {
      let best = null, bestLen = 0;
      (D.events || []).forEach((e) => {
        [e.title].concat(e.aliases || []).forEach((k) => {
          k = k.toLowerCase();
          if (q.includes(k) && k.length > bestLen) { best = e; bestLen = k.length; }
        });
      });
      return best;
    }

    // Classes that overlap with an event (so we can warn about a clash)
    function clashes(e) {
      const d = new Date(e.when);
      const s = d.getHours() * 60 + d.getMinutes();
      const ed = e.end ? new Date(e.end) : null;
      const en = ed && startOfDay(ed).getTime() === startOfDay(d).getTime() ? ed.getHours() * 60 + ed.getMinutes() : s + 120;
      return classesOn(d.getDay()).filter((c) => toMin(c.start) < en && toMin(c.end) > s);
    }

    function answer(raw, now, lang) {
      now = now || new Date();
      const bn = (lang || detectLang(raw)) === "bn";
      const q = String(raw || "").toLowerCase().trim();
      const has = function () { return Array.prototype.some.call(arguments, (w) => q.includes(w)); };
      const todayDow = now.getDay();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const dayDiff = (d) => Math.round((startOfDay(d) - startOfDay(now)) / 86400000);
      const out = (say, items) => ({ say: say, items: items || [], lang: bn ? "bn" : "en" });

      // ---- language-aware names ----
      const cname = (code) => { const c = courseByCode[code]; return c ? ((bn && c.bn) || c.name) : code; };
      const dayName = (i) => (bn ? BN_DAY_NAMES[i] : DAYS[i]);
      const tName = (type) => (bn ? BN_TYPES[String(type).toLowerCase()] || type : type);
      const evTitle = (e) => (bn && e.bnTitle) || e.title;
      const evVenue = (e) => (bn && e.bnVenue) || e.venue;
      const fT = (t) => (bn ? fmtTimeBn(t) : fmtTime(t));
      const roomBn = (r) => "রুম " + r;
      const clashNames = (c) => c.map((k) => cname(k.code)).join(bn ? " ও " : " and ");

      const whenLabel = (date) => {
        const diff = dayDiff(date);
        if (bn) {
          const day = diff === 0 ? "আজ" : diff === 1 ? "আগামীকাল"
            : diff < 7 ? BN_DAY_NAMES[date.getDay()]
            : BN_DAY_NAMES[date.getDay()] + ", " + bd(date.getDate()) + " " + BN_MONTHS[date.getMonth()];
          return day + " " + fmtTimeBnHM(date.getHours(), date.getMinutes());
        }
        const day = diff === 0 ? "today" : diff === 1 ? "tomorrow"
          : diff < 7 ? DAYS[date.getDay()]
          : DAYS[date.getDay()] + ", " + MONTHS[date.getMonth()] + " " + date.getDate();
        const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        return day + " at " + time;
      };
      const classLine = (c) => bn
        ? cname(c.code) + (c.lab ? " " + c.lab : "") + ", " + fmtTimeBn(c.start) + " থেকে " + fmtTimeBn(c.end) + ", " + roomBn(c.room)
        : cname(c.code) + (c.lab ? " " + c.lab : "") + ", " + fmtTime(c.start) + " to " + fmtTime(c.end) + ", Room " + c.room;

      function findCourse() {
        // Pick the course whose matching name/alias is the longest, so
        // "oop lab" finds the lab and not the lecture course.
        let best = null, bestLen = 0;
        D.courses.forEach((c) => {
          [c.code, c.name].concat(c.aliases || []).forEach((k) => {
            k = k.toLowerCase();
            const hit = k.length <= 3 ? new RegExp("\\b" + esc(k) + "\\b").test(q) : q.includes(k);
            if (hit && k.length > bestLen) { best = c; bestLen = k.length; }
          });
        });
        return best;
      }

      function dayRef() {
        if (has("today", "আজ")) return { dow: todayDow, offset: 0, label: "today" };
        // "কাল" is also inside words like "সকাল", so match it only as a whole word
        const words = q.split(/[\s,?!।.]+/);
        if (has("tomorrow", "আগামীকাল", "আগামী কাল") || words.some((w) => w === "কাল" || w === "কালকে" || w === "কালকের")) return { dow: (todayDow + 1) % 7, offset: 1, label: "tomorrow" };
        for (let i = 0; i < 7; i++) {
          if (q.includes(DAYS[i].toLowerCase())) return { dow: i, offset: (i - todayDow + 7) % 7, label: DAYS[i] };
        }
        for (const k in BN_DAYS) {
          if (q.includes(k)) { const i = BN_DAYS[k]; return { dow: i, offset: (i - todayDow + 7) % 7, label: DAYS[i] }; }
        }
        return null;
      }
      // Bangla wording for a day reference: আজ / আগামীকাল / রবিবার...
      const refBn = (ref) => (ref.label === "today" ? "আজ" : ref.label === "tomorrow" ? "আগামীকাল" : BN_DAY_NAMES[ref.dow]);

      function help() {
        if (bn) {
          return out("হাই! আমি ক্যাম্পাস বাডি। আমি আপনার ক্লাস, অ্যাসাইনমেন্ট, পরীক্ষা, রুম ও শিক্ষকদের সম্পর্কে বলতে পারি। এগুলো জিজ্ঞেস করে দেখুন:", [
            "আমার পরের ক্লাস কখন?",
            "কাল আমার কী কী ক্লাস আছে?",
            "এই সপ্তাহে কোন অ্যাসাইনমেন্ট জমা দিতে হবে?",
            "অবজেক্ট ওরিয়েন্টেড প্রোগ্রামিং ক্লাস কোথায় হয়?",
            "আমার পরের পরীক্ষা কবে?",
            "আসছে কী কী ইভেন্ট আছে?"
          ]);
        }
        return out("Hi! I'm Campus Buddy. I can tell you about your classes, assignments, exams, rooms and teachers. Try one of these:", [
          "When is my next class?",
          "What classes do I have tomorrow?",
          "Which assignments are due this week?",
          "Where is the Object Oriented Programming class held?",
          "When is my next exam?",
          "What events are coming up?"
        ]);
      }

      function nextClass() {
        const cur = classesOn(todayDow).find((c) => toMin(c.start) <= nowMin && nowMin < toMin(c.end));
        for (let i = 0; i <= 7; i++) {
          const dow = (todayDow + i) % 7;
          const c = classesOn(dow).find((x) => i > 0 || toMin(x.start) > nowMin);
          if (c) {
            const crs = courseByCode[c.code];
            const t = crs && (bn ? crs.teacherBn || crs.teacher : crs.teacher);
            if (bn) {
              const when = i === 0 ? "আজ" : i === 1 ? "আগামীকাল" : i === 7 ? "আগামী " + BN_DAY_NAMES[dow] : BN_DAY_NAMES[dow];
              const prefix = cur ? "আপনি এখন " + cname(cur.code) + " ক্লাসে আছেন। " : "";
              return out(prefix + "আপনার পরের ক্লাস " + cname(c.code) + (c.lab ? " " + c.lab : "") + ", " + when + " " + fmtTimeBn(c.start) + ", " + roomBn(c.room) + "।",
                t ? ["শিক্ষক: " + t] : []);
            }
            const when = i === 0 ? "today" : i === 1 ? "tomorrow" : i === 7 ? "next " + DAYS[dow] : DAYS[dow];
            const prefix = cur ? "You're in " + cname(cur.code) + " right now. " : "";
            return out(prefix + "Your next class is " + cname(c.code) + (c.lab ? " " + c.lab : "") + " " + when + " at " + fmtTime(c.start) + " in Room " + c.room + ".",
              t ? ["Teacher: " + t] : []);
          }
        }
        return out(bn ? "আপনার রুটিনে কোনো আসন্ন ক্লাস খুঁজে পাইনি।" : "I couldn't find any upcoming classes in your routine.");
      }

      function classesForDay(ref) {
        const list = classesOn(ref.dow);
        const rel = ref.label === "today" || ref.label === "tomorrow";
        if (bn) {
          if (!list.length) return out(refBn(ref) + " আপনার কোনো ক্লাস নেই। ছুটি উপভোগ করুন!");
          return out(refBn(ref) + " আপনার " + bd(list.length) + "টি ক্লাস আছে:", list.map(classLine));
        }
        if (!list.length) {
          return out("You have no classes " + (rel ? ref.label : "on " + ref.label) + ". Enjoy the free time!");
        }
        const lead = rel ? ref.label : "on " + ref.label;
        return out("You have " + plural(list.length, "class") + " " + lead + ":", list.map(classLine));
      }

      function assignments(course, ref) {
        let list = D.assignments.map((a) => ({ a: a, d: new Date(a.due) }))
          .filter((x) => x.d >= now)
          .sort((x, y) => x.d - y.d);
        if (course) list = list.filter((x) => x.a.code === course.code);
        let scope, scopeBn;
        if (ref && (ref.label === "today" || ref.label === "tomorrow")) {
          list = list.filter((x) => dayDiff(x.d) === ref.offset);
          scope = "due " + ref.label; scopeBn = refBn(ref) + " ";
        } else if (ref) {
          list = list.filter((x) => dayDiff(x.d) === ref.offset);
          scope = "due on " + ref.label; scopeBn = refBn(ref) + " ";
        } else if (course) {
          scope = "coming up for " + course.name; scopeBn = cname(course.code) + " এর ";
        } else {
          list = list.filter((x) => dayDiff(x.d) < 7);
          scope = "due in the next 7 days"; scopeBn = "আগামী ৭ দিনে ";
        }
        const aItem = (x) => bn
          ? (x.a.bnTitle || x.a.title) + " (" + cname(x.a.code) + "), জমার সময় " + whenLabel(x.d)
          : x.a.title + " (" + cname(x.a.code) + "), due " + whenLabel(x.d);
        if (bn) {
          if (!list.length) return out("এই সময়ে কোনো অ্যাসাইনমেন্ট নেই। আপনি একদম আপ-টু-ডেট!");
          return out(scopeBn + bd(list.length) + "টি অ্যাসাইনমেন্ট " + (course && !ref ? "আসছে:" : "জমা দিতে হবে:"), list.map(aItem));
        }
        if (!list.length) return out("Nothing " + scope + ". You're all caught up!");
        return out("You have " + plural(list.length, "assignment") + " " + scope + ":", list.map(aItem));
      }

      function exams(course) {
        let list = (D.exams || []).map((e) => ({ e: e, d: new Date(e.when) }))
          .filter((x) => x.d >= now)
          .sort((x, y) => x.d - y.d);
        if (course) list = list.filter((x) => x.e.code === course.code);
        if (!list.length) return out(bn ? "আমি কোনো আসন্ন পরীক্ষা দেখতে পাচ্ছি না।" : "I don't see any upcoming exams.");
        const f = list[0];
        if (bn) {
          return out("আপনার পরের পরীক্ষা " + cname(f.e.code) + " " + tName(f.e.type) + ", " + whenLabel(f.d) + (f.e.room ? ", " + roomBn(f.e.room) : "") + "।",
            list.slice(1).map((x) => cname(x.e.code) + " " + tName(x.e.type) + ", " + whenLabel(x.d)));
        }
        return out("Your next exam is " + cname(f.e.code) + " " + f.e.type + " " + whenLabel(f.d) + (f.e.room ? " in " + roomText(f.e.room) : "") + ".",
          list.slice(1).map((x) => cname(x.e.code) + " " + x.e.type + ", " + whenLabel(x.d)));
      }

      function courseInfo(course, mode) {
        const meets = D.classes.filter((c) => c.code === course.code).sort((a, b) => a.day - b.day);
        if (mode === "teacher") {
          if (bn) return out(cname(course.code) + " (" + course.code + ") এর শিক্ষক " + (course.teacherBn || course.teacher || "কে, সেই তথ্য আমার কাছে নেই") + "।");
          return out(course.name + " (" + course.code + ") is taught by " + (course.teacher || "an instructor I don't have on file") + ".");
        }
        if (bn) {
          if (!meets.length) return out(cname(course.code) + " এর ক্লাসের সময় আমার কাছে নেই।");
          return out(cname(course.code) + " সপ্তাহে " + bd(meets.length) + "টি ক্লাস হয়:",
            meets.map((c) => BN_DAY_NAMES[c.day] + ", " + fmtTimeBn(c.start) + " থেকে " + fmtTimeBn(c.end) + ", " + roomBn(c.room)));
        }
        if (!meets.length) return out("I don't have any class times for " + course.name + ".");
        return out(course.name + " meets " + plural(meets.length, "time") + " a week:",
          meets.map((c) => DAYS[c.day] + ", " + fmtTime(c.start) + " to " + fmtTime(c.end) + ", Room " + c.room));
      }

      // ---- Campus events (seminars, hackathons, workshops...) ----
      const eventLine = (x) => {
        const c = clashes(x.e);
        if (bn) {
          return evTitle(x.e) + " (" + tName(x.e.type) + "), " + whenLabel(x.d) + ", " + evVenue(x.e) +
            (c.length ? " (আপনার " + clashNames(c) + " ক্লাসের সাথে মিলে যাচ্ছে)" : "");
        }
        return x.e.title + " (" + x.e.type + "), " + whenLabel(x.d) + ", " + x.e.venue +
          (c.length ? " (clashes with your " + clashNames(c) + ")" : "");
      };

      function eventsAnswer(ev, ref) {
        if (ev) {
          const d = new Date(ev.when);
          const c = clashes(ev);
          const items = [];
          if (bn) {
            if (ev.organizer) items.push("আয়োজক: " + (ev.bnOrganizer || ev.organizer));
            if (ev.about) items.push(ev.bnAbout || ev.about);
            if (c.length) items.push("সতর্কতা: এটি আপনার " + clashNames(c) + " ক্লাসের সাথে মিলে যাচ্ছে");
            return out(evTitle(ev) + " (" + tName(ev.type) + ") অনুষ্ঠিত হবে " + whenLabel(d) + "। স্থান: " + evVenue(ev) + "।", items);
          }
          if (ev.organizer) items.push("Organized by " + ev.organizer);
          if (ev.about) items.push(ev.about);
          if (c.length) items.push("Heads up: this clashes with your " + clashNames(c));
          return out(ev.title + " (" + ev.type + ") is " + whenLabel(d) + " at " + ev.venue + ".", items);
        }
        let list = (D.events || []).map((e) => ({ e: e, d: new Date(e.when) }))
          .filter((x) => x.d >= now).sort((a, b) => a.d - b.d);

        const types = [["seminar", "seminar"], ["talk", "seminar"], ["webinar", "seminar"], ["hackathon", "hackathon"],
          ["workshop", "workshop"], ["bootcamp", "workshop"], ["contest", "contest"], ["competition", "contest"], ["fest", "fest"],
          ["সেমিনার", "seminar"], ["হ্যাকাথন", "hackathon"], ["হ্যাকাথন", "hackathon"], ["ওয়ার্কশপ", "workshop"], ["কর্মশালা", "workshop"],
          ["কনটেস্ট", "contest"], ["প্রতিযোগিতা", "contest"], ["ফেস্ট", "fest"]];
        const t = types.find((p) => q.includes(p[0]));
        if (t) list = list.filter((x) => x.e.type.toLowerCase().includes(t[1]));

        let scope = "coming up", scopeBn = "আসছে";
        if (ref && (ref.label === "today" || ref.label === "tomorrow")) {
          list = list.filter((x) => dayDiff(x.d) === ref.offset); scope = ref.label; scopeBn = refBn(ref);
        } else if (ref) {
          list = list.filter((x) => dayDiff(x.d) === ref.offset); scope = "on " + ref.label; scopeBn = refBn(ref);
        } else if (has("next week", "পরের সপ্তাহ", "আগামী সপ্তাহ")) {
          list = list.filter((x) => dayDiff(x.d) >= 7 && dayDiff(x.d) < 14); scope = "next week"; scopeBn = "আগামী সপ্তাহে";
        } else if (has("this week", "এই সপ্তাহ", "সপ্তাহে")) {
          list = list.filter((x) => dayDiff(x.d) < 7); scope = "this week"; scopeBn = "এই সপ্তাহে";
        } else if (has("this month", "এই মাস")) {
          list = list.filter((x) => x.d.getMonth() === now.getMonth() && x.d.getFullYear() === now.getFullYear()); scope = "this month"; scopeBn = "এই মাসে";
        }
        if (bn) {
          const nounBn = t ? BN_TYPES[t[1]] : "ইভেন্ট";
          if (!list.length) return out(scopeBn + " কোনো " + nounBn + " দেখতে পাচ্ছি না।");
          list = list.slice(0, 6);
          return out(scopeBn + " " + bd(list.length) + "টি " + nounBn + " আছে:", list.map(eventLine));
        }
        const noun = t ? t[1] + "s" : "event";
        if (!list.length) return out("I don't see any " + (t ? t[1] + "s" : "events") + " " + scope + ".");
        list = list.slice(0, 6);
        return out("There " + (list.length === 1 ? "is 1 " + (t ? t[1] : "event") : "are " + list.length + " " + (t ? noun : "events")) + " " + scope + ":",
          list.map(eventLine));
      }

      // ---- Understand the question (simple keyword matching) ----
      if (!q || has("help", "what can you do", "সাহায্য", "হেল্প")) return help();
      if (/^(hi|hello|hey|salam|assalamu|হ্যালো|হাই|সালাম|আসসালামু)/.test(q)) return help();

      const course = findCourse();
      const ref = dayRef();

      const ev = matchEvent(q);
      if (ev || has("event", "seminar", "hackathon", "workshop", "contest", "competition", "webinar", "bootcamp", "fest",
        "what's on", "whats on", "ইভেন্ট", "সেমিনার", "হ্যাকাথন", "কর্মশালা", "ওয়ার্কশপ", "কনটেস্ট", "ফেস্ট", "প্রতিযোগিতা")) return eventsAnswer(ev, ref);

      if (has("exam", "quiz", "midterm", "final", "পরীক্ষা", "এক্সাম", "কুইজ", "মিডটার্ম", "ফাইনাল")) return exams(course);
      if (has("assignment", "homework", "due", "deadline", "submit", "submission", "অ্যাসাইনমেন্ট", "এসাইনমেন্ট", "এ্যাসাইনমেন্ট",
        "হোমওয়ার্ক", "ডেডলাইন", "সাবমিশন", "জমা"))
        return assignments(course, ref);
      if (course && has("teacher", "who teaches", "faculty", "instructor", "lecturer", "sir", "madam", "স্যার", "ম্যাডাম", "ম্যাম",
        "শিক্ষক", "টিচার", "পড়ান", "ফ্যাকাল্টি"))
        return courseInfo(course, "teacher");
      if (course && has("where", "room", "location", "when", "time", "কোথায়", "রুম", "কখন", "কবে", "কয়টায়", "কটায়")) return courseInfo(course, "where");
      if (has("next class", "next lecture", "পরের ক্লাস", "পরবর্তী ক্লাস", "পরের লেকচার") || (has("next") && has("class", "lecture"))
        || (has("পরের", "পরবর্তী", "এরপর") && has("ক্লাস", "লেকচার")))
        return nextClass();
      if (course) return courseInfo(course, "where");
      if (ref || has("class", "classes", "schedule", "routine", "timetable", "lecture", "ক্লাস", "রুটিন", "লেকচার", "সময়সূচি"))
        return classesForDay(ref || { dow: todayDow, offset: 0, label: "today" });

      if (bn) {
        return out("দুঃখিত, আমি বুঝতে পারিনি। আমি ক্লাস, অ্যাসাইনমেন্ট, পরীক্ষা, রুম ও শিক্ষক সম্পর্কে সাহায্য করতে পারি। চেষ্টা করুন:",
          ["আমার পরের ক্লাস কখন?", "কাল কী জমা দিতে হবে?"]);
      }
      return out("Sorry, I didn't understand that. I can help with classes, assignments, exams, rooms and teachers. Try:",
        ["When is my next class?", "What is due tomorrow?"]);
    }

    // Structured clash check (used by the MCP server): which classes overlap an event?
    function eventClashes(text) {
      const e = matchEvent(String(text || "").toLowerCase());
      if (!e) return null;
      return {
        event: { title: e.title, type: e.type, when: e.when, end: e.end || null, venue: e.venue },
        clashes: clashes(e).map((c) => ({
          code: c.code, name: courseByCode[c.code] ? courseByCode[c.code].name : c.code,
          day: DAYS[c.day], start: c.start, end: c.end, room: c.room
        }))
      };
    }

    return { answer: answer, eventClashes: eventClashes, detectLang: detectLang };
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { createEngine: createEngine, detectLang: detectLang };
  else { root.createEngine = createEngine; }
})(typeof window !== "undefined" ? window : this);
