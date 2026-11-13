/*
 * The Inbox agent's scripted brain (PLAN.md section 7). Concept, demo only.
 *
 * Each intent: id, phrases (matched in order against the lower-cased input), an optional
 * chip label (shown as a suggestion under the input), its level, and a handler.
 * Handlers get `ctx` from agent.js and answer with cards. Buttons on cards name an intent id.
 * Anything that matches nothing gets the fallback: "I can't do that in this demo yet."
 *
 * Phases add intents here as they're built: brief and plans (P3), triage, filters, summaries,
 * open and reject (P4), assign and wrap-up (P5).
 */
(function () {
  const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

  const intents = [
    {
      id: "show-all",
      level: "prepare",
      chip: "Show all tasks",
      phrases: [/\bshow (me )?all\b/, /\ball (my )?tasks\b/, /\bclear (the |all )?filters?\b/, /\breset (the )?filters?\b/],
      run(ctx) {
        ctx.app.clearInboxFilters();
        const n = ctx.app.myTasks().length;
        ctx.say({
          kind: "status",
          title: "Showing all your tasks",
          body: `The Inbox now lists all ${plural(n, "open task")}, with no filters.`,
          how: "I cleared the Inbox filters. Nothing in your tasks changed.",
        });
      },
    },
    {
      id: "activity",
      level: "prepare",
      phrases: [/\bactivity\b/, /\bwhat (did|have) you (do|done)\b/, /\bwhat ran\b/],
      run(ctx) { ctx.showTab("activity"); },
    },
    {
      id: "matches",
      level: "prepare",
      phrases: [/\bpotential match/, /\bmatches\b/, /\bmerge\b/, /\bnot a match\b/, /\bduplicates?\b/],
      run(ctx) {
        ctx.say({
          kind: "status",
          title: "Not in this demo",
          body: "Potential matches aren't in this demo yet. It covers data change requests only.",
          how: "This demo is scripted and only covers data change requests.",
          buttons: ctx.canDo(),
        });
      },
    },
  ];

  // What the fallback offers: the things this build can do, as buttons
  const offers = [
    { label: "Show all tasks", intent: "show-all" },
    { label: "Open Activity", intent: "activity" },
  ];

  function fallback(ctx) {
    ctx.say({
      kind: "fallback",
      title: "I can't do that in this demo yet",
      body: "This demo is scripted, so it only understands a set list of requests. Try one of these.",
      how: "Your words didn't match any request this demo knows. Nothing was changed.",
      buttons: ctx.canDo(),
    });
  }

  const normalise = (s) => s.toLowerCase().replace(/[“”"'’.!?]/g, "").replace(/\s+/g, " ").trim();
  const match = (text) => { const t = normalise(text); return intents.find((i) => i.phrases.some((p) => p.test(t))) || null; };

  window.AGENT_SCRIPT = { intents, offers, fallback, match, byId: (id) => intents.find((i) => i.id === id) };
})();
