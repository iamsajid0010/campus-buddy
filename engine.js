// Campus Buddy - the "brain". Pure logic, no browser code, so it can be tested in Node.
(function (root) {
  "use strict";

  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const BN_DAYS = { "রবিবার": 0, "রোববার": 0, "সোমবার": 1, "মঙ্গলবার": 2, "বুধবার": 3, "বৃহস্পতিবার": 4, "শুক্রবার": 5, "শনিবার": 6 };

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

      function help() {
        return {
          say: "Hi! I'm Campus Buddy. I can tell you about your classes, assignments, exams, rooms and teachers. Try one of these:",
          items: [
            "When is my next class?",
            "What classes do I have tomorrow?",
            "Which assignments are due this week?",
            "Where is the Object Oriented Programming class held?",
            "When is my next exam?",
            "What events are coming up?"
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
          return { say: course.name + " (" + course.code + ") is taught by " + (course.teacher || "an instructor I don't have on file") + ".", items: [] };
        }
        if (!meets.length) return { say: "I don't have any class times for " + course.name + ".", items: [] };
        return {
          say: course.name + " meets " + plural(meets.length, "time") + " a week:",
          items: meets.map((c) => DAYS[c.day] + ", " + fmtTime(c.start) + " to " + fmtTime(c.end) + ", Room " + c.room)
        };
      }

      // ---- Campus events (seminars, hackathons, workshops...) ----
      function findEvent() {
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

      const eventLine = (x) => {
        const c = clashes(x.e);
        return x.e.title + " (" + x.e.type + "), " + whenLabel(x.d) + ", " + x.e.venue +
          (c.length ? " (clashes with your " + c.map((k) => cname(k.code)).join(" and ") + ")" : "");
      };

      function eventsAnswer(ev, ref) {
        if (ev) {
          const d = new Date(ev.when);
          const c = clashes(ev);
          const items = [];
          if (ev.organizer) items.push("Organized by " + ev.organizer);
          if (ev.about) items.push(ev.about);
          if (c.length) items.push("Heads up: this clashes with your " + c.map((k) => cname(k.code)).join(" and "));
          return {
            say: ev.title + " (" + ev.type + ") is " + whenLabel(d) + " at " + ev.venue + ".",
            items: items
          };
        }
        let list = (D.events || []).map((e) => ({ e: e, d: new Date(e.when) }))
          .filter((x) => x.d >= now).sort((a, b) => a.d - b.d);

        const types = [["seminar", "seminar"], ["talk", "seminar"], ["webinar", "seminar"], ["hackathon", "hackathon"],
          ["workshop", "workshop"], ["bootcamp", "workshop"], ["contest", "contest"], ["competition", "contest"], ["fest", "fest"],
          ["সেমিনার", "seminar"], ["হ্যাকাথন", "hackathon"], ["হ্যাকাথন", "hackathon"], ["ওয়ার্কশপ", "workshop"], ["কর্মশালা", "workshop"],
          ["কনটেস্ট", "contest"], ["প্রতিযোগিতা", "contest"], ["ফেস্ট", "fest"]];
        const t = types.find((p) => q.includes(p[0]));
        if (t) list = list.filter((x) => x.e.type.toLowerCase().includes(t[1]));

        let scope = "coming up";
        if (ref && (ref.label === "today" || ref.label === "tomorrow")) {
          list = list.filter((x) => dayDiff(x.d) === ref.offset); scope = ref.label;
        } else if (ref) {
          list = list.filter((x) => dayDiff(x.d) === ref.offset); scope = "on " + ref.label;
        } else if (has("next week", "পরের সপ্তাহ", "আগামী সপ্তাহ")) {
          list = list.filter((x) => dayDiff(x.d) >= 7 && dayDiff(x.d) < 14); scope = "next week";
        } else if (has("this week", "এই সপ্তাহ", "সপ্তাহে")) {
          list = list.filter((x) => dayDiff(x.d) < 7); scope = "this week";
        } else if (has("this month", "এই মাস")) {
          list = list.filter((x) => x.d.getMonth() === now.getMonth() && x.d.getFullYear() === now.getFullYear()); scope = "this month";
        }
        const noun = t ? t[1] + (t[1] === "fest" ? "s" : "s") : "event";
        if (!list.length) return { say: "I don't see any " + (t ? t[1] + "s" : "events") + " " + scope + ".", items: [] };
        list = list.slice(0, 6);
        return {
          say: "There " + (list.length === 1 ? "is 1 " + (t ? t[1] : "event") : "are " + list.length + " " + (t ? noun : "events")) + " " + scope + ":",
          items: list.map(eventLine)
        };
      }

      // ---- Understand the question (simple keyword matching) ----
      if (!q || has("help", "what can you do", "সাহায্য", "হেল্প")) return help();
      if (/^(hi|hello|hey|salam|assalamu|হ্যালো|হাই|সালাম|আসসালামু)/.test(q)) return help();

      const course = findCourse();
      const ref = dayRef();

      const ev = findEvent();
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
