// ============================================================
//  Campus Buddy - your data file.
//  Routine source: CSE Class Routine V4.1 (effective 03 October 2026),
//  sections 69_D (theory), 69_D1 and 69_D2 (labs).
//
//  day: 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday,
//       4 = Thursday, 5 = Friday, 6 = Saturday
//  Times use 24-hour format "HH:MM".
//  Teacher short codes in the routine: SZ, NAB, MIN, ZZM (full names below).
//  Assignments and exams below are SAMPLES - replace them with real ones.
// ============================================================

// Helper: returns a date-time string N days from today (so the sample
// assignments always look fresh). Use fixed dates like "2026-11-05T23:59"
// for your real data.
function inDays(n, time) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const p = (x) => String(x).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + (time || "23:59");
}

// Helper: the next given weekday (0=Sun..6=Sat), `weeks` extra weeks later,
// at the given time. Keeps sample events always in the future.
function nextDay(dow, weeks, time) {
  const d = new Date();
  let diff = (dow - d.getDay() + 7) % 7;
  if (diff === 0) diff = 7;
  return inDays(diff + 7 * (weeks || 0), time);
}

window.CAMPUS_DATA = {
  student: "Student",

  // Lab groups. The routine lists both D1 and D2 for the lab courses.
  // Set each lab to the group YOU attend ("D1" or "D2"), and only those
  // classes will show. Delete this whole line to show both groups.
  myLabs: { CSE222: "D1", CSE216: "D1" },

  // name: replace the code with the full course title if you like.
  // aliases = other ways you might say the course (useful for voice).
  courses: [
    { code: "CSE221", name: "Object Oriented Programming", aliases: ["cse 221", "221", "oop", "object oriented"], teacher: "Md. Sazzadur Ahamed" },
    { code: "CSE215", name: "Electronic Devices and Circuits", aliases: ["cse 215", "215", "edc", "electronic devices"], teacher: "Najeeb Ahmed Bhuiyan" },
    { code: "AOL101", name: "Art of Living", aliases: ["aol 101", "aol", "101"], teacher: "Mahimul Islam Nadim" },
    { code: "CSE222", name: "Object Oriented Programming Lab", aliases: ["cse 222", "222", "oop lab"], teacher: "Z N M Zarif Mahmud" },
    { code: "CSE216", name: "Electronic Devices and Circuits Lab", aliases: ["cse 216", "216", "edc lab", "electronic devices lab"], teacher: "Najeeb Ahmed Bhuiyan" }
  ],

  // Weekly class routine. "lab" marks the lab group (D1 / D2).
  classes: [
    // Sunday
    { day: 0, start: "08:30", end: "10:00", code: "CSE221", room: "KT-216" },
    { day: 0, start: "10:00", end: "11:30", code: "AOL101", room: "KT-218" },
    { day: 0, start: "11:30", end: "14:30", code: "CSE222", room: "G1-014 Computer Lab", lab: "D2" },
    // Monday
    { day: 1, start: "08:30", end: "11:30", code: "CSE222", room: "G1-013 Computer Lab", lab: "D1" },
    // Tuesday
    { day: 2, start: "08:30", end: "10:00", code: "CSE221", room: "KT-216" },
    { day: 2, start: "10:00", end: "11:30", code: "AOL101", room: "KT-517(A)" },
    { day: 2, start: "13:00", end: "14:30", code: "CSE215", room: "KT-216" },
    // Thursday
    { day: 4, start: "08:30", end: "11:30", code: "CSE216", room: "KT-810 Circuits Lab", lab: "D1" },
    { day: 4, start: "11:30", end: "13:00", code: "CSE215", room: "KT-305" },
    { day: 4, start: "14:30", end: "17:30", code: "CSE216", room: "KT-810 Circuits Lab", lab: "D2" }
  ],

  // Assignments (SAMPLE - dates are relative to today)
  assignments: [
    { code: "CSE221", title: "Inheritance and Polymorphism Task", due: inDays(2, "23:59") },
    { code: "AOL101", title: "Reflection Essay", due: inDays(4, "17:00") },
    { code: "CSE215", title: "Diode Circuits Problem Set", due: inDays(5, "23:59") },
    { code: "CSE222", title: "Lab Report 3", due: inDays(6, "09:00") },
    { code: "CSE216", title: "Circuit Lab Report", due: inDays(9, "23:59") }
  ],

  // Exams (SAMPLE)
  exams: [
    { code: "AOL101", type: "Quiz", when: inDays(4, "10:00"), room: "KT-517(A)" },
    { code: "CSE215", type: "Quiz", when: inDays(11, "13:00"), room: "KT-216" },
    { code: "CSE221", type: "Midterm", when: inDays(16, "08:30"), room: "KT-216" }
  ],

  // Campus events: seminars, hackathons, workshops, contests, fests.
  // SAMPLE events - replace with real ones. Fields:
  //   title, type, when (start), end (optional), venue, organizer (optional),
  //   about (optional), aliases (other names people may say).
  // Use fixed dates like "2026-11-07T10:00" for real events.
  events: [
    { title: "Tech Talk: Careers in AI", type: "Seminar", when: nextDay(4, 0, "10:00"), end: nextDay(4, 0, "12:00"),
      venue: "Main Auditorium", organizer: "Department of CSE", about: "Industry speakers on AI careers.",
      aliases: ["tech talk", "ai careers", "career talk", "ai seminar"] },
    { title: "Web Development Workshop", type: "Workshop", when: nextDay(3, 0, "11:00"), end: nextDay(3, 0, "13:00"),
      venue: "Computer Lab G1-014", organizer: "Programming Club", about: "Hands-on HTML, CSS and JavaScript.",
      aliases: ["web workshop", "web dev workshop"] },
    { title: "Intra-University Programming Contest", type: "Contest", when: nextDay(5, 1, "10:00"), end: nextDay(5, 1, "14:00"),
      venue: "Computer Lab G1-013", organizer: "Programming Club", about: "Team-based problem solving contest.",
      aliases: ["programming contest", "coding contest"] },
    { title: "Campus Hackathon 2026", type: "Hackathon", when: nextDay(6, 1, "09:00"), end: nextDay(6, 1, "18:00"),
      venue: "Innovation Lab", organizer: "Student Union", about: "One-day build challenge for student teams.",
      aliases: ["campus hackathon"] }
  ]
};
