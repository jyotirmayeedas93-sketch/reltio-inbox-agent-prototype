/*
 * Inbox agent panel (PLAN.md 5.3, 6, D26 to D31). Concept, scripted, demo data only.
 *
 * The agent's state lives in the app's one state object (APP.state().agent) and the panel is
 * rendered from it. agent.js never touches the Inbox DOM; it goes through window.APP.
 *   view: "panel" (docked, or a bottom sheet on small screens) | "rail" (while a task is open) | "closed"
 * What the agent says is decided in agent-script.js; this file renders cards and runs plans.
 * Every card carries an AI label that opens "How this was made". Plans go plan → confirm → run →
 * result; runs go item by item, can be stopped, and end in the Activity log.
 */
(function () {
  "use strict";

  const APP = window.APP, SCRIPT = window.AGENT_SCRIPT, QUEUE = window.QUEUE, icon = window.icon;
  const NAME = "Inbox agent"; // working name (D14)
  const CAP = 20;             // a plan holds at most 20 tasks (D7)
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  const small = window.matchMedia("(max-width: 900px)");
  const STEP_MS = 700; // one item per step, so the reviewer can follow and stop a run

  const KIND = { status: "Answer", fallback: "Answer", list: "Answer", brief: "Brief", plan: "Plan", confirm: "Confirm", run: "Run" };
  const RUN_STATE = { working: "Working", "needs-you": "Needs you", done: "Done", failed: "Failed", stopped: "Stopped" };
  const OUTCOME = { pending: "Waiting", working: "Working", applied: "Applied", skipped: "Skipped", failed: "Failed", "not-started": "Not started" };
  const SIGNAL = { high: "High confidence", review: "Needs review", notvalidated: "Not enough signal" };
  const RISK = { high: 0, review: 1, notvalidated: 2 };
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
  const clock = () => new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  const root = $("#agent"), toggle = $("#ag-toggle"), scrim = $("#ag-scrim");
  const S = () => APP.state().agent;
  let seq = 0;

  const fresh = () => ({ view: small.matches ? "closed" : "panel", railAuto: false, tab: "chat", thread: [], runs: {}, activity: [], plans: {}, returnTo: null });

  // ---------- Reading the queue (live review state, so a changed task reads as changed) ----------
  const task = (id) => APP.tasks().find((t) => t.id === id);
  const fieldsOf = (id) => APP.state().dcrs[id].fields;
  const riskiest = (id) => fieldsOf(id).reduce((a, f) => (RISK[f.confidence] > RISK[a.confidence] ? f : a));
  const signalOf = (id) => riskiest(id).confidence;
  const openDcrs = () => APP.myTasks().filter((t) => t.type === "dcr");
  const isOpen = (id) => !APP.state().dcrs[id].resolved;
  const fmtVal = (v) => (v == null || v === "" ? "none" : v);
  // One task's change in a line. `lead` puts a given field first (a flagged row leads with its riskiest field).
  function changeLine(id, lead) {
    const fs = fieldsOf(id), f = lead || fs[0];
    const one = f.change === "deleted" ? `${f.label}: delete ${fmtVal(f.original)}` : f.change === "added" && f.original == null ? `${f.label}: add ${fmtVal(f.value)}` : `${f.label}: ${fmtVal(f.original)} → ${fmtVal(f.value)}`;
    return fs.length > 1 ? `${one}, and ${plural(fs.length - 1, "more change")}` : one;
  }
  const why = (id) => { const f = riskiest(id); return `${SIGNAL[f.confidence]}: ${f.label}`; };
  const helpers = { task, fieldsOf, riskiest, signalOf, openDcrs, isOpen, changeLine, why, SIGNAL, CAP, plural };

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
    const back = ag.returnTo && $(`#t-${ag.plans[ag.returnTo.planId].cardId}`);
    ag.returnTo = null; renderRail();
    if (back) { back.scrollIntoView({ block: "start" }); back.focus({ preventScroll: true }); return; }
    if (focus) (ag.tab === "chat" ? input : $("#ag-tab-activity")).focus();
  }
  function close() {
    S().view = "closed";
    render();
    toggle.focus();
  }

  // ---------- Thread ----------
  function say(card, { quiet = false } = {}) {
    const c = { id: `c${++seq}`, at: clock(), howOpen: false, ...card };
    S().thread.push(c);
    renderThread(c.kind === "user" ? null : c.id);
    if (c.kind !== "user" && !quiet) APP.announce(`${NAME}: ${c.title}.${c.body ? ` ${c.body}` : ""}`);
    return c;
  }
  function you(text) { say({ kind: "user", text }); }
  const cardOf = (id) => S().thread.find((x) => x.id === id);

  function ask(text) {
    const t = text.trim(); if (!t) return;
    you(t);
    const intent = SCRIPT.match(t);
    intent ? intent.run(ctx) : SCRIPT.fallback(ctx);
  }
  function runIntent(id, label, arg) {
    const intent = SCRIPT.byId(id); if (!intent) return;
    you(label);
    intent.run(ctx, arg);
  }

  // ---------- Card pieces ----------
  const confChip = (c) => `<span class="conf conf--${c}">${icon("ai", 12)}${SIGNAL[c]}</span>`;
  const openBtn = (id, planId) => `<button type="button" class="link-btn ag-item__open" data-open-task="${id}"${planId ? ` data-plan="${planId}"` : ""} data-k="open-${id}">Open<span class="sr-only"> ${esc(task(id).entity)}</span></button>`;
  // A task row: name and Open on top, a short line, an optional reason. Flagged rows are tinted.
  const rowHTML = (r) => `
    <li class="ag-item ag-item--row${r.flag ? " ag-item--flag" : ""}">
      <span class="ag-item__top"><span class="ag-item__name">${esc(task(r.id).entity)}</span>${r.button ? "" : openBtn(r.id, r.planId)}</span>
      <span class="ag-item__line">${r.chip ? confChip(r.chip) : ""}<span>${esc(r.line)}</span></span>
      ${r.reason ? `<span class="ag-item__why">${esc(r.reason)}</span>` : ""}
      ${r.button ? `<button type="button" class="btn btn--outline" data-open-task="${r.id}"${r.planId ? ` data-plan="${r.planId}"` : ""} data-k="review-${r.id}">${esc(r.button)}</button>` : ""}
    </li>`;
  const sectionHTML = (s) => `
    <div class="ag-sec"><p class="ag-sec__h"><span>${esc(s.title)}</span>${s.note ? `<span class="ag-sec__note">${esc(s.note)}</span>` : ""}</p>
      <ul class="ag-items">${s.rows.map(rowHTML).join("")}</ul></div>`;

  function cardHTML(c) {
    if (c.kind === "user") return `<p class="ag-you" id="card-${c.id}"><span class="sr-only">You said: </span>${esc(c.text)}</p>`;
    const run = c.runId ? S().runs[c.runId] : null;
    const plan = c.planId ? S().plans[c.planId] : null;
    let inner = "";
    if (c.kind === "brief") inner = `<ul class="ag-facts">${c.facts.map((f) =>
      `<li class="ag-fact"><span class="ag-fact__n">${f.n}</span><span class="ag-fact__t">${esc(f.text)}${f.strong ? `<b>${esc(f.strong)}</b>` : ""}</span></li>`).join("")}</ul>`;
    if (c.kind === "plan") inner = planHTML(plan);
    if (c.kind === "confirm") inner = confirmHTML(c, plan);
    if (run) inner += runHTML(run);
    if (c.sections) inner += c.sections.map(sectionHTML).join("");
    return `
      <article class="ag-card ag-card--${c.kind}" id="card-${c.id}" aria-labelledby="t-${c.id}">
        <div class="ag-card__head">
          <button type="button" class="ag-ai" data-how="${c.id}" data-k="how" aria-expanded="${c.howOpen}" aria-controls="how-${c.id}">${icon("ai", 12)}AI<span class="sr-only">: how this was made</span></button>
          <span class="ag-card__kind">${KIND[c.kind] || "Answer"}</span>
          <span class="ag-card__time">${esc(c.at)}</span>
        </div>
        <p class="ag-how" id="how-${c.id}" ${c.howOpen ? "" : "hidden"}>${esc(c.how || "")}</p>
        <h3 class="ag-card__title" id="t-${c.id}" tabindex="-1">${esc(c.title)}</h3>
        ${c.body ? `<p class="ag-card__body">${esc(c.body)}</p>` : ""}
        ${inner}
        ${c.buttons && c.buttons.length ? `<div class="ag-actions">${c.buttons.map((b, i) =>
          `<button type="button" class="btn btn--outline" data-intent="${esc(b.intent)}"${b.arg ? ` data-arg="${esc(b.arg)}"` : ""} data-k="btn-${i}">${esc(b.label)}</button>`).join("")}</div>` : ""}
      </article>`;
  }
  function renderThread(focusCard) {
    thread.innerHTML = S().thread.length ? S().thread.map(cardHTML).join("")
      : `<p class="ag-empty">Ask about your tasks, or pick a suggestion below.</p>`;
    const el = focusCard && $(`#card-${focusCard}`);
    if (el) thread.scrollTop = el.offsetTop - thread.offsetTop - 8; // a new card starts at the top of view
    else thread.scrollTop = thread.scrollHeight;
  }
  // Re-render one card in place, keeping focus on the same control (data-k) where it still exists
  function updateCard(id) {
    const el = $(`#card-${id}`); if (!el) return;
    const had = el.contains(document.activeElement) ? document.activeElement : null;
    const k = had && had.dataset.k;
    el.outerHTML = cardHTML(cardOf(id));
    if (had) { const n = $(`#card-${id}`); ((k && n.querySelector(`[data-k="${k}"]`)) || $(`#t-${id}`)).focus({ preventScroll: true }); }
  }

  // ---------- Plans (D29): ready ones ticked, flagged ones apart and never ticked ----------
  // makePlan({ title, meta, noun, ids, flagged, filter }) → plan; showPlan(plan) adds its card.
  function makePlan(o) {
    const p = { id: `p${++seq}`, status: "draft", ticked: new Set(o.ids), ...o };
    S().plans[p.id] = p;
    return p;
  }
  function showPlan(p) {
    if (p.filter) APP.setInboxFilters(p.filter); // the Inbox shows the same tasks as the plan
    const c = say({ kind: "plan", planId: p.id, title: p.title,
      how: `I grouped these because ${p.reasonWhy || "they make the same kind of change"}. Only high-confidence changes are ticked. ${p.flagged.length ? "Anything flagged is listed apart and can't be ticked." : ""}`.trim() });
    p.cardId = c.id;
    return c;
  }
  function planHTML(p) {
    const draft = p.status === "draft";
    const n = draft ? [...p.ticked].filter(isOpen).length : p.ticked.size; // a task resolved elsewhere drops out
    const ready = p.ids.filter((id) => isOpen(id) || p.status !== "draft");
    const flagged = p.flagged.filter(isOpen);
    const rows = ready.map((id) => `
      <li class="ag-item">
        <label class="cb"><input type="checkbox" data-tick="${p.id}" data-id="${id}" data-k="tick-${id}" ${p.ticked.has(id) ? "checked" : ""} ${draft ? "" : "disabled"}
          aria-label="Include ${esc(task(id).entity)}"><span class="cb__box" aria-hidden="true"></span></label>
        <span class="ag-item__name">${esc(task(id).entity)}</span>${openBtn(id, p.id)}
        <span class="ag-item__chg">${esc(changeLine(id))}</span>
      </li>`).join("");
    const status = { confirming: "Waiting for you to confirm below.", running: "Running below.", done: "Done. The result is below.", cancelled: "You left this plan." }[p.status];
    return `
      <p class="ag-meta">${esc(p.meta)} <b>Approvals are final.</b> A plan holds up to ${CAP} tasks.</p>
      ${ready.length ? `<div class="ag-sec"><p class="ag-sec__h"><span>Ready to approve · ${ready.length}</span>${draft ? `<span class="ag-sec__note">Untick any to leave it out</span>` : ""}</p>
        <ul class="ag-items">${rows}</ul></div>` : ""}
      ${flagged.length ? sectionHTML({ title: `Needs your review · ${flagged.length}`, note: "Not in this plan",
        rows: flagged.map((id) => ({ id, planId: p.id, flag: true, chip: signalOf(id), line: changeLine(id, riskiest(id)), reason: riskiest(id).reasoning, button: "Review this myself" })) }) : ""}
      ${draft ? `<p class="ag-count" aria-live="polite">${n} selected</p>
        <div class="ag-decide">
          <button type="button" class="btn btn--reject" data-plan-act="reject" data-plan-id="${p.id}" data-k="reject" ${n ? "" : 'aria-disabled="true"'}>Reject ${n}</button>
          <button type="button" class="btn btn--approve" data-plan-act="approve" data-plan-id="${p.id}" data-k="approve" ${n ? "" : 'aria-disabled="true"'}>Approve ${n}</button>
        </div>` : `<p class="ag-note">${status}</p>`}`;
  }
  function decidePlan(p, verb) {
    const ids = p.ids.filter((id) => p.ticked.has(id) && isOpen(id)); // keep the plan's order
    if (!ids.length || p.status !== "draft") return;
    p.status = "confirming";
    updateCard(p.cardId);
    const c = say({ kind: "confirm", planId: p.id, verb, ids, comment: "", state: "open",
      title: `${verb === "approved" ? "Approve" : "Reject"} these ${plural(ids.length, "change")}?`,
      how: "Nothing has changed yet. This lists exactly what will happen if you confirm." });
    p.confirmId = c.id;
    $(`#t-${c.id}`).focus({ preventScroll: true });
  }
  function confirmHTML(c, p) {
    const approve = c.verb === "approved", n = c.ids.length;
    const names = `<ol class="ag-names">${c.ids.map((id) => `<li>${esc(task(id).entity)}<span>${esc(changeLine(id))}</span></li>`).join("")}</ol>`;
    if (c.state !== "open") return `${names}<p class="ag-note">${c.state === "back" ? "You went back to the plan." : `You confirmed. ${approve ? "Approving" : "Rejecting"} below.`}</p>`;
    return `
      ${approve ? `<p class="ag-final">${icon("error_outline", 16)}<span>This is final. Approved changes can't be undone.</span></p>`
        : `<p class="ag-note">Each request goes back to its requester with your comment.</p>`}
      ${names}
      ${approve ? "" : `<div class="ag-comment"><label class="field__label" for="cm-${c.id}">Comment for the requesters (required)</label>
        <textarea class="comment-dlg__input ag-comment__input" id="cm-${c.id}" data-comment="${c.id}" data-k="comment" rows="3" placeholder="Say what needs to change">${esc(c.comment)}</textarea></div>`}
      <p class="ag-note">I'll check each one again just before ${approve ? "applying" : "sending"} it and skip any that changed.</p>
      <div class="ag-decide">
        <button type="button" class="btn btn--outline" data-confirm-act="back" data-confirm-id="${c.id}" data-k="back">Go back</button>
        <button type="button" class="btn ${approve ? "btn--approve" : "btn--reject"}" data-confirm-act="go" data-confirm-id="${c.id}" data-k="go"
          ${approve || c.comment.trim() ? "" : 'aria-disabled="true"'}>${approve ? "Approve" : "Reject"} ${n}</button>
      </div>`;
  }
  function confirmAct(c, act) {
    const p = S().plans[c.planId];
    if (act === "back") {
      c.state = "back"; p.status = "draft";
      updateCard(c.id); updateCard(p.cardId);
      $(`#t-${p.cardId}`).focus();
      return;
    }
    if (c.verb === "rejected" && !c.comment.trim()) { APP.announce("Add a comment for the requesters first."); $(`#cm-${c.id}`).focus(); return; }
    c.state = "done"; p.status = "running";
    updateCard(c.id); updateCard(p.cardId);
    const approve = c.verb === "approved";
    startRun({
      title: `${approve ? "Approving" : "Rejecting"} ${plural(c.ids.length, p.noun)}`,
      verb: c.verb, planId: p.id,
      how: `Each task is checked again just before it's ${approve ? "applied" : "sent"}. A task that changed, or that someone else resolved, is skipped. You can stop at any time.`,
      items: c.ids.map((id) => ({ id, label: task(id).entity })),
      step: (it) => APP.decide(it.id, c.verb, c.comment.trim()),
      onEnd: (run) => {
        p.status = "done";
        if (S().returnTo && S().returnTo.planId === p.id) S().returnTo = null;
        const left = run.items.filter((it) => it.outcome === "failed" || (it.outcome === "skipped" && !/^Already/.test(it.reason)))
          .map((it) => ({ id: it.id, flag: true, line: it.reason }));
        const flagged = p.flagged.filter(isOpen).map((id) => ({ id, flag: true, line: why(id) }));
        run.follow = [...left, ...flagged];
        run.note = approve ? `Each approved task's history reads "Approved by ${APP.reviewer()} with the ${NAME}". It's all in Activity.` : "Each rejected request went back to its requester with your comment. It's all in Activity.";
        updateCard(p.cardId);
      },
    });
  }

  // ---------- Runs: one item at a time, stoppable, logged ----------
  function startRun({ title, how, items, step, verb = "applied", onEnd, planId }) {
    const ag = S();
    const run = { id: `r${++seq}`, title, verb, planId, onEnd, state: "working", stop: false, at: 0,
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
    if (run.onEnd) run.onEnd(run);
    S().activity.unshift({ at: clock(), title: run.title, by: `${APP.reviewer()} with the ${NAME}`, state: run.state, line: countLine(run), verb: run.verb,
      items: run.items.map((it) => ({ label: it.label, outcome: it.outcome, reason: it.reason })) });
    updateCard(run.cardId); renderActivity(); renderRail();
    APP.announce(`${run.title}: ${RUN_STATE[run.state]}. ${countLine(run)}.`);
  }
  const outcomeLabel = (run, it) => (it.outcome === "applied" ? cap(run.verb) : OUTCOME[it.outcome]);
  function runHTML(run) {
    const done = run.items.filter((it) => !["pending", "working"].includes(it.outcome)).length;
    return `
      <div class="ag-run ag-run--${run.state}">
        <p class="ag-run__state"><span class="ag-run__dot" aria-hidden="true"></span><span>${RUN_STATE[run.state]}</span>
          <span class="ag-run__count">${run.state === "working" ? `${done} of ${run.items.length}` : esc(countLine(run))}</span></p>
        <ol class="ag-run__items">${run.items.map((it) => `
          <li class="ag-run__item is-${it.outcome}"><span class="ag-run__label">${esc(it.label)}</span>
            <span class="ag-run__outcome">${outcomeLabel(run, it)}${it.reason ? `: ${esc(it.reason.charAt(0).toLowerCase() + it.reason.slice(1))}` : ""}</span></li>`).join("")}</ol>
        ${run.state === "working" ? `<button type="button" class="btn btn--outline ag-stop" data-stop="${run.id}" data-k="stop" ${run.stop ? 'aria-disabled="true"' : ""}>${run.stop ? "Stopping after this one" : "Stop"}</button>` : ""}
        ${run.note ? `<p class="ag-note">${esc(run.note)}</p>` : ""}
        ${run.follow && run.follow.length ? `<div class="ag-follow">${sectionHTML({ title: "Still yours to decide", rows: run.follow })}</div>` : ""}
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
        <ul class="ag-log__items">${e.items.map((it) => `<li>${esc(it.label)}: ${it.outcome === "applied" ? cap(e.verb) : OUTCOME[it.outcome]}${it.reason ? `, ${esc(it.reason)}` : ""}</li>`).join("")}</ul>
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
    const back = $("#ag-rail-back"), r = S().returnTo, p = r && S().plans[r.planId];
    back.hidden = !p;
    if (p) back.textContent = `Back to your plan · ${[...p.ticked].filter(isOpen).length} ready`;
  }

  // ---------- Suggestions ----------
  function renderSugg() {
    $("#ag-sugg").innerHTML = SCRIPT.intents.filter((i) => i.chip).map((i) =>
      `<button type="button" class="ag-chip" data-intent="${i.id}">${esc(i.chip)}</button>`).join("");
  }

  function render() { applyView(); setTab(S().tab); renderThread(); renderActivity(); renderRail(); renderSugg(); }

  // What agent-script.js handlers get
  const ctx = { app: APP, queue: QUEUE, h: helpers, say, canDo: () => SCRIPT.offers, showTab: (t) => setTab(t, true), startRun, makePlan, showPlan, plans: () => S().plans };

  // ---------- Events ----------
  toggle.addEventListener("click", () => (S().view === "panel" ? close() : open()));
  scrim.addEventListener("click", close);
  $("#ag-form").addEventListener("submit", (e) => { e.preventDefault(); const v = input.value; input.value = ""; ask(v); });
  root.addEventListener("click", (e) => {
    const t = e.target.closest("[data-intent], [data-how], [data-stop], [data-tab], [data-act], [data-open-task], [data-plan-act], [data-confirm-act], #ag-close");
    if (!t || (t.getAttribute("aria-disabled") === "true" && !t.dataset.confirmAct)) return; // a blocked confirm explains itself
    if (t.id === "ag-close") return close();
    if (t.dataset.tab) return setTab(t.dataset.tab, true);
    if (t.dataset.stop) return stopRun(t.dataset.stop);
    if (t.dataset.act === "open" || t.dataset.act === "back") return open();
    if (t.dataset.how) {
      const c = cardOf(t.dataset.how);
      c.howOpen = !c.howOpen;
      t.setAttribute("aria-expanded", String(c.howOpen));
      $(`#how-${c.id}`).hidden = !c.howOpen;
      return;
    }
    if (t.dataset.openTask) {
      const p = t.dataset.plan && S().plans[t.dataset.plan];
      if (p && p.status === "draft") S().returnTo = { planId: p.id }; // the rail offers the way back
      APP.openTask(t.dataset.openTask);
      renderRail();
      return;
    }
    if (t.dataset.planAct) return decidePlan(S().plans[t.dataset.planId], t.dataset.planAct === "approve" ? "approved" : "rejected");
    if (t.dataset.confirmAct) return confirmAct(cardOf(t.dataset.confirmId), t.dataset.confirmAct);
    if (t.dataset.intent) { runIntent(t.dataset.intent, t.textContent.trim(), t.dataset.arg); }
  });
  root.addEventListener("change", (e) => {
    const cb = e.target.closest("input[data-tick]"); if (!cb) return;
    const p = S().plans[cb.dataset.tick];
    cb.checked ? p.ticked.add(cb.dataset.id) : p.ticked.delete(cb.dataset.id);
    updateCard(p.cardId); renderRail();
  });
  root.addEventListener("input", (e) => {
    const ta = e.target.closest("textarea[data-comment]"); if (!ta) return;
    const c = cardOf(ta.dataset.comment); c.comment = ta.value;
    const go = $(`#card-${c.id} [data-confirm-act="go"]`);
    if (go) c.comment.trim() ? go.removeAttribute("aria-disabled") : go.setAttribute("aria-disabled", "true");
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
  function start() { APP.state().agent = fresh(); SCRIPT.greet(ctx); render(); }
  document.addEventListener("app:reset", start);
  small.addEventListener("change", () => { const ag = S(); ag.view = small.matches ? "closed" : "panel"; ag.railAuto = false; render(); });

  // For checks and later phases
  window.AGENT = { say, ask, runIntent, startRun, stopRun, open, close, state: S };

  // ---------- Boot: the brief is the agent's first message (stage 2) ----------
  start();
})();
