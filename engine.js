// Campus Buddy - the "brain". Pure logic, no browser code, so it can be tested in Node.
(function (root) {
  "use strict";

  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const BN_DAYS = { "রবিবার": 0, "সোমবার": 1, "মঙ্গলবার": 2, "বুধবার": 3, "বৃহস্পতিবার": 4, "শুক্রবার": 5, "শনিবার": 6 };

  const pad = (n) => String(n).padStart(2, "0");
  const toMin = (t) => { const p = t.split(":").map(Number); return p[0] * 60 + p[1]; };
  const fmtTime = (t) => {
    let p = t.split(":").map(Number);
    const ap = p[0] >= 12 ? "PM" : "AM";
    const h = p[0] % 12 || 12;
    return h + ":" + pad(p[1]) + " " + ap;
  };
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
    const cname = (code) => (courseByCode[code] ? courseByCode[code].name : code);
    const classesOn = (dow) =>
      D.classes.filter((c) => c.day === dow).sort((a, b) => toMin(a.start) - toMin(b.start));

    function answer(raw, now) {
      now = now || new Date();
      const q = String(raw || "").toLowerCase().trim();
      const has = function () { return Array.prototype.some.call(arguments, (w) => q.includes(w)); };
      const todayDow = now.getDay();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const dayDiff = (d) => Math.round((startOfDay(d) - startOfDay(now)) / 86400000);

      const whenLabel = (date) => {
        const diff = dayDiff(date);
        const day = diff === 0 ? "today" : diff === 1 ? "tomorrow"
          : diff < 7 ? DAYS[date.getDay()]
          : DAYS[date.getDay()] + ", " + MONTHS[date.getMonth()] + " " + date.getDate();
        const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        return day + " at " + time;
      };
      const classLine = (c) => cname(c.code) + (c.lab ? " " + c.lab : "") + ", " + fmtTime(c.start) + " to " + fmtTime(c.end) + ", Room " + c.room;

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
        if (has("tomorrow", "আগামীকাল", "আগামী কাল", "কাল")) return { dow: (todayDow + 1) % 7, offset: 1, label: "tomorrow" };
        for (let i = 0; i < 7; i++) {
          if (q.includes(DAYS[i].toLowerCase())) return { dow: i, offset: (i - todayDow + 7) % 7, label: DAYS[i] };
        }
        for (const k in BN_DAYS) {
          if (q.includes(k)) { const i = BN_DAYS[k]; return { dow: i, offset: (i - todayDow + 7) % 7, label: DAYS[i] }; }
        }
        return null;
      }

      function help() {
        return {
          say: "Hi! I'm Campus Buddy. I can tell you about your classes, assignments, exams, rooms and teachers. Try one of these:",
          items: [
            "When is my next class?",
            "What classes do I have tomorrow?",
            "Which assignments are due this week?",
            "Where is CSE221?",
            "When is my next exam?"
          ]
        };
      }

      function nextClass() {
        const cur = classesOn(todayDow).find((c) => toMin(c.start) <= nowMin && nowMin < toMin(c.end));
        for (let i = 0; i <= 7; i++) {
          const dow = (todayDow + i) % 7;
          const c = classesOn(dow).find((x) => i > 0 || toMin(x.start) > nowMin);
          if (c) {
            const when = i === 0 ? "today" : i === 1 ? "tomorrow" : i === 7 ? "next " + DAYS[dow] : DAYS[dow];
            const prefix = cur ? "You're in " + cname(cur.code) + " right now. " : "";
            const t = courseByCode[c.code] && courseByCode[c.code].teacher;
            return {
              say: prefix + "Your next class is " + cname(c.code) + (c.lab ? " " + c.lab : "") + " " + when + " at " + fmtTime(c.start) + " in Room " + c.room + ".",
              items: t ? ["Teacher: " + t] : []
            };
          }
        }
        return { say: "I couldn't find any upcoming classes in your routine.", items: [] };
      }

      function classesForDay(ref) {
        const list = classesOn(ref.dow);
        if (!list.length) {
          return { say: "You have no classes " + ((ref.label === "today" || ref.label === "tomorrow") ? ref.label : "on " + ref.label) + ". Enjoy the free time!", items: [] };
        }
        const lead = (ref.label === "today" || ref.label === "tomorrow") ? ref.label : "on " + ref.label;
        return { say: "You have " + plural(list.length, "class") + " " + lead + ":", items: list.map(classLine) };
      }

      function assignments(course, ref) {
        let list = D.assignments.map((a) => ({ a: a, d: new Date(a.due) }))
          .filter((x) => x.d >= now)
          .sort((x, y) => x.d - y.d);
        if (course) list = list.filter((x) => x.a.code === course.code);
        let scope;
        if (ref && (ref.label === "today" || ref.label === "tomorrow")) {
          list = list.filter((x) => dayDiff(x.d) === ref.offset);
          scope = "due " + ref.label;
        } else if (ref) {
          list = list.filter((x) => dayDiff(x.d) === ref.offset);
          scope = "due on " + ref.label;
        } else if (course) {
          scope = "coming up for " + course.name;
        } else {
          list = list.filter((x) => dayDiff(x.d) < 7);
          scope = "due in the next 7 days";
        }
        if (!list.length) return { say: "Nothing " + scope + ". You're all caught up!", items: [] };
        return {
          say: "You have " + plural(list.length, "assignment") + " " + scope + ":",
          items: list.map((x) => x.a.title + " (" + cname(x.a.code) + "), due " + whenLabel(x.d))
        };
      }

      function exams(course) {
        let list = (D.exams || []).map((e) => ({ e: e, d: new Date(e.when) }))
          .filter((x) => x.d >= now)
          .sort((x, y) => x.d - y.d);
        if (course) list = list.filter((x) => x.e.code === course.code);
        if (!list.length) return { say: "I don't see any upcoming exams.", items: [] };
        const f = list[0];
        return {
          say: "Your next exam is " + cname(f.e.code) + " " + f.e.type + " " + whenLabel(f.d) + (f.e.room ? " in " + roomText(f.e.room) : "") + ".",
          items: list.slice(1).map((x) => cname(x.e.code) + " " + x.e.type + ", " + whenLabel(x.d))
        };
      }

      function courseInfo(course, mode) {
        const meets = D.classes.filter((c) => c.code === course.code).sort((a, b) => a.day - b.day);
        if (mode === "teacher") {
          return { say: course.name + " is taught by " + (course.teacher || "an instructor I don't have on file") + ".", items: [] };
        }
        if (!meets.length) return { say: "I don't have any class times for " + course.name + ".", items: [] };
        return {
          say: course.name + " meets " + plural(meets.length, "time") + " a week:",
          items: meets.map((c) => DAYS[c.day] + ", " + fmtTime(c.start) + " to " + fmtTime(c.end) + ", Room " + c.room)
        };
      }

      // ---- Understand the question (simple keyword matching) ----
      if (!q || has("help", "what can you do", "সাহায্য")) return help();
      if (/^(hi|hello|hey|salam|assalamu)/.test(q)) return help();

      const course = findCourse();
      const ref = dayRef();

      if (has("exam", "midterm", "final", "পরীক্ষা")) return exams(course);
      if (has("assignment", "homework", "due", "deadline", "submit", "submission", "অ্যাসাইনমেন্ট", "এসাইনমেন্ট", "জমা"))
        return assignments(course, ref);
      if (course && has("teacher", "who teaches", "faculty", "instructor", "lecturer", "sir", "madam", "স্যার", "শিক্ষক"))
        return courseInfo(course, "teacher");
      if (course && has("where", "room", "location", "when", "time", "কোথায়", "রুম", "কখন")) return courseInfo(course, "where");
      if (has("next class", "next lecture", "পরের ক্লাস", "পরবর্তী ক্লাস") || (has("next") && has("class", "lecture")))
        return nextClass();
      if (course) return courseInfo(course, "where");
      if (ref || has("class", "classes", "schedule", "routine", "timetable", "lecture", "ক্লাস", "রুটিন"))
        return classesForDay(ref || { dow: todayDow, offset: 0, label: "today" });

      return {
        say: "Sorry, I didn't understand that. I can help with classes, assignments, exams, rooms and teachers. Try:",
        items: ["When is my next class?", "What is due tomorrow?"]
      };
    }

    return { answer: answer };
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { createEngine: createEngine };
  else root.createEngine = createEngine;
})(typeof window !== "undefined" ? window : this);
