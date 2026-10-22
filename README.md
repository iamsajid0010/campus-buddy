# Campus Buddy

A voice-first university schedule assistant, built as a **simulated Alexa+ experience** for the
Build, Ship, Shape: Amazon Developer Hackathon (Alexa+ track, simulated-experience path).

Students can ask, by voice or text:

- "When is my next class?"
- "What classes do I have tomorrow?"
- "Which assignments are due this week?"
- "Where is CSE221?"
- "Who teaches CSE215?"
- "When is my next exam?"

## Project description

Campus Buddy is a conversational schedule assistant for university students, built as a simulated
Alexa+ experience in a web app. Instead of opening a portal or scrolling through screenshots of a
routine, a student simply asks, "When is my next class?" or "Which assignments are due this week?",
and the assistant answers out loud with the time, room, and teacher. It understands questions about
classes, assignments, exams, rooms and instructors in English, and recognizes common Bangla keywords.
All schedule data lives in a single editable data file, so any student can make it their own in
minutes, with no database or account. Campus Buddy shows how a voice assistant can remove everyday
friction for students who juggle many classes and deadlines.

## How it works

- `index.html` - the page: orb, chat, microphone button.
- `app.js` - the interface. Uses the browser's **Web Speech API** for voice input (speech recognition)
  and spoken replies (speech synthesis).
- `engine.js` - the assistant's logic. Understands a question with keyword and intent matching, then
  looks up the answer in the data and builds a spoken reply.
- `data.js` - **your schedule** (classes, assignments, exams). Sample data is included.

No server, no database, no API keys. Everything runs in the browser.

## Run it

1. Download or clone this repository.
2. Open `index.html` in **Google Chrome or Microsoft Edge** (voice input needs one of them).
3. Click the microphone and speak, or type a question.

Optional: serve it locally with `python -m http.server` and open `http://localhost:8000`.

## Use your own schedule

Open `data.js` and replace the sample courses, classes, assignments and exams. Days use
0 = Sunday ... 6 = Saturday, and times use 24-hour `"HH:MM"`.

## Limitations (honest notes)

- This is a **simulation** of an Alexa+ experience; it does not run on an Alexa device.
- Question understanding uses keyword matching, so unusual phrasings may not be understood.
- Spoken replies are in English. The Bangla microphone option understands Bangla keywords
  (for example the words for class, assignment, exam, today and tomorrow).

## License

MIT, see `LICENSE`.
