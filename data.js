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
//
//  Bangla replies: fields starting with "bn" (bn, teacherBn, bnTitle,
//  bnVenue, bnOrganizer, bnAbout) are used when the question is asked in
//  Bangla. If a bn field is missing, the English text is used instead.
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

const CAMPUS_ROOT = typeof window !== "undefined" ? window : globalThis;

CAMPUS_ROOT.CAMPUS_DATA = {
  student: "Student",

  // Lab groups. The routine lists both D1 and D2 for the lab courses.
  // Set each lab to the group YOU attend ("D1" or "D2"), and only those
  // classes will show. Delete this whole line to show both groups.
  myLabs: { CSE222: "D1", CSE216: "D1" },

  // name: replace the code with the full course title if you like.
  // aliases = other ways you might say the course (useful for voice).
  courses: [
    { code: "CSE221", name: "Object Oriented Programming", bn: "অবজেক্ট ওরিয়েন্টেড প্রোগ্রামিং", aliases: ["cse 221", "221", "oop", "object oriented", "ওওপি", "ও ও পি", "অবজেক্ট ওরিয়েন্টেড", "অবজেক্ট ওরিয়েন্টেড প্রোগ্রামিং"], teacher: "Md. Sazzadur Ahamed", teacherBn: "মোঃ সাজ্জাদুর আহমেদ" },
    { code: "CSE215", name: "Electronic Devices and Circuits", bn: "ইলেকট্রনিক ডিভাইসেস অ্যান্ড সার্কিটস", aliases: ["cse 215", "215", "edc", "electronic devices", "ইডিসি", "ইলেকট্রনিক ডিভাইস", "ইলেকট্রনিক ডিভাইসেস", "ইলেকট্রনিক ডিভাইসেস অ্যান্ড সার্কিটস"], teacher: "Najeeb Ahmed Bhuiyan", teacherBn: "নাজিব আহমেদ ভূঁইয়া" },
    { code: "AOL101", name: "Art of Living", bn: "আর্ট অব লিভিং", aliases: ["aol 101", "aol", "101", "আর্ট অফ লিভিং", "আর্ট অব লিভিং", "এওএল"], teacher: "Mahimul Islam Nadim", teacherBn: "মাহিমুল ইসলাম নাদিম" },
    { code: "CSE222", name: "Object Oriented Programming Lab", bn: "অবজেক্ট ওরিয়েন্টেড প্রোগ্রামিং ল্যাব", aliases: ["cse 222", "222", "oop lab", "ওওপি ল্যাব", "অবজেক্ট ওরিয়েন্টেড প্রোগ্রামিং ল্যাব"], teacher: "Z N M Zarif Mahmud", teacherBn: "জেড এন এম জারিফ মাহমুদ" },
    { code: "CSE216", name: "Electronic Devices and Circuits Lab", bn: "ইলেকট্রনিক ডিভাইসেস অ্যান্ড সার্কিটস ল্যাব", aliases: ["cse 216", "216", "edc lab", "electronic devices lab", "ইডিসি ল্যাব", "ইলেকট্রনিক ডিভাইস ল্যাব", "ইলেকট্রনিক ডিভাইসেস অ্যান্ড সার্কিটস ল্যাব"], teacher: "Najeeb Ahmed Bhuiyan", teacherBn: "নাজিব আহমেদ ভূঁইয়া" }
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
    { code: "CSE221", title: "Inheritance and Polymorphism Task", bnTitle: "ইনহেরিটেন্স ও পলিমরফিজম টাস্ক", due: inDays(2, "23:59") },
    { code: "AOL101", title: "Reflection Essay", bnTitle: "রিফ্লেকশন প্রবন্ধ", due: inDays(4, "17:00") },
    { code: "CSE215", title: "Diode Circuits Problem Set", bnTitle: "ডায়োড সার্কিট সমস্যা সেট", due: inDays(5, "23:59") },
    { code: "CSE222", title: "Lab Report 3", bnTitle: "ল্যাব রিপোর্ট ৩", due: inDays(6, "09:00") },
    { code: "CSE216", title: "Circuit Lab Report", bnTitle: "সার্কিট ল্যাব রিপোর্ট", due: inDays(9, "23:59") }
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
    { title: "Tech Talk: Careers in AI", bnTitle: "টেক টক: এআই ক্যারিয়ার", type: "Seminar", when: nextDay(4, 0, "10:00"), end: nextDay(4, 0, "12:00"),
      venue: "Main Auditorium", bnVenue: "মেইন অডিটোরিয়াম", organizer: "Department of CSE", bnOrganizer: "সিএসই বিভাগ",
      about: "Industry speakers on AI careers.", bnAbout: "এআই ক্যারিয়ার নিয়ে ইন্ডাস্ট্রি বক্তাদের আলোচনা।",
      aliases: ["tech talk", "ai careers", "career talk", "ai seminar", "টেক টক", "এআই ক্যারিয়ার"] },
    { title: "Web Development Workshop", bnTitle: "ওয়েব ডেভেলপমেন্ট ওয়ার্কশপ", type: "Workshop", when: nextDay(3, 0, "11:00"), end: nextDay(3, 0, "13:00"),
      venue: "Computer Lab G1-014", bnVenue: "কম্পিউটার ল্যাব G1-014", organizer: "Programming Club", bnOrganizer: "প্রোগ্রামিং ক্লাব",
      about: "Hands-on HTML, CSS and JavaScript.", bnAbout: "হাতে-কলমে এইচটিএমএল, সিএসএস ও জাভাস্ক্রিপ্ট শেখা।",
      aliases: ["web workshop", "web dev workshop", "ওয়েব ডেভেলপমেন্ট ওয়ার্কশপ", "ওয়েব ওয়ার্কশপ"] },
    { title: "Intra-University Programming Contest", bnTitle: "ইন্ট্রা-ইউনিভার্সিটি প্রোগ্রামিং কনটেস্ট", type: "Contest", when: nextDay(5, 1, "10:00"), end: nextDay(5, 1, "14:00"),
      venue: "Computer Lab G1-013", bnVenue: "কম্পিউটার ল্যাব G1-013", organizer: "Programming Club", bnOrganizer: "প্রোগ্রামিং ক্লাব",
      about: "Team-based problem solving contest.", bnAbout: "দলভিত্তিক সমস্যা সমাধানের প্রতিযোগিতা।",
      aliases: ["programming contest", "coding contest", "প্রোগ্রামিং কনটেস্ট", "প্রোগ্রামিং প্রতিযোগিতা"] },
    { title: "Campus Hackathon 2026", bnTitle: "ক্যাম্পাস হ্যাকাথন ২০২৬", type: "Hackathon", when: nextDay(6, 1, "09:00"), end: nextDay(6, 1, "18:00"),
      venue: "Innovation Lab", bnVenue: "ইনোভেশন ল্যাব", organizer: "Student Union", bnOrganizer: "স্টুডেন্ট ইউনিয়ন",
      about: "One-day build challenge for student teams.", bnAbout: "শিক্ষার্থী দলগুলোর জন্য একদিনের বিল্ড চ্যালেঞ্জ।",
      aliases: ["campus hackathon", "ক্যাম্পাস হ্যাকাথন"] }
  ]
};

// Node (used by the MCP server in /mcp): export the data.
if (typeof module !== "undefined" && module.exports) module.exports = CAMPUS_ROOT.CAMPUS_DATA;
