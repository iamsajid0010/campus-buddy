# Campus Buddy

A voice-first university schedule assistant, built as a **simulated Alexa+ experience** for the
Build, Ship, Shape: Amazon Developer Hackathon (Alexa+ track), in **English and Bangla (বাংলা)**.
It also ships as a **self-hosted MCP server** (Streamable HTTP, spec 2025-11-25) so any MCP client
or agent can use the same assistant.

**Live demo:** https://iamsajid0010.github.io/campus-buddy/ (use Chrome or Edge for voice)

Students can ask, by voice or text:

| English | বাংলা |
|---|---|
| "When is my next class?" | "আমার পরের ক্লাস কখন?" |
| "What classes do I have tomorrow?" | "কাল আমার কী কী ক্লাস আছে?" |
| "Which assignments are due this week?" | "এই সপ্তাহে কোন অ্যাসাইনমেন্ট জমা দিতে হবে?" |
| "Where is the Object Oriented Programming class held?" | "অবজেক্ট ওরিয়েন্টেড প্রোগ্রামিং ক্লাস কোথায় হয়?" |
| "Who is the instructor for Electronic Devices and Circuits?" | "ইলেকট্রনিক ডিভাইসেস অ্যান্ড সার্কিটস এর শিক্ষক কে?" |
| "When is my next exam?" | "আমার পরের পরীক্ষা কবে?" |
| "What events are coming up?" | "আসছে কী কী ইভেন্ট আছে?" |
| "Are there any hackathons this month?" | "এই মাসে কি কোনো হ্যাকাথন আছে?" |
| "Where is the Tech Talk being held?" | "টেক টক কোথায় হচ্ছে?" |

**Campus events:** it also answers questions about seminars, workshops, contests, hackathons and
fests: when, where, who organizes them. It checks each event against the student's class routine
and warns about clashes, e.g. "clashes with your Electronic Devices and Circuits Lab".

## Project description

Campus Buddy is a conversational schedule assistant for university students, built as a simulated
Alexa+ experience in a web app. Instead of opening a portal or scrolling through screenshots of a
routine, a student simply asks, "When is my next class?" or "Which assignments are due this week?",
and the assistant answers out loud with the time, room, and teacher. It also tracks campus events
such as tech seminars, workshops, contests and hackathons, tells students when and where they are,
and warns them when an event clashes with one of their classes.

It works in English and Bangla: ask in Bangla (by voice or text) and it answers in Bangla, with
Bangla times ("সকাল ৮:৩০"), Bangla digits and day names, and spoken replies when the browser has a
Bangla voice. All schedule data lives in a single editable data file, so any student can make it
their own in minutes, with no database or account. The same logic is also exposed as an MCP server
with eight read-only tools, so an agent can answer "do I have a clash with the Tech Talk?" through
the open standard that Alexa+ integrations use. Campus Buddy shows how a voice assistant can remove
everyday friction for students who juggle many classes and deadlines, in their own language.

## How it works

- `index.html` - the page: orb, chat, microphone button.
- `app.js` - the interface. Uses the browser's **Web Speech API** for voice input (speech recognition)
  and spoken replies (speech synthesis). Replies come back in the language of the question.
- `engine.js` - the assistant's logic. Understands a question with keyword and intent matching, then
  looks up the answer in the data and builds a reply in English or Bangla. Pure logic, so it runs in
  the browser and in Node.
- `data.js` - **your schedule** (classes, assignments, exams, campus events). The class routine comes
  from a real department routine; assignments, exams and events are **sample data** to replace.
  Fields starting with `bn` hold the Bangla names.
- `mcp/` - the MCP server (see below). It imports `engine.js` and `data.js`, so the web app and the
  MCP tools always agree.

The web app needs no server, no database and no API keys. Everything runs in the browser.

## Run the web app

1. Download or clone this repository.
2. Open `index.html` in **Google Chrome or Microsoft Edge** (voice input needs one of them).
3. Click the microphone and speak, or type a question. Pick **বাংলা** in the language menu for Bangla.

Optional: serve it locally with `python -m http.server` and open `http://localhost:8000`.

## MCP server (self-hosted, Streamable HTTP)

```bash
cd mcp
npm install
TZ=Asia/Dhaka npm start        # http://127.0.0.1:3333/mcp   (health check: /health)
```

- Transport: **Streamable HTTP**, endpoint `POST /mcp`, stateless. Built with the official
  `@modelcontextprotocol/sdk`; the protocol version `2025-11-25` is negotiated (older clients are
  supported by the SDK).
- Binds to `127.0.0.1` by default and rejects browser requests from foreign origins (DNS-rebinding
  guard). Set `HOST`, `PORT` or `ALLOWED_ORIGINS` to change that.
- All tools are read-only and return both readable text and structured content (`say`, `items`, `language`).

| Tool | What it does |
|---|---|
| `ask_campus_buddy` | Any free-form question, English or Bangla (language auto-detected) |
| `next_class` | The next class, with room and teacher |
| `classes_on_day` | Classes on `today`, `tomorrow` or a weekday |
| `assignments_due` | Upcoming assignments, optionally by course and/or day |
| `next_exam` | The next exam or quiz, optionally for one course |
| `upcoming_events` | Seminars, workshops, contests, hackathons, with clash warnings; filter by type and window |
| `course_info` | A course's teacher, or its days, times and rooms |
| `check_event_clash` | Whether an event overlaps any class, with the clashing classes listed |

Every tool takes an optional `language` (`en` or `bn`) and an optional `now` (ISO date-time, for testing).

Try it with plain HTTP:

```bash
curl -s localhost:3333/mcp -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"next_class","arguments":{"language":"bn"}}}'
```

Or point any MCP client at `http://127.0.0.1:3333/mcp` (for example the MCP Inspector:
`npx @modelcontextprotocol/inspector`, transport "Streamable HTTP").

## Tests

```bash
node test/engine.test.js        # engine: every suggestion in English and Bangla, clash detection
cd mcp && npm install && npm test   # MCP: starts the server and calls every tool with the official MCP client
```

## Use your own schedule

Open `data.js` and replace the sample courses, classes, assignments and exams. Days use
0 = Sunday ... 6 = Saturday, and times use 24-hour `"HH:MM"`. Add the `bn...` fields if you want
Bangla replies to use Bangla names; without them the English text is used.

## Limitations (honest notes)

- This is a **simulation** of an Alexa+ experience; it does not run on an Alexa device. The MCP server
  follows the open MCP spec, but it has not been registered with or tested on a real Alexa+ device.
- Question understanding uses keyword matching, so unusual phrasings may not be understood.
- Bangla **spoken** replies need a Bangla voice installed in the browser (Microsoft Edge often includes
  one). Without it, Bangla replies are shown as text and the app says so once.
- Bangla course and teacher names in `data.js` are transliterations; check the spellings.
- Assignments, exams and events are sample data. The MCP server computes sample dates when it starts.

## License

MIT, see `LICENSE`.
