/*
 * The one demo queue for the Inbox agent concept (PLAN.md 5.1, 5.2). Demo data only.
 *
 * Every number the agent says comes from this list, never from copy:
 *   25 open DCRs for alexander.kirsanov: 22 routine, 3 flagged
 *   14 new since yesterday · 2 due today
 *   7 change only a country code (US to USA): 6 high confidence, 1 needs review
 *
 * The Groton-Mystic DCR is the one from the Figma file (window.DEMO in data.js).
 * Everything else here was written for this prototype, so reasoning copy is draftCopy: true.
 * Signals follow the confidence logic in the handover: format-only or matching another
 * source = high; high-impact or conflicting = review; nothing to compare = notvalidated.
 */
(function () {
  const D = window.DEMO;
  const ME = D.user.reviewer;

  const F = (id, label, change, original, proposed, confidence, reasoning) =>
    ({ id, label, change, original, proposed, confidence, reasoning, draftCopy: true });

  const COUNTRY_OK = "Format-only change: the same country as a three-letter code.";
  const country = (reason = COUNTRY_OK, confidence = "high") => [F("country", "Country", "edited", "US", "USA", confidence, reason)];
  const street = (from, to, reason = "Same address with the street type written in full.") => F("address", "Address Line 1", "edited", from, to, "high", reason);
  const zip4 = (from, to) => F("postal", "Postal Code", "edited", from, to, "high", "Same postal code with its four-digit extension.");
  const SPANISH = "Same address with the street type written in full, as on the other source for this profile.";

  // [id, entity, entityId, priority, status, createdBy, createdOn, due, isNew, group, fields, script?]
  const dcrs = [
    // The Figma DCR. Due today; created long ago (Figma dates kept).
    ["3nfvPH35", "Groton-Mystic Falcons Ltd", "0KY7eHf", "High", "In Review", "vyacheslav.kovyazin", "2025-01-13T14:18", "2026-11-13", false, null, D.fields],

    // Country code US to USA: 7, all new. One flagged; one changes between plan and apply.
    ["Kq7RtL21", "Harbor Point Logistics LLC", "4HbPq2X", "High", "In Review", "Sarah Mitchell", "2026-11-12T16:42", "2026-11-17", true, "country-code", country()],
    ["Wm3ZpA58", "Cedar Ridge Dental Group", "9CdRg7T", "Medium", "In Review", "James Carter", "2026-11-12T16:30", "2026-11-18", true, "country-code", country()],
    ["Tn8VcE04", "Northwind Analytics Inc", "2NwAn5K", "Medium", "Open", "Sarah Mitchell", "2026-11-12T15:55", "2026-11-18", true, "country-code", country()],
    ["Pb5HsJ77", "Bluegate Supply Co", "7BgSp3M", "Low", "In Review", "Emily Nguyen", "2026-11-12T15:12", "2026-11-19", true, "country-code", country(), { changesMidRun: true }],
    ["Gx2LqN36", "Pinecrest Senior Living", "5PcSl8R", "Medium", "Open", "James Carter", "2026-11-12T14:48", "2026-11-19", true, "country-code", country()],
    ["Rd9MwF63", "Ironwood Fabrication Inc", "3IwFb6D", "Low", "In Review", "David Kowalski", "2026-11-12T14:05", "2026-11-20", true, "country-code", country()],
    ["Yc4KbV19", "Lakeshore Credit Union", "8LsCu1V", "High", "In Review", "Sarah Mitchell", "2026-11-12T13:20", "2026-11-17", true, "country-code",
      country("Conflicts with another source: the address source on this profile has the country as CA (Canada).", "review")],

    // Address changes: 5, all new, all routine ("Summarise these 5 address changes").
    ["Hs6NdQ42", "Riverside Medical Partners", "6RmPt4H", "Medium", "In Review", "Emily Nguyen", "2026-11-12T12:40", "2026-11-18", true, "address", [street("45 Oak St.", "45 Oak Street")]],
    ["Lv1QeT85", "Summit Peak Outfitters", "1SpOf9L", "Low", "Open", "James Carter", "2026-11-12T11:58", "2026-11-19", true, "address", [zip4("80202", "80202-1503")]],
    ["Jp3XaG27", "Copperline Telecom", "4ClTc2J", "Medium", "In Review", "Sarah Mitchell", "2026-11-12T11:16", "2026-11-18", true, "address",
      [street("1200 Market St Ste 400", "1200 Market Street, Suite 400"), zip4("94102", "94102-4801")]],
    ["Bz7FuW50", "Greenfield Organic Farms", "7GoFm5B", "Low", "In Review", "David Kowalski", "2026-11-12T10:34", "2026-11-20", true, "address",
      [street("Rte 9", "Route 9", "Matches the value from 2 other sources on this profile.")]],
    ["Ue2CyH91", "Meridian Hotel Group", "2MhGr8U", "High", "In Review", "Emily Nguyen", "2026-11-12T09:50", "2026-11-17", true, "address",
      [street("88 W Lake Ave", "88 West Lake Avenue", "Matches the value from 2 other sources on this profile.")]],

    // Spanish address tasks: 4, routine, not new (for "Assign the Spanish address tasks to Maria").
    ["Ea5GmR13", "Grupo Alameda SL", "3GaEs7A", "Medium", "Open", "Emily Nguyen", "2026-11-10T15:22", "2026-11-20", false, "spanish-address", [street("C/ Mayor 12", "Calle Mayor, 12", SPANISH)]],
    ["Ob8TrK66", "Bodegas Rioval SA", "6BrEs2O", "Low", "Open", "Emily Nguyen", "2026-11-10T14:40", "2026-11-20", false, "spanish-address", [street("Avda. de la Paz 3", "Avenida de la Paz, 3", SPANISH)]],
    ["Ci4WsP08", "Hotel Mirador Costa SL", "9HmEs4C", "Medium", "Open", "James Carter", "2026-11-10T13:05", "2026-11-23", false, "spanish-address", [street("Pº Marítimo 45", "Paseo Marítimo, 45", SPANISH)]],
    ["Nf9JzD32", "Farmacia Santa Lucía", "1FsEs6N", "Low", "Open", "Emily Nguyen", "2026-11-10T11:48", "2026-11-23", false, "spanish-address", [street("Pza. España 7", "Plaza de España, 7", SPANISH)]],

    // Other routine: 7. One due today; two new; one already resolved by Arjun Rao; one fails mid-run.
    ["Vt6RbM45", "Westbrook Capital Partners", "5WcCp3V", "High", "In Review", "Sarah Mitchell", "2026-11-10T10:12", "2026-11-13", false, null,
      [F("phone", "Phone", "edited", "3125550182", "+1 312 555 0182", "high", "Format-only change: the same number in international format.")]],
    ["Mk1DhX78", "Halcyon Biotech Inc", "8HbIn1M", "Medium", "Open", "David Kowalski", "2026-11-12T17:05", "2026-11-19", true, null,
      [F("website", "Website", "edited", "halcyonbio.com", "https://www.halcyonbio.com", "high", "Same domain written as a full web address.")]],
    ["Ag3PvC24", "Orchard Lane Bakery", "2OlBk9A", "Low", "Open", "James Carter", "2026-11-12T17:31", "2026-11-20", true, null,
      [F("email", "Email", "edited", "Orders@OrchardLane.com", "orders@orchardlane.com", "high", "Format-only change: the same address in lower case.")]],
    ["Iw7YnS59", "Tidewater Marine Services", "6TmSv2I", "Medium", "In Review", "Sarah Mitchell", "2026-11-09T16:20", "2026-11-18", false, null,
      [F("name", "Name", "edited", "TIDEWATER MARINE SERVICES", "Tidewater Marine Services", "high", "Format-only change: the same name in title case.")], { resolvedBy: "arjun.rao" }],
    ["Sq5UjB82", "Brightpath Learning Centers", "4BlCn7S", "Low", "Open", "Emily Nguyen", "2026-11-09T14:02", "2026-11-23", false, null,
      [F("phone", "Phone", "edited", "(617) 555-0134", "+1 617 555 0134", "high", "Format-only change: the same number in international format.")]],
    ["Xe2NgZ16", "Kingsley & Rowe LLP", "3KrLp5X", "Medium", "In Review", "James Carter", "2026-11-09T11:37", "2026-11-19", false, null,
      [F("website", "Website", "edited", "kingsleyrowe.com", "https://kingsleyrowe.com", "high", "Matches the value from 2 other sources on this profile.")]],
    ["Fo8LcY47", "Sterling Freight Lines", "7SfLn3F", "Medium", "Open", "David Kowalski", "2026-11-09T09:15", "2026-11-20", false, null, [zip4("60607", "60607-2214")], { failsMidRun: true }],

    // Other flagged: 1.
    ["Zr4QxA71", "Aurora Wellness Collective", "5AwCl8Z", "Medium", "Open", "Sarah Mitchell", "2026-11-11T15:44", "2026-11-19", false, null,
      [F("industry", "Industry", "added", null, "Health and wellness", "notvalidated", "No other source holds Industry for this profile.")]],
  ].map(([id, entity, entityId, priority, status, createdBy, createdOn, due, isNew, group, fields, script]) => ({
    id, type: "dcr", entity, entityId, entityType: "Organisation", priority, status, createdBy, createdOn, due,
    assignee: ME, isNew, group, step: "DCR Review", fields,
    script: { changesMidRun: false, resolvedBy: null, failsMidRun: false, ...script },
  }));

  // The Figma DCR keeps its own header copy (entity name, DCR ID, requester) from data.js.
  dcrs[0].meta = D.dcr;

  // Other task types, kept from the original Inbox rows so the agent's scope is visible.
  // The agent doesn't act on them (DCRs only). Dates moved into the demo week.
  const others = [
    ["pm",   "Acme Corporation", 2, "High",   "Sarah Mitchell", "2026-11-12T15:42", "Open",             "2026-11-24"],
    ["auth", "GlobalTech Inc",   0, "Medium", "James Carter",   "2026-11-12T11:30", "Pending Approval", "2026-11-21"],
    ["rdm",  "Product SKU-4502", 1, "Medium", "Sarah Mitchell", "2026-11-11T16:55", "Open",             "2026-11-25"],
    ["rfd",  "John D. Williams", 1, "High",   "David Kowalski", "2026-11-11T15:20", "Open",             "2026-11-24"],
    ["pm",   "Person A",         3, "Medium", "James Carter",   "2026-11-10T21:45", "Open",             "2026-11-26"],
    ["auth", "Nexus Healthcare", 0, "Medium", "James Carter",   "2026-11-10T16:05", "Open",             "2026-11-27"],
  ].map(([type, entity, more, priority, createdBy, createdOn, status, due], i) => ({
    id: `T${i + 1}`, type, entity, more, priority, createdBy, createdOn, status, due, assignee: ME, isNew: false, group: null,
  }));

  window.QUEUE = {
    demoToday: "2026-11-13",
    reviewer: ME,
    // The repo's team plus the two people the agent's demo needs (PLAN.md D25)
    team: [...D.profile.workflow.users, "maria", "arjun.rao"],
    names: { maria: "Maria", "arjun.rao": "Arjun Rao" },
    types: { dcr: "Data Change Request Review", pm: "Potential Match Review", auth: "Authoring", rdm: "RDM Data Change Request Review", rfd: "Recommend for Delete" },
    groups: { "country-code": "Country code US to USA", address: "Address changes", "spanish-address": "Spanish address tasks" },
    // How the agent's brief and plans talk about each group
    groupText: { "country-code": "only change a country code", address: "change an address", "spanish-address": "change a Spanish address" },
    groupNoun: { "country-code": "country code change", address: "address change", "spanish-address": "Spanish address change" },
    tasks: [...dcrs, ...others],
  };
})();
