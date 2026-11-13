/*
 * Inbox agent panel (PLAN.md 5.3, 6, D26 to D28). Concept, scripted, demo data only.
 *
 * The agent's state lives in the app's one state object (APP.state().agent) and the panel is
 * rendered from it. agent.js never touches the Inbox DOM; it goes through window.APP.
 *   view: "panel" (docked, or a bottom sheet on small screens) | "rail" (while a task is open) | "closed"
 * Cards: brief, status, fallback, run, ... Every card carries an AI label that opens
 * "How this was made". Runs go item by item, can be stopped, and end in the Activity log.
 */
(function () {
  "use strict";

  const APP = window.APP, SCRIPT = window.AGENT_SCRIPT, icon = window.icon;
  const NAME = "Inbox agent"; // working name (D14)
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  const small = window.matchMedia("(max-width: 900px)");
  const STEP_MS = 700; // one item per step, so the reviewer can follow and stop a run

  const KIND = { status: "Answer", fallback: "Answer", run: "Run" };
  const RUN_STATE = { working: "Working", "needs-you": "Needs you", done: "Done", failed: "Failed", stopped: "Stopped" };
  const OUTCOME = { pending: "Waiting", working: "Working", applied: "Applied", skipped: "Skipped", failed: "Failed", "not-started": "Not started" };
  const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
  const clock = () => new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  const root = $("#agent"), toggle = $("#ag-toggle"), scrim = $("#ag-scrim");
  const S = () => APP.state().agent;
  let seq = 0;

  const fresh = () => ({ view: small.matches ? "closed" : "panel", railAuto: false, tab: "chat", thread: [], runs: {}, activity: [], plans: {}, returnTo: null });

  // ---------- Static frame ----------
  root.innerHTML = `
    <div class="ag__grab" aria-hidden="true"></div>
    <div class="ag__panel" id="ag-panel">
      <header class="ag__head">
        <span class="ag__mark" aria-hidden="true">${icon("ai", 18)}</span>
        <h2 class="ag__title" id="ag-title" tabindex="-1">${NAME}</h2>
        <span class="ag__tag">Concept</span>
        <span class="ag__sp"></span>
        <button type="button" class="icon-btn" id="ag-close" aria-label="Close ${NAME}">${icon("close", 20)}</button>
      </header>
      <div class="panel__tabs ag__tabs" role="tablist" aria-label="${NAME}">
        <button type="button" class="panel-tab" role="tab" id="ag-tab-chat" aria-controls="ag-chat" data-tab="chat">Chat</button>
        <button type="button" class="panel-tab" role="tab" id="ag-tab-activity" aria-controls="ag-activity" data-tab="activity">Activity<span class="ag__count" id="ag-act-n"></span></button>
      </div>
      <section class="ag__pane" id="ag-chat" role="tabpanel" aria-labelledby="ag-tab-chat">
        <p class="ag__scope">I can read, sort and draft. You decide every approval.</p>
        <div class="ag__thread" id="ag-thread" tabindex="-1" aria-label="Conversation"></div>
        <div class="ag__foot">
          <div class="ag-sugg" id="ag-sugg" role="group" aria-label="Suggestions"></div>
          <form class="rail__input" id="ag-form" autocomplete="off">
            <label class="sr-only" for="ag-input">Ask the ${NAME}</label>
            <input type="text" id="ag-input" placeholder="Ask about your tasks" enterkeyhint="send">
            <button type="submit" class="send-btn" aria-label="Send">${icon("send", 14)}</button>
          </form>
        </div>
      </section>
      <section class="ag__pane ag__pane--activity" id="ag-activity" role="tabpanel" aria-labelledby="ag-tab-activity" tabindex="0" hidden></section>
    </div>
    <div class="ag-rail" id="ag-rail" hidden>
      <button type="button" class="ag-rail__mark" data-act="open" aria-label="Open ${NAME}">${icon("ai", 20)}</button>
      <p class="ag-rail__state" id="ag-rail-state" hidden></p>
      <button type="button" class="ag-rail__back" id="ag-rail-back" data-act="back" hidden></button>
    </div>`;
  const thread = $("#ag-thread"), input = $("#ag-input");

  // ---------- View: panel, rail, sheet, closed ----------
  const INERT_WHEN_SHEET = [".app-header", ".sidebar", "#main", "#review-panel", ".proto-chip"];
  function applyView() {
    const ag = S(), isSmall = small.matches;
    const sheet = isSmall && ag.view === "panel";
    const rail = !isSmall && ag.view === "rail";
    root.hidden = ag.view === "closed" || (isSmall && ag.view === "rail");
    root.classList.toggle("is-rail", rail);
    root.classList.toggle("is-sheet", sheet);
    $("#ag-panel").hidden = rail;
    $("#ag-rail").hidden = !rail;
    document.body.classList.toggle("has-ag-rail", rail);
    scrim.hidden = !sheet;
    if (sheet) { root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); }
    else { root.removeAttribute("role"); root.removeAttribute("aria-modal"); }
    INERT_WHEN_SHEET.forEach((s) => { const el = $(s); if (el) el.inert = sheet; });
    toggle.setAttribute("aria-expanded", String(ag.view === "panel"));
  }
  function open({ focus = true } = {}) {
    const ag = S();
    if (APP.taskOpen()) APP.closeTask(); // the full panel and a task's review panel never share the screen
    ag.view = "panel"; ag.railAuto = false;
    render();
    if (focus) (ag.tab === "chat" ? input : $("#ag-tab-activity")).focus();
  }
  function close() {
    S().view = "closed";
    render();
    toggle.focus();
  }

  // ---------- Thread ----------
  function say(card) {
    const c = { id: `c${++seq}`, at: clock(), howOpen: false, ...card };
    S().thread.push(c);
    renderThread();
    if (c.kind !== "user") APP.announce(`${NAME}: ${c.title}.${c.body ? ` ${c.body}` : ""}`);
    return c;
  }
  function you(text) { say({ kind: "user", text }); }

  const ctx = {
    app: APP,
    say,
    canDo: () => SCRIPT.offers,
    showTab: (t) => setTab(t, true),
    startRun: (o) => startRun(o),
  };
  function ask(text) {
    const t = text.trim(); if (!t) return;
    you(t);
    const intent = SCRIPT.match(t);
    intent ? intent.run(ctx) : SCRIPT.fallback(ctx);
  }
  function runIntent(id, label) {
    const intent = SCRIPT.byId(id); if (!intent) return;
    you(label);
    intent.run(ctx);
  }

  function cardHTML(c) {
    if (c.kind === "user") return `<p class="ag-you" id="card-${c.id}"><span class="sr-only">You said: </span>${esc(c.text)}</p>`;
    const run = c.runId ? S().runs[c.runId] : null;
    return `
      <article class="ag-card ag-card--${c.kind}" id="card-${c.id}" aria-labelledby="t-${c.id}">
        <div class="ag-card__head">
          <button type="button" class="ag-ai" data-how="${c.id}" aria-expanded="${c.howOpen}" aria-controls="how-${c.id}">${icon("ai", 12)}AI<span class="sr-only">: how this was made</span></button>
          <span class="ag-card__kind">${KIND[c.kind] || "Answer"}</span>
          <span class="ag-card__time">${esc(c.at)}</span>
        </div>
        <p class="ag-how" id="how-${c.id}" ${c.howOpen ? "" : "hidden"}>${esc(c.how || "")}</p>
        <h3 class="ag-card__title" id="t-${c.id}">${esc(c.title)}</h3>
        ${c.body ? `<p class="ag-card__body">${esc(c.body)}</p>` : ""}
        ${run ? runHTML(run) : ""}
        ${c.buttons && c.buttons.length ? `<div class="ag-actions">${c.buttons.map((b) =>
          `<button type="button" class="btn btn--outline" data-intent="${esc(b.intent)}">${esc(b.label)}</button>`).join("")}</div>` : ""}
      </article>`;
  }
  function renderThread() {
    const atEnd = thread.scrollHeight - thread.scrollTop - thread.clientHeight < 40;
    thread.innerHTML = S().thread.length ? S().thread.map(cardHTML).join("")
      : `<p class="ag-empty">Ask about your tasks, or pick a suggestion below.</p>`;
    if (atEnd || S().thread.length <= 2) thread.scrollTop = thread.scrollHeight;
  }
  // Re-render one card in place (a run updating), keeping focus where it was
  function updateCard(id) {
    const el = $(`#card-${id}`); if (!el) return;
    const c = S().thread.find((x) => x.id === id);
    const hadFocus = el.contains(document.activeElement) ? document.activeElement : null;
    const key = hadFocus && (hadFocus.dataset.stop ? `[data-stop]` : hadFocus.dataset.how ? `[data-how]` : null);
    el.outerHTML = cardHTML(c);
    if (hadFocus) { const n = $(`#card-${id}`); ((key && n.querySelector(key)) || thread).focus(); }
  }

  // ---------- Runs: one item at a time, stoppable, logged ----------
  // step(item) returns { outcome: "applied"|"skipped"|"failed", reason } for that item.
  function startRun({ title, how, items, step, verb = "applied" }) {
    const ag = S();
    const run = { id: `r${++seq}`, title, verb, state: "working", stop: false, at: 0,
      items: items.map((it) => ({ ...it, outcome: "pending", reason: "" })) };
    ag.runs[run.id] = run;
    const card = say({ kind: "run", runId: run.id, title, how: how || "Each item is checked again just before it's applied. You can stop at any time." });
    run.cardId = card.id;
    const tick = (i) => {
      if (S() !== ag) return; // the demo was reset
      if (i >= run.items.length || run.stop) return finish(run, i);
      run.at = i; run.items[i].outcome = "working";
      updateCard(run.cardId); renderRail();
      setTimeout(() => {
        if (S() !== ag) return;
        Object.assign(run.items[i], { outcome: "applied", reason: "" }, step ? step(run.items[i]) : null);
        tick(i + 1);
      }, STEP_MS);
    };
    tick(0);
    return run;
  }
  const counts = (run) => run.items.reduce((m, it) => ({ ...m, [it.outcome]: (m[it.outcome] || 0) + 1 }), {});
  function countLine(run) {
    const c = counts(run);
    return [["applied", run.verb], ["skipped", "skipped"], ["failed", "failed"], ["not-started", "not started"]]
      .filter(([k]) => c[k]).map(([k, l]) => `${c[k]} ${l}`).join(" · ");
  }
  function finish(run, i) {
    run.items.slice(i).forEach((it) => { if (it.outcome === "pending" || it.outcome === "working") it.outcome = "not-started"; });
    const c = counts(run);
    run.state = run.stop ? "stopped" : !c.applied && c.failed ? "failed" : "done";
    S().activity.unshift({ at: clock(), title: run.title, by: `${APP.reviewer()} with the ${NAME}`, state: run.state, line: countLine(run),
      items: run.items.map((it) => ({ label: it.label, outcome: it.outcome, reason: it.reason })) });
    updateCard(run.cardId); renderActivity(); renderRail();
    APP.announce(`${run.title}: ${RUN_STATE[run.state]}. ${countLine(run)}.`);
  }
  function runHTML(run) {
    const done = run.items.filter((it) => !["pending", "working"].includes(it.outcome)).length;
    return `
      <div class="ag-run ag-run--${run.state}">
        <p class="ag-run__state"><span class="ag-run__dot" aria-hidden="true"></span><span>${RUN_STATE[run.state]}</span>
          <span class="ag-run__count">${run.state === "working" ? `${done} of ${run.items.length}` : esc(countLine(run))}</span></p>
        <ol class="ag-run__items">${run.items.map((it) => `
          <li class="ag-run__item is-${it.outcome}"><span class="ag-run__label">${esc(it.label)}</span>
            <span class="ag-run__outcome">${OUTCOME[it.outcome]}${it.reason ? `: ${esc(it.reason)}` : ""}</span></li>`).join("")}</ol>
        ${run.state === "working" ? `<button type="button" class="btn btn--outline ag-stop" data-stop="${run.id}" ${run.stop ? 'aria-disabled="true"' : ""}>${run.stop ? "Stopping after this one" : "Stop"}</button>` : ""}
      </div>`;
  }
  function stopRun(id) {
    const run = S().runs[id]; if (!run || run.state !== "working" || run.stop) return;
    run.stop = true;
    updateCard(run.cardId);
    APP.announce("Stopping after the current item.");
  }

  // ---------- Activity ----------
  function renderActivity() {
    const log = S().activity;
    $("#ag-act-n").textContent = log.length ? ` (${log.length})` : "";
    $("#ag-activity").innerHTML = log.length ? `<ol class="ag-log">${log.map((e) => `
      <li class="ag-log__item">
        <p class="ag-log__head"><strong>${esc(e.title)}</strong><span>${esc(e.at)}</span></p>
        <p class="ag-log__by">${RUN_STATE[e.state]} · confirmed by ${esc(e.by)}</p>
        <p class="ag-log__line">${esc(e.line)}</p>
        <ul class="ag-log__items">${e.items.map((it) => `<li>${esc(it.label)}: ${OUTCOME[it.outcome]}${it.reason ? `, ${esc(it.reason)}` : ""}</li>`).join("")}</ul>
      </li>`).join("")}</ol>`
      : `<div class="ag-empty ag-empty--log"><p class="ag-empty__title">Nothing has run yet</p>
          <p>Every approval, rejection or assignment you confirm here is listed, with who confirmed it and anything skipped.</p></div>`;
  }
  function setTab(tab, focus) {
    const ag = S(); ag.tab = tab;
    if (focus && ag.view !== "panel") open({ focus: false }); // asked for a tab: show the panel
    [["chat", "#ag-tab-chat", "#ag-chat"], ["activity", "#ag-tab-activity", "#ag-activity"]].forEach(([id, t, p]) => {
      const on = id === tab;
      $(t).setAttribute("aria-selected", String(on)); $(t).tabIndex = on ? 0 : -1; $(t).classList.toggle("is-active", on);
      $(p).hidden = !on;
    });
    if (focus) $(tab === "chat" ? "#ag-tab-chat" : "#ag-tab-activity").focus();
  }

  // ---------- Rail ----------
  function renderRail() {
    const live = Object.values(S().runs).find((r) => r.state === "working" || r.state === "needs-you");
    const st = $("#ag-rail-state");
    st.hidden = !live;
    if (live) { st.className = `ag-rail__state ag-run--${live.state}`; st.innerHTML = `<span class="ag-run__dot" aria-hidden="true"></span><span>${RUN_STATE[live.state]}</span>`; }
    const back = $("#ag-rail-back"), r = S().returnTo;
    back.hidden = !r;
    if (r) back.textContent = `Back to your plan · ${r.ready} ready`;
  }

  // ---------- Suggestions ----------
  function renderSugg() {
    $("#ag-sugg").innerHTML = SCRIPT.intents.filter((i) => i.chip).map((i) =>
      `<button type="button" class="ag-chip" data-intent="${i.id}">${esc(i.chip)}</button>`).join("");
  }

  function render() { applyView(); setTab(S().tab); renderThread(); renderActivity(); renderRail(); renderSugg(); }

  // ---------- Events ----------
  toggle.addEventListener("click", () => (S().view === "panel" ? close() : open()));
  scrim.addEventListener("click", close);
  $("#ag-form").addEventListener("submit", (e) => { e.preventDefault(); const v = input.value; input.value = ""; ask(v); input.focus(); });
  root.addEventListener("click", (e) => {
    const t = e.target.closest("[data-intent], [data-how], [data-stop], [data-tab], [data-act], #ag-close"); if (!t) return;
    if (t.id === "ag-close") return close();
    if (t.dataset.tab) return setTab(t.dataset.tab, true);
    if (t.dataset.stop) return stopRun(t.dataset.stop);
    if (t.dataset.act === "open" || t.dataset.act === "back") return open();
    if (t.dataset.how) {
      const c = S().thread.find((x) => x.id === t.dataset.how);
      c.howOpen = !c.howOpen;
      t.setAttribute("aria-expanded", String(c.howOpen));
      $(`#how-${c.id}`).hidden = !c.howOpen;
      return;
    }
    if (t.dataset.intent) { runIntent(t.dataset.intent, t.textContent.trim()); if (S().view === "panel") input.focus(); }
  });
  root.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && root.classList.contains("is-sheet")) { e.stopPropagation(); close(); return; }
    const tab = e.target.closest('[role="tab"]');
    if (tab && (e.key === "ArrowRight" || e.key === "ArrowLeft")) { e.preventDefault(); setTab(S().tab === "chat" ? "activity" : "chat", true); }
  });
  document.addEventListener("app:panel", (e) => {
    const ag = S(); if (small.matches) return;
    if (e.detail.open && ag.view === "panel") { ag.view = "rail"; ag.railAuto = true; render(); }
    else if (!e.detail.open && ag.view === "rail" && ag.railAuto) { ag.view = "panel"; ag.railAuto = false; render(); }
  });
  document.addEventListener("app:reset", () => { APP.state().agent = fresh(); render(); });
  small.addEventListener("change", () => { const ag = S(); ag.view = small.matches ? "closed" : "panel"; ag.railAuto = false; render(); });

  // For later phases and checks: what the scripted brain and the gates drive
  window.AGENT = { say, ask, runIntent, startRun, stopRun, open, close, state: S };

  // ---------- Boot ----------
  APP.state().agent = fresh();
  render();
})();
