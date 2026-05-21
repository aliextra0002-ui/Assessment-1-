1. How to Run
No installation required. Steps on a fresh machine:
Download the project folder containing:
index.html
style.css
script.js
Open index.html directly in any modern browser (Chrome, Firefox, Edge, Safari)
The app runs instantly — no terminal, no npm, no build tools needed
2. Stack & Design Choices
Why Vanilla HTML/CSS/JS?
A Pomodoro timer is a self-contained UI with no external data, routing, or complex state tree. Reaching for React or Vue would add build tooling and abstraction with zero benefit. Vanilla JS keeps the code direct, fast, and easy to inspect — the entire app is three files a judge can read in minutes.
Visual Decision 1 — The SVG Ring takes ~55% of the viewport height on mobile
The ring is the core of the app — it tells the user at a glance how much time is left without them needing to read the numbers. Sizing it to dominate the screen (using clamp(220px, 60vw, 280px)) means even a quick glance from across the desk communicates progress. A small ring would make the app feel like a widget; a large ring makes it feel like a dedicated focus tool.
Visual Decision 2 — Color shifts entirely between Focus and Break modes
Rather than just changing a label, the entire app's accent color transitions from blue (#3b82f6) during focus to green (#10b981) during break. The ring glow, the start button gradient, and the phase label all change together. This gives the user an unmistakable environmental cue — "the screen looks different, so my task has changed" — without needing to read any text.
3. Responsive & Accessibility
360px phone vs 1440px laptop:
All sizing uses clamp() — the timer ring, font sizes, and padding scale fluidly between breakpoints
On 360px: the ring shrinks to ~220px, tabs stack tightly, history box scrolls internally — nothing overflows or gets cut off
On 1440px: the app centers in a max-width 500px column, breathing room increases via padding, the ring expands to 280px
Tested at 360px, 414px, 768px, and 1440px widths
Accessibility handled — aria-label on icon buttons:
The Start and Reset buttons use icon characters (▶ ↺) which have no readable text. Both have aria-label="Start Timer" and aria-label="Reset Timer" so screen readers announce them correctly instead of reading a raw symbol.
Accessibility skipped — keyboard focus styles:
The default browser focus ring was not visually customized. A user navigating by keyboard would see the browser's default outline, which may be inconsistent across browsers. With more time I would add a visible :focus-visible ring styled to match the app's blue accent color.
4. AI Usage
Tool used: Claude (Anthropic)
What I asked
What it gave me
Generate the full Pomodoro timer in HTML/CSS/JS
Complete working three-file app
Add sound on session end
Web Audio API playBeep + playDone functions
Make it responsive with blue color scheme
clamp()-based sizing, CSS variables, blue/green theme
One specific change I made:
The AI generated the history list as a simple <ul> with static padding. I changed the history items to include a flex layout with a circular check badge on the left, the session label in the middle, and the timestamp right-aligned. The AI's version put all three pieces in one string inside a single <li> — readable but not visually structured. Splitting them into .check, .info, and .time-stamp divs inside a flex container made the history scannable at a glance, which matters when you have 6–8 entries stacked.
5. Honest Gap
The settings panel is missing.
The brief says focus and break durations should be configurable, but the current build hard-codes 25 min and 5 min. A ⚙ settings button exists conceptually but was not implemented.
What I would do with another day:
Add a small slide-down settings panel triggered by a gear icon in the header. It would have two number inputs — "Focus minutes" and "Break minutes" — with validation (min 1, max 60). On save, the timer would reset to the new values and persist the preference in localStorage so the custom durations survive a page reload. This is a ~30-line JS addition and would make the app fully match the spec.