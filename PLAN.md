# Inbox agent prototype: build plan

13 Nov 2026 · status: P0 to P2 done; P3 next

The Inbox agent is a **concept**: a scripted chat panel docked in the Reltio Inbox that helps a
Data Steward Manager clear a batch of DCRs in one sitting. It prepares, explains and drafts; the
reviewer decides. It isn't a Reltio product and isn't part of Reltio AgentFlow. Every name and
number in it is demo data.

This repo is a copy of `reltio-review-dcr-prototype`, with its full history. The original is never
changed: its remote is `upstream`, and pushing to it is switched off.

Anything marked **Suggestion** is my proposal, not a settled fact. Section 10 lists what still
needs an answer before the phase that depends on it.

---

## 1. Sources

| Source | Where | What it settles |
|---|---|---|
| Inbox Agent: Review Flow | Claude Doc `181a133f-ce9b-4c02-9c46-afd615d4c613` | The seven stages, trust rules, failure table, copy examples. **The spec to build from** |
| Inbox Agent Prototype: Handover | Claude Doc `93ef9d11-88c3-4562-9327-5bf402f67466` | Decisions, demo data, build order, confidence logic |
| Agentic Workflow Plan | Claude Doc `5d1b894b-5822-4fe9-a76c-c6bc68675193` | Capabilities, autonomy levels, failure modes, 16 sample screens |
| Agentic UX Guide | Claude Doc `55c8b3d2-7045-48f2-9375-473dfb159942` | The 20 takeaways ("guide N" below) |
| This repo, as copied | `index.html`, `app.js`, `data.js`, `styles.css`, `design-system/` | What exists today (section 3) |
| Decisions in chat, 13 Nov | This plan | DCRs only; no 5D; setup |

---

## 2. Decisions

Settled unless Jyotirmayee changes them.

| # | Topic | Decision | Source |
|---|---|---|---|
| D1 | What it is | Portfolio concept, own case study, not tied to AgentFlow | Handover |
| D2 | Brain | Scripted: buttons plus a set of recognised phrases, each with a designed response. Anything else gets "I can't do that in this demo yet" with buttons for what it can do | Handover |
| D3 | Where | Panel docked right of the Inbox, aware of selected rows; slim rail while a task's review panel is open | Handover, Review Flow 5B |
| D4 | Answers | Cards with buttons, not long chat replies | Handover |
| D5 | Scope | **DCRs only.** Path 5D and the potential-match capabilities are out. Other task types stay visible in the Inbox but the agent doesn't act on them | Chat, 13 Nov |
| D6 | Core flow | Approve similar routine changes together in one plan | Handover |
| D7 | Plan size | At most 20 tasks; bigger groups split into several plans | Handover |
| D8 | Flagged items in a plan | Shown, visibly different, **unticked**, with "Review these myself" | Handover |
| D9 | Approvals | Final; a full confirmation that names every task | Handover |
| D10 | Assign | Light preview; result offers Change back | Handover |
| D11 | Drafts | Never sent until the reviewer sends them; marked as AI-written | Handover |
| D12 | Confidence signals | Advisory only; the riskiest check on a task wins; the signal never decides | Handover, section 6 |
| D13 | Never | Bulk-approve a flagged change; edit a proposed value; delete a proposed change; send for the reviewer; act beyond their permissions; hide what it did | Review Flow |
| D14 | Name | "Inbox agent" (working name); one constant in code | Chat, 13 Nov |
| D15 | Hosting | Static site, no build step; GitHub Pages stays off for now | Chat, 13 Nov |
| D16 | Urgent (Suggestion) | A task is urgent if it's due today or overdue. Priority High orders tasks but doesn't make them urgent | Chat, 13 Nov; Reltio docs show priority and due date but don't define urgent |
| D17 | Stage 1 (Suggestion) | Quiet grouping sits alongside task emails; it doesn't replace them | Chat, 13 Nov; Handover "No email brief" |
| D18 | Stage 7 (Suggestion) | A short session summary card that links to the Activity tab | Chat, 13 Nov |
| D19 | Line not to cross | If approving gets easier than reviewing, the agent has failed | Review Flow |
| D20 | Main DCR | Keep the repo's Groton-Mystic DCR as is: 8 changes, from the Figma file. Agent copy follows it: "8 changes. Company Type needs review. The Tax ID deletion has not enough signal. The other 6 look routine." The handover's 10-change version is not used | Q1, 13 Nov |
| D21 | Signal labels | **High confidence · Needs review · Not enough signal**, everywhere (Inbox panel, Review DCR, agent). Only the labels in `CONF` and `summaryText()` change; the data key stays `notvalidated` | Q1, 13 Nov |
| D22 | Reviewer | **alexander.kirsanov**, as in the repo and Figma. Task history reads "Approved by alexander.kirsanov with the Inbox agent". The handover's "Priya Nair" is not used | Q2, 13 Nov |
| D23 | Demo queue | The queue in 5.2, as drafted | Q5, 13 Nov |
| D24 | Country formats | Groton-Mystic keeps US → United States beside the 7 US → USA DCRs | Q3, 13 Nov |
| D26 | Panel look | **Option A:** answers are bordered cards on the neutral page surface, each with an AI label that opens "How this was made"; DS outline buttons. Not tinted (clashes with selected rows), not chat bubbles. Mock: `mocks/agent-panel-options.html` | Mock review, 13 Nov |
| D27 | Rail | While a review panel is open, the agent is a 56px rail: AI mark, run state, and a vertical "Back to your plan · N ready" button | Mock review, 13 Nov |
| D28 | Size | Docked panel 360px; below 900px a bottom sheet opened from an "Agent" button in the header | Q9, 13 Nov |
| D25 | Teammates | Added to the team as `maria` and `arjun.rao`, the repo's id style. Agent copy says "Maria" and "Arjun Rao". No surname invented for Maria | Q4, 13 Nov |

---

## 3. What the repo has today

Facts read from the code, so the plan builds on what's there.

| Area | Today | What the agent needs |
|---|---|---|
| Views | `#view-profile` (start) and `#view-inbox`, switched by `showView()` on `#profile` / `#inbox` hash | Agent lives in `#view-inbox` only |
| Inbox rows | `DEMO.tasks`: 25 static rows as arrays, mixed task types, Jan 2025 dates. `totalTasks: 100`. Sidebar counts 25 / 63 / 0 / 72 are hard-coded | One demo queue of task objects; every count derived from it |
| Reviewable DCRs | **One.** `state.fields` is seeded from `DEMO.fields` (Groton-Mystic, 8 changes). Row 0 is the only row that opens the review panel | Any DCR in the queue opens the same review panel and dialog |
| Inbox filters | Sidebar filters are static and `aria-hidden` (README: "not functional") | Real filters and chips, so stage 3 can visibly set them |
| Bulk bar | `#bulk-actions` shows on selection; actions announce "isn't part of this prototype yet" | Leave as is; the agent reads the selection |
| Review panel | `#review-panel`, absolute, 400px, right edge of `.app-body` | Must sit left of the agent rail |
| Review DCR dialog | `#review-dialog`, a modal `<dialog>`: the rest of the page is inert while open | Agent can't be used while it's open (see D3 note in section 6) |
| Confidence | `CONF`: `high` "High Confidence", `review` "Needs review", `notvalidated` "Not Validated". Summary text says "no signal" | Labels change to High confidence, Needs review, Not enough signal (D21) |
| Reviewer | `DEMO.user.reviewer = "alexander.kirsanov"`, initials "PH" | Kept (D22) |
| Workflow panel filters | Working: `WF_FIELDS`, `wfMatch()`, `activeFilters()`, `renderChips()` | Reuse this pattern for the Inbox filters |
| Dates | `TODAY` is the real date (`new Date()`) | A fixed demo date, so "due today" never drifts |
| AI mark | `icon("ai", n)` sparkle from the DS, used on confidence chips | Reuse on every agent card |
| Live region | `#live` + `announce()` | Reuse for agent messages |
| Standards | Keyboard path, focus return, Esc one layer at a time, `prefers-reduced-motion`, `forced-colors`, phone layouts | Same bar for the agent |

**Differences from the handover's demo data, settled:** the main DCR has 8 changes, not 10.
Company Type goes LLC → Green Corporation, not Corporation. The deleted Tax ID is 06-1234567, not
47-1234567. There is no Industry change. The repo's version wins (D20), and so does its reviewer
(D22).

---

## 4. File tree

New files keep the agent separate, so the diff against the original stays readable.

```
reltio-inbox-agent-prototype/
├── PLAN.md                 this plan
├── README.md               rewritten in P0: concept, demo data, how to try the agent
├── index.html              + agent panel markup in #view-inbox, + 3 scripts, + agent.css
├── styles.css              small edits only: .panel offset when the agent is docked
├── agent.css               NEW: agent panel, rail, cards, run states (tokens only)
├── data.js                 unchanged profile and history data; DEMO.tasks replaced by queue.js
├── queue.js                NEW: the one demo queue (section 5); every number comes from it
├── agent-script.js         NEW: intents, phrases, responses (section 7)
├── agent.js                NEW: panel UI, cards, plan and run engine, activity log
├── app.js                  refactored: review works on any DCR; Inbox filters; window.APP bridge
├── icons.js                + any DS icons the agent needs (stop, history), exported from Figma
├── design-system/          unchanged
└── checks/                 NEW (Suggestion): Playwright scripts for the section 9 gates
    ├── package.json        playwright as a dev dependency; the site itself still needs nothing
    ├── run-through.mjs
    ├── keyboard.mjs
    └── a11y.mjs            contrast scan, reduced motion, forced colours, phone view
```

Script order in `index.html`: `icons.js`, `data.js`, `queue.js`, `app.js`, `agent-script.js`,
`agent.js`.

---

## 5. Data model

### 5.1 The demo queue (`queue.js`)

```js
window.QUEUE = {
  demoToday: "2026-11-13",        // Suggestion: fixed demo date
  reviewer: "alexander.kirsanov",                       // D22
  team: [ /* user ids for assignee menus: the repo's team plus "maria" and "arjun.rao" (D25) */ ],
  tasks: [ /* Task, below */ ],
};

/** Task */
{
  id: "3nfvPH35",                 // DCR id
  type: "dcr",                    // "dcr" | "pm" | "rfd" | "auth" | "rdm"; agent acts on "dcr" only
  entity: "Groton-Mystic Falcons Ltd", entityId: "0KY7eHf", entityType: "Organisation",
  priority: "High",               // "High" | "Medium" | "Low" (repo's values)
  status: "In Review",            // repo's status set
  createdBy: "j.rivera@reltio.com", createdOn: "2026-11-12T16:20",
  due: "2026-11-13",
  assignee: "alexander.kirsanov",
  isNew: true,                    // arrived since yesterday
  group: "country-code",          // null | "country-code" | "address" | "spanish-address"
  fields: [ /* FieldChange, same shape as DEMO.fields today */ ],
  script: {                       // failure-mode hooks, demo only
    changesMidRun: false,         // skipped at recheck: "Changed since your plan"
    resolvedBy: null,             // e.g. "arjun.rao": "Already resolved by Arjun Rao"
    failsMidRun: false,           // result lists it as Failed
  },
}

/** FieldChange: unchanged from data.js */
{ id, label, change: "added"|"edited"|"deleted", original, proposed,
  confidence: "high"|"review"|"notvalidated", reasoning, draftCopy?, options? }
```

Derived, never stored:

- `taskSignal(task)`: the riskiest field wins. Order: `notvalidated` > `review` > `high`.
- `isUrgent(task)`: `task.due <= demoToday` (D16).
- `isRoutine(task)`: `taskSignal(task) === "high"`. Only routine tasks can be ticked in a plan.
- Sidebar counts, page range, brief numbers: computed from `QUEUE.tasks`.

### 5.2 The queue (approved, D23)

Built so every number in the Review Flow doc comes from one list.

| Group | DCRs | Signals | Used in |
|---|---|---|---|
| Groton-Mystic Falcons Ltd (existing DCR) | 1 | Needs review (Company Type), Not enough signal (Tax ID) | Stage 4, 5B, 5C. Due today |
| Country code US → USA | 7 | 6 high; 1 needs review (another source on that profile says CA, Canada) | Brief, 5A. One of the 6 changes mid-run |
| Address changes | 5 | All high | "Summarise these 5 address changes" |
| Spanish address tasks | 4 | All high | "Assign the Spanish address tasks to Maria" |
| Other routine DCRs | 7 | All high; one already resolved by Arjun Rao | "Approve everything", one due today |
| Other flagged DCR | 1 | Not enough signal | "Approve everything" |
| **Open DCRs in alexander.kirsanov's Inbox** | **25** | **22 routine, 3 flagged** | |
| Of which new since yesterday | 14 | | Brief |
| Of which due today | 2 | | Brief |
| Non-DCR rows kept from the original | about 6 | n/a | Shown, not acted on (D5) |

"Approve everything" then gives 22 routine changes in two plans (20 + 2, because of D7) and opens
the 3 flagged ones. Assign and approve don't overlap: the 4 Spanish tasks count among the 22
until they're assigned away.

### 5.3 Agent state (inside the one state object in `app.js`)

```js
state.agent = {
  view: "panel",          // "panel" | "rail" | "closed"; "sheet" on phones
  tab: "chat",            // "chat" | "activity"
  thread: [],             // Card[], newest last
  plans: {},              // { [planId]: { taskIds, ticked: Set, flagged: taskIds, createdAt } }
  runs: {},               // { [runId]: Run }
  activity: [],           // ActivityEntry[]
  returnTo: null,         // { planId, left } for the rail's "Back to your plan (3 left)"
};

/** Card */
{ id, kind, at, data, corrected: null }
// kind: "user" | "brief" | "suggest-order" | "clarify" | "summary" | "plan" | "confirm"
//     | "run" | "result" | "reject-preview" | "assign-preview" | "message-preview"
//     | "status" | "refusal" | "fallback" | "wrap-up"

/** Run */
{ id, planId, state: "working"|"needs-you"|"done"|"failed"|"stopped",
  items: [{ taskId, outcome: "pending"|"applied"|"skipped"|"failed"|"not-started", reason }] }

/** ActivityEntry */
{ at, action, by: "alexander.kirsanov with the Inbox agent", items, skipped, failed }
```

Task history adds a line "Approved by alexander.kirsanov with the Inbox agent" for each applied
task.

### 5.4 Bridge between `app.js` and `agent.js`

`app.js` keeps owning state and rendering. It exposes a small API, so `agent.js` never reaches
into the DOM it doesn't own.

```js
window.APP = {
  state: () => state,
  tasks: () => QUEUE.tasks,
  selection: () => [...state.selected],          // task ids
  setInboxFilters(f),                            // { q, type, priority, status, due, group }
  clearInboxFilters(),
  openTask(taskId, { fieldId }),                 // review panel on that field
  applyApproval(taskId) -> "applied"|"changed"|"resolved"|"failed",   // runs the recheck
  rejectField(taskId, fieldId, comment),
  assign(taskIds, userId), unassign(taskIds, userId),
  announce(msg), render(),
};
```

---

## 6. Screen and layout

### 6.1 Placement

`.app-body` today: `sidebar | main | #review-panel (absolute, right 0, 400px)`.

- **Panel**: a flex child at the right of `.app-body`, after `main`. Width 360px (Suggestion;
  add a component token `--agent-panel-width` in `agent.css` with a comment naming its source).
- **Rail**: 56px, shown while `#review-panel` is open. `#review-panel` gets
  `right: var(--agent-offset)`, so it opens left of the rail, not over it.
- **Review DCR dialog**: it's modal, so the agent is inert while it's open. 5B therefore lands in
  the review panel, not the dialog (Suggestion). The pencil still opens the full dialog for
  field-level reject, and the rail is back when it closes.
- **Below 900px**: the agent becomes a sheet over the Inbox, opened from a header button.
- **Below 640px**: full-screen sheet. Same cards, one column.

### 6.2 Panel parts

```
┌ Inbox agent  [AI]                  [Activity] [×] ┐
│ Scope line: "I can read, sort and draft. You     │
│ decide every approval."                           │
├───────────────────────────────────────────────────┤
│ thread of cards (brief, summary, plan, run ...)  │
│   each: AI mark (opens "How this was made"),     │
│   title, body, buttons; Stop on running cards     │
├───────────────────────────────────────────────────┤
│ [Ask about your tasks…]                   [Send]  │
│ Suggestion chips under the field                  │
└───────────────────────────────────────────────────┘
```

Rail: AI mark, run state dot, "Back to your plan (3 left)" as a vertical button with a tooltip.

### 6.3 Tokens

Agent styles use only tokens already in `design-system/tokens.css` or the app layer at the top
of `styles.css`. Starting set, all used in `styles.css` today:

| Use | Token |
|---|---|
| Panel surface, border, shadow | `--surface-page`, `--surface-default`, `--border-default-light`, `--shadow-panel` |
| Text | `--text-headings`, `--text-body`, `--app-muted-text`, `--app-action-text` |
| Spacing | `--scale-100` … `--scale-500` |
| Type | `--typography-body-sm`, `--typography-body-md`, `--typography-body-xsm-semibold`, `--fig-type-14-semibold` (panel title, as `.panel__title`) |
| Buttons | `.btn`, `.btn--primary`, `.btn--outline`, `.btn--approve`, `.btn--reject`, `--button-radius`, `--button-focus-ring-*` |
| Signals | `.conf--high`, `.conf--review`, `.conf--notvalidated` (reuse the chip as is) |
| Run states | Working `--icon-information`, Needs you `--icon-warning`, Done `--icon-success`, Failed `--icon-error`, Stopped `--icon-disabled` (same set as `.status__dot`) |
| Focus | `--border-focus` |
| Radius | `--radius-round`, `--field-radius` |

No raw colour values. A missing value becomes a token with a comment naming where it came from.

---

## 7. The scripted brain

`agent-script.js` holds a list of intents. Input is lower-cased and matched against phrase
patterns in order. Buttons call intents directly. No match → `fallback`.

| Intent | Example phrases | Response card | Level | Stage |
|---|---|---|---|---|
| `brief` | (on open), "what came in", "what's new" | brief | Prepare | 2 |
| `triage` | "what should I look at first" | suggest-order | Prepare | 3 |
| `filter` | "high-priority DCRs due this week", "show the country code ones" | sets filters + short card | Prepare | 3 |
| `clarify` | "the US ones", "approve those" with nothing selected | clarify (which tasks?) | Prepare | 3 |
| `summarise` | "summarise these", "what's risky in Groton-Mystic" | summary | Prepare | 4 |
| `explain-field` | "why is Company Type flagged" | summary (one line) | Prepare | 4 |
| `plan` | "handle the 7 together", "approve the country code changes" | plan | Plan | 5A |
| `confirm` | (button) | confirm → run → result | Plan | 5A |
| `open-field` | "open the Tax ID change", "open Company Type" | navigates; agent to rail | Prepare | 5B |
| `reject` | "reject the Tax ID deletion, ask for proof" | reject-preview | Propose | 5C |
| `assign` | "assign the Spanish address tasks to Maria" | assign-preview | Propose | 6 |
| `ask-requester` | "ask which document confirms this" | message-preview | Propose | 6 |
| `where-is` | "where is the request I rejected on Monday" | status | Prepare | 6 |
| `wrap-up` | "what's left", "wrap up" | wrap-up | Prepare | 7 |
| `approve-all` | "approve everything", "approve all" | refusal + two plans + opens 3 | Plan | any |
| `stop` | (button), "stop" | run → stopped | n/a | any |
| `matches` | "potential matches", "merge" | "Potential matches aren't in this demo yet." | n/a | D5 |
| `fallback` | anything else | "I can't do that in this demo yet." + buttons | n/a | any |

Confirmation rule, coded once in `agent.js`:

- Prepare: runs at once, no confirmation.
- Propose and can be undone (assign): light preview, then Change back on the result.
- Propose or Plan and final (approve, reject): full confirmation naming every task and saying it's
  final. Buttons: Go back · Approve 6 (the count is live).

---

## 8. Build phases

Each phase ends with its gate (section 9). Nothing in a later phase starts until its gate passes.

### P0 · Setup (this step)

1. Copy repo with history. **Done.**
2. Write `PLAN.md`. **This file.**
3. Settle the open items needed before P1 (Q1 to Q5). **Done**, see D20 to D25.
4. Rewrite `README.md` header: concept, demo data, original repo link. Update `<title>` and the
   proto chip to "Concept · demo data". **Done.**

Gate: Jyotirmayee approves this plan.

### P1 · One demo queue, and review for any DCR

No visible agent yet. The Inbox works as today, but from the new queue.

1. `queue.js` with the section 5.2 queue, labelled demo data. Remove `DEMO.tasks` and
   `totalTasks`.
2. `renderInbox()` reads `QUEUE.tasks`; sidebar counts and page range are derived.
3. Refactor review state from one DCR to many: `state.dcrs[taskId] = { fields, comments, extra,
   newAttrs, resolved }`, plus `state.current`. `field()`, `tally()`, `confCounts()`,
   `renderPanel()`, `renderReview()`, `resolve()` read `state.dcrs[state.current]`.
4. Every DCR row opens the review panel. Non-DCR rows stay inert, as today.
5. Working Inbox filters (task type, priority, status, due, search) with removable chips,
   reusing the `WF_FIELDS` / `wfMatch()` / `renderChips()` pattern.
6. Fixed demo date (`QUEUE.demoToday`) replaces the real date wherever "today" is used.
7. `window.APP` bridge (5.4).
8. Signal labels to High confidence, Needs review, Not enough signal in `CONF` and
   `summaryText()` (D21). Check the Review DCR info dialog and README copy use the same words.
9. Add `maria` and `arjun.rao` to the team list (D25).

Gate: the original README walkthrough (steps 1 to 13) still passes on Groton-Mystic; any other
DCR opens and resolves; counts match the queue.

**Done, 13 Nov.** How it was built, where it differs from the steps above:

- Step 3: `state.dcrs[id]` holds `fields, comments, extra, touched, newAttrs, resolved`. Those
  six keys on `state` are accessors onto `state.dcrs[state.current]`, so the review code reads
  `state.fields` as before and works on whichever DCR is open. `dcr` is a proxy onto the open
  DCR's header copy. The profile page always uses the Figma DCR (`MAIN`).
- Add attribute and Additional details need profile data, so only Groton-Mystic has them; other
  DCRs say "Profile details for … aren't part of this demo."
- Step 5: filters live in the Figma sidebar and apply on pick. A `group` filter has no sidebar
  control; only the agent sets it, and it shows as a chip.
- Step 7: the bridge has `state, tasks, today, selection, setInboxFilters, clearInboxFilters,
  openTask, announce, render`. `applyApproval`, `rejectField`, `assign` come with the phases
  that use them (P3 to P5).
- Counts: Inbox 31 (25 DCRs + 6 others), Team 0 until P5 assigns tasks away, All 31.
- Groton-Mystic keeps its Figma created date (Jan 2025); only its due date moved to the demo date.

Checked in the browser: queue numbers (25 / 22 / 3 / 14 / 2 / 7 with 6 high), keyboard filter
picks, search, chips, empty state, approve on a queue DCR, field reject and resubmit on
Groton-Mystic, profile Review DCR and View DCR, Open in Inbox, Reset demo, phone width, no
console errors.

### P2 · Agent panel shell

1. Markup in `index.html`, styles in `agent.css`, `agent.js` renders from `state.agent`.
2. Panel, rail, sheet; open, close, reopen from the header.
3. Card frame with AI mark and "How this was made" popover.
4. Input field, suggestion chips, phrase matching, fallback card.
5. Run card with the five states and Stop.
6. Activity tab.

Gate: fallback works for any input; Tab order panel ↔ Inbox is clean; rail swap when the review
panel opens.

**Done, 13 Nov.** As built:

- `agent.js` builds the panel into `<aside id="agent">` and keeps its state in `APP.state().agent`.
  It talks to the Inbox only through `window.APP` (added: `closeTask`, `taskOpen`, `myTasks`,
  `visibleTasks`, `isResolved`, `reviewer`) and listens for `app:panel` and `app:reset`.
- Views: docked at 360px; rail (56px) while a review panel is open, back to the panel when it
  closes; the rail's mark or the header button closes the task and brings the panel back (the full
  panel and a review panel never share the screen). Under 900px: closed on load, a bottom sheet
  with `role="dialog"`, the Inbox inert behind it, Esc or the scrim closes it.
- Chat and Activity are DS tabs (arrow keys). Cards: AI label button toggles "How this was made";
  kind, time, title, body, DS outline buttons. Your messages show right-aligned.
- Intents in P2: `show-all`, `activity`, `matches` (D5), and the fallback with buttons for what the
  build can do. Later phases add theirs to `agent-script.js`.
- Run engine `AGENT.startRun({ title, items, step })`: one item per 700ms, per-item outcome
  (applied, skipped, failed, not started), Stop finishes the current item, five states, ends in the
  Activity log ("confirmed by alexander.kirsanov with the Inbox agent"). P3 drives it.
- `window.AGENT` exposes `say, ask, runIntent, startRun, stopRun, open, close, state` for later
  phases and checks.

Checked in the browser: fallback and its buttons, show all, potential matches, AI label, a stopped
run (2 applied, 1 skipped, 3 not started) and its log entry, focus kept on Stop, rail swap and
return, close and reopen focus, tab arrows, Tab order, phone sheet (inert, Esc, scrim), Reset demo.
Found and fixed: a disabled Stop button dropped keyboard focus (now `aria-disabled`); the rail's
state label ignored `hidden`.

### P3 · Stage 2 (brief), 5A (approve together), the agent says no

1. Brief on first open: 14 new, 2 due today, 7 look alike (6 routine, 1 needs review). Buttons:
   Review the 2 due today · Handle the 7 together · Show all.
2. Plan card: 6 ticked, 1 unticked and flagged with its reason; "Review these myself"; count and
   "approvals are final".
3. Confirm card names the 6 again: Go back · Approve 6.
4. Run: per-item recheck; one task "Changed since your plan" is skipped.
5. Result card: applied and skipped, each linked to its task; Activity entry; task history line.
6. "Approve everything": refusal copy from the Review Flow doc; plans of 20 and 2; opens the 3.

Gate: section 9 gates on this path. **Check with Jyotirmayee before P4.**

### P4 · Stage 3, 4, 5B, 5C, Stop

1. Stage 3: triage order with one-line reasons; plain-words filter sets the Inbox filters
   visibly; "the US ones" gets a clarify card.
2. Stage 4: summary card for Groton-Mystic and for the 5 address changes; each line links to its
   task and field; "I can't verify this" where nothing can be checked.
3. 5B: opens the review panel on that field, highlights it; agent goes to rail with
   "Back to your plan (3 left)".
4. 5C: reject preview for one field, drafted comment marked AI-written and editable; only that
   field goes back; nothing sent until the reviewer sends it.
5. Stop on a running plan: finishes the current item, lists applied and not started.
6. Remaining failure modes: "Already resolved by Arjun Rao", a failed item, and correcting a card
   in place.

### P5 · Stage 6 (follow up) and stage 7 (wrap up)

1. Assign preview "4 tasks to Maria"; result with Change back.
2. Draft a message to the requester; reviewer sends it.
3. "Where is it?" status card from task history.
4. Wrap-up card: approved, rejected, assigned, skipped, waiting on requesters; link to Activity.

### P6 · Checks

The same bar as the Review DCR prototype: scripted run-through, keyboard only, phone view,
contrast scan, reduced motion, forced colours.

### P7 · Simulated walkthroughs (later)

Synthetic users, labelled **simulated walkthroughs**, never user testing. Personas and the four
checks are in the Review Flow doc. Note what changed.

**Dropped:** 5D (potential matches), D5.

---

## 9. Verification gates

| Check | How | Pass when |
|---|---|---|
| Original flow intact | `checks/run-through.mjs`, original README steps 1 to 13 | Every step behaves as before |
| Agent run-through | Same script, agent path per phase | Each card, count and state as specified |
| Numbers | Script reads every number on screen and recomputes it from `QUEUE` | No mismatch |
| Keyboard only | `checks/keyboard.mjs` | Every agent action reachable; focus moves into new cards and back; Esc closes one layer |
| Screen reader text | Live region text per card | Each new card is announced once, politely |
| Contrast | `checks/a11y.mjs` scans every visible text node | All text at WCAG AA |
| Reduced motion | Emulate `prefers-reduced-motion` | No animation; runs still show progress |
| Forced colours | Emulate `forced-colors: active` | Cards, chips and run states keep borders and meaning |
| Phone | 375px viewport | Sheet works; no horizontal scroll |
| Copy | Read every new string | Short, plain, no long dashes, no lone last word on wrapped labels |
| Labels | Look for "concept" and "demo data" | Visible on every agent screen |

---

## 10. Open items

| # | Question | Needed before | Suggestion |
|---|---|---|---|
| Q1 | Main DCR and signal labels | P1 | **Answered:** repo's 8 changes (D20); labels High confidence, Needs review, Not enough signal (D21) |
| Q2 | Reviewer | P1 | **Answered:** alexander.kirsanov (D22) |
| Q3 | US → United States beside US → USA | P1 | **Answered:** leave both (D24) |
| Q4 | Maria and Arjun Rao | P1 | **Answered:** `maria`, `arjun.rao` (D25) |
| Q5 | The queue in 5.2 | P1 | **Answered:** as drafted (D23) |
| Q6 | Urgent = due today or overdue (D16) | P3 | As drafted |
| Q7 | 5B lands in the review panel, not the modal dialog (6.1) | P4 | As drafted |
| Q8 | Add `checks/` with Playwright as a dev dependency (downloads a browser once) | P2 | Yes; the site itself still installs nothing |
| Q9 | Agent panel width 360px; phone sheet below 900px | P2 | **Answered:** as drafted, after the mock review (D26 to D28) |
| Q10 | Stage 1: show anything at all (one urgent line in the Inbox), or leave it to the case study? | P5 | One line, only for an urgent task |
| Q11 | Inbox filters sit in the sidebar, which the original hides below 1100px. On tablet and phone only the chips show | P2 | Leave as is; on small screens the agent's sheet is the way to filter |
