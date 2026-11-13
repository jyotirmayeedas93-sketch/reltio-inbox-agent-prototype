/*
 * The Inbox agent's scripted brain (PLAN.md section 7). Concept, demo only.
 *
 * Each intent: id, phrases (matched in order against the lower-cased input), an optional
 * chip label (shown as a suggestion under the input), its level, and a handler.
 * Handlers get `ctx` from agent.js and answer with cards. Buttons on cards name an intent id.
 * Anything that matches nothing gets the fallback: "I can't do that in this demo yet."
 * Every number is counted from the queue when it's said, never written into the copy.
 *
 * Built so far: brief (stage 2), due today, plan a look-alike group and approve or reject it
 * (5A), the agent says no to "approve everything". P4 adds triage, filters, summaries, open
 * and reject; P5 assign and wrap-up.
 */
(function () {
  const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
  const verbFor = (n, one, many) => (n === 1 ? one : many);

  // The look-alike group with the most open DCRs
  function topGroup(ctx) {
    const open = ctx.h.openDcrs();
    return Object.keys(ctx.queue.groups).map((g) => ({ g, ids: open.filter((t) => t.group === g).map((t) => t.id) }))
      .sort((a, b) => b.ids.length - a.ids.length)[0];
  }
  const dueBy = (ctx) => ctx.h.openDcrs().filter((t) => t.due <= ctx.app.today()); // urgent = due today or overdue (D16)

  // ---------- Stage 2: the brief ----------
  function brief(ctx, opts) {
    const { h } = ctx, open = h.openDcrs();
    const fresh = open.filter((t) => t.isNew).length;
    const due = dueBy(ctx), overdue = due.filter((t) => t.due < ctx.app.today()).length;
    const top = topGroup(ctx);
    const routine = top.ids.filter((id) => h.signalOf(id) === "high").length, flagged = top.ids.length - routine;
    const dueText = overdue ? "due today or overdue" : "due today";
    const facts = [
      { n: fresh, text: plural(fresh, "new task").replace(/^\d+ /, "") },
      { n: due.length, text: dueText },
    ];
    if (top.ids.length > 1) facts.push({ n: top.ids.length, text: `DCRs ${ctx.queue.groupText[top.g]}. `,
      strong: `${routine} ${verbFor(routine, "looks", "look")} routine${flagged ? `, ${flagged} ${verbFor(flagged, "needs", "need")} review` : ""}.` });
    const buttons = [];
    if (due.length) buttons.push({ label: `Review the ${due.length} ${dueText}`, intent: "due-today" });
    if (top.ids.length > 1) buttons.push({ label: `Handle the ${top.ids.length} together`, intent: "plan-group", arg: top.g });
    buttons.push({ label: "Show all", intent: "show-all" });
    ctx.say({ kind: "brief", title: "Since yesterday", facts, buttons,
      how: "I counted your open data change requests: new since yesterday, due by today, and changes that look alike. Nothing was changed." }, opts);
  }

  // ---------- Stage 5A: a plan for a look-alike group ----------
  function planGroup(ctx, g) {
    const { h, queue } = ctx;
    g = g || topGroup(ctx).g;
    const ids = h.openDcrs().filter((t) => t.group === g).map((t) => t.id);
    const ready = ids.filter((id) => h.signalOf(id) === "high").slice(0, h.CAP), flagged = ids.filter((id) => h.signalOf(id) !== "high");
    if (!ready.length) {
      ctx.say({ kind: "status", title: "Nothing routine left here", body: `None of the open ${queue.groups[g].toLowerCase()} tasks can go in a plan. ${flagged.length ? "The rest need your review." : ""}`.trim(),
        how: "Only high-confidence changes can go in a plan.", buttons: ctx.canDo() });
      return;
    }
    const f = h.fieldsOf(ready[0])[0];
    const same = ready.every((id) => { const x = h.fieldsOf(id); return x.length === 1 && x[0].label === f.label && x[0].original === f.original && x[0].value === f.value; });
    const meta = same ? `Each changes only ${f.label}, from ${f.original} to ${f.value}.` : "Similar changes, grouped together.";
    const p = ctx.makePlan({ title: `${queue.groups[g]}: ${plural(ids.length, "task")}`, meta, noun: queue.groupNoun[g],
      reasonWhy: same ? `each changes only ${f.label}, from ${f.original} to ${f.value}` : "they make the same kind of change",
      ids: ready, flagged, filter: { group: g } });
    ctx.showPlan(p);
  }

  // ---------- The agent says no ----------
  function approveAll(ctx) {
    const { h } = ctx, open = h.openDcrs();
    const routine = open.filter((t) => h.signalOf(t.id) === "high").map((t) => t.id);
    const flagged = open.filter((t) => h.signalOf(t.id) !== "high").map((t) => t.id);
    const chunks = [];
    for (let i = 0; i < routine.length; i += h.CAP) chunks.push(routine.slice(i, i + h.CAP));
    const plans = chunks.map((ids, i) => ctx.makePlan({
      title: chunks.length > 1 ? `Routine changes: plan ${i + 1} of ${chunks.length}` : "Routine changes",
      meta: "Every change in this plan is high confidence.", noun: "routine change",
      reasonWhy: "every change in it is high confidence", ids, flagged: [] }));
    const body = [
      routine.length ? `I can approve the ${routine.length} routine ${verbFor(routine.length, "change", "changes")}${chunks.length > 1 ? `, in ${chunks.length} plans because a plan holds ${h.CAP} at most` : ", in one plan"}.` : "",
      flagged.length ? `${flagged.length} ${verbFor(flagged.length, "needs", "need")} your judgment, so I'll open ${verbFor(flagged.length, "it", "those")} for you instead.` : "",
    ].filter(Boolean).join(" ");
    ctx.say({ kind: "list", title: "I won't approve everything in one go", body,
      how: "Approvals can't be undone, so I never put a change that needs review into a plan, and I never offer one button for everything.",
      sections: flagged.length ? [{ title: `Need your judgment · ${flagged.length}`, rows: flagged.map((id) => ({ id, flag: true, line: h.why(id) })) }] : [],
      buttons: plans.map((p, i) => ({ label: chunks.length > 1 ? `Show plan ${i + 1} of ${chunks.length} · ${plural(p.ids.length, "task")}` : `Show the plan · ${plural(p.ids.length, "task")}`, intent: "show-plan", arg: p.id })) });
  }

  const intents = [
    {
      id: "brief", level: "prepare", chip: "What's new?",
      phrases: [/\bwhat(s| is) new\b/, /\bwhat came in\b/, /\bbrief\b/, /\bovernight\b/, /\bsince yesterday\b/],
      run: (ctx) => brief(ctx),
    },
    {
      id: "due-today", level: "prepare",
      phrases: [/\bdue today\b/, /\burgent\b/, /\boverdue\b/, /\bwhat(s| is) due\b/],
      run(ctx) {
        const { h } = ctx, due = dueBy(ctx);
        ctx.app.setInboxFilters({ due: "today" });
        ctx.say({ kind: "list", title: `${plural(due.length, "task")} due today`,
          body: due.length ? "I've filtered your Inbox to them." : "Nothing is due today.",
          how: "In this demo, due today or overdue counts as urgent. Priority orders tasks but doesn't make them urgent.",
          sections: due.length ? [{ title: "Due today", rows: due.map((t) => ({ id: t.id, flag: h.signalOf(t.id) !== "high", chip: h.signalOf(t.id), line: h.changeLine(t.id, h.riskiest(t.id)) })) }] : [] });
      },
    },
    {
      id: "plan-group", level: "plan",
      phrases: [/\bhandle (the )?(\d+ |seven )?(together|of them)\b/, /\bcountry codes?\b/, /\bapprove the (\d+|six|seven)\b/],
      run: (ctx, g) => planGroup(ctx, g),
    },
    {
      id: "approve-all", level: "plan",
      phrases: [/\bapprove (everything|all|them all|every)\b/, /\bapprove it all\b/],
      run: (ctx) => approveAll(ctx),
    },
    {
      id: "show-plan", level: "plan", phrases: [],
      run(ctx, planId) {
        const p = ctx.plans()[planId]; if (!p) return;
        if (p.cardId) { ctx.say({ kind: "status", title: "That plan is already open", body: "Scroll up to it, or ask for a new one.", how: "Each plan appears once." }); return; }
        ctx.showPlan(p);
      },
    },
    {
      id: "show-all", level: "prepare", chip: "Show all tasks",
      phrases: [/\bshow (me )?all\b/, /\ball (my )?tasks\b/, /\bclear (the |all )?filters?\b/, /\breset (the )?filters?\b/],
      run(ctx) {
        ctx.app.clearInboxFilters();
        const n = ctx.app.myTasks().length;
        ctx.say({ kind: "status", title: "Showing all your tasks", body: `The Inbox now lists all ${plural(n, "open task")}, with no filters.`,
          how: "I cleared the Inbox filters. Nothing in your tasks changed." });
      },
    },
    {
      id: "activity", level: "prepare",
      phrases: [/\bactivity\b/, /\bwhat (did|have) you (do|done)\b/, /\bwhat ran\b/],
      run(ctx) { ctx.showTab("activity"); },
    },
    {
      id: "matches", level: "prepare",
      phrases: [/\bpotential match/, /\bmatches\b/, /\bmerge\b/, /\bnot a match\b/, /\bduplicates?\b/],
      run(ctx) {
        ctx.say({ kind: "status", title: "Not in this demo", body: "Potential matches aren't in this demo yet. It covers data change requests only.",
          how: "This demo is scripted and only covers data change requests.", buttons: ctx.canDo() });
      },
    },
  ];

  // What the fallback offers: the things this build can do, as buttons
  const offers = [
    { label: "What's new?", intent: "brief" },
    { label: "Show all tasks", intent: "show-all" },
    { label: "Open Activity", intent: "activity" },
  ];

  function fallback(ctx) {
    ctx.say({ kind: "fallback", title: "I can't do that in this demo yet",
      body: "This demo is scripted, so it only understands a set list of requests. Try one of these.",
      how: "Your words didn't match any request this demo knows. Nothing was changed.", buttons: ctx.canDo() });
  }

  const normalise = (s) => s.toLowerCase().replace(/[“”"'’.!?]/g, "").replace(/\s+/g, " ").trim();
  const match = (text) => { const t = normalise(text); return intents.find((i) => i.phrases.some((p) => p.test(t))) || null; };

  window.AGENT_SCRIPT = { intents, offers, fallback, match, byId: (id) => intents.find((i) => i.id === id), greet: (ctx) => brief(ctx, { quiet: true }) };
})();
