# Build Design System: tokens

All the design tokens from the **Build Design System** Figma file (`9gbh6BJ4Kcxp2CeMVhSJPE`), exported on 4 Oct 2026. Every Figma variable and text style is here. The component tokens were derived from the variables bound on each Figma component.

| File | What it is |
|---|---|
| `tokens.json` | The source of truth, in [W3C Design Tokens](https://design-tokens.github.io/community-group/format/) format. Each token keeps its original Figma name in `$extensions.figma`. |
| `tokens.css` | CSS custom properties, **generated** from `tokens.json`. References stay as `var()` chains. Don't edit this file by hand. |
| `build-css.mjs` | Rebuilds the CSS with `node design-system/build-css.mjs`. It has no dependencies. The build fails on an unresolved reference or a name clash. |

## Tiers

```
primitive  →  alias  →  semantic (light / dark)  →  component
                         responsive (desktop / mobile) → typography
                         accessibility (AA-safe colours)
```

| Tier | Figma source | Tokens | Example |
|---|---|---|---|
| `primitive` | Brand collection | 78 | `color.purple.500` = `#a259fb` · `scale.300` = `12px` · `font.weight.semibold` = `600` |
| `alias` | Alias collection | 68 | `color.primary.500` → `{primitive.color.purple.500}` · `radius.sm` → `{primitive.scale.50}` |
| `semantic` | Mapped collection (Light, Dark) | 42 | `surface.action` · `text.body` · `border.focus` |
| `responsive` | Responsive collection (Desktop, Mobile) | 31 | `type.h1.size` = 60px desktop / 48px mobile |
| `accessibility` | Accessibility collection | 4 | `brand` → `{alias.color.primary.700}` |
| `typography` | 18 text styles | 18 | `typography.body.md` = Inter 400 16/20 |
| `component` | Bindings on 22 component pages | 300 | `button.primary.bg` → `{semantic.surface.action}` |

All 223 variables and 18 text styles in the file are included. The tier counts match Figma exactly.

### Modes in CSS

- **Light** and **Desktop** are the defaults on `:root`.
- **Dark**: add `data-theme="dark"` to `<html>`. This switches 40 semantic tokens.
- **Mobile**: type sizes switch at `(max-width: 767px)`. Figma's device sizes are 1440 and 440, so the breakpoint is a judgment call.

### Naming: Figma → token

Most names carry over directly. A few Figma names were duplicates that Figma auto-suffixed, so they were renamed by what they actually contain:

| Figma variable | Token | Why |
|---|---|---|
| `Alias/Neutral/50 2` … `800 2` | `alias.color.primary.*` | Points to the Purple ramp |
| `Alias/Neutral/50 3` … `800 3` | `alias.color.error.*` | Points to the Red ramp |
| `Alias/Neutral/sm`, `md`, `lg`, `none` | `alias.border-width.*` | Scoped to stroke width |
| `Alias/Neutral/sm 2`, `md 2`, `lg 2`, `none 2`, `round` | `alias.radius.*` | Scoped to corner radius |
| `Mapped/Border/default 2` | `semantic.border.default` | |
| `Mapped/Border/default light` | `semantic.border.default-light` | |
| `Mapped/Surface/action-hover light` | `semantic.surface.action-hover-light` | |
| `Responsive/paragraph md/font size` | `responsive.type.body-md.size` | Matches the `Body/md` text style |

### Component tokens

These cover Button (primary / outline / transparent / disabled / focus), Field (Input and Text Area), Label, Menu, Checkbox, Radio, Switch, Tab, Button Group, Link, Avatar, Tag, Pill, Badge, Progress, Snack Bar, Carousel, Table and Loader.

Where a Figma component uses a **hard-coded** value that happens to equal a token, the component token references that token. It is marked `"hard-coded in Figma; matches this token by value"`. Values with no matching token, such as pill padding 9px and snack bar padding 18px, are kept as raw values and flagged.

## Audit: issues found in the Figma file

These came up while exporting. None blocked the export, but each is worth fixing at the source.

1. **Mapped tokens skip the alias tier.** `Surface/action`, `action-hover`, `action-hover light`, `success`, `disabled` and `Border/default light` / `default 2` point straight at Brand primitives instead of Alias tokens.
2. **Broken dark value.** `Text/headings` in Dark mode points to a variable outside this file. `neutral.50` is assumed here.
3. **Duplicates and strays.** `Surface/action-hover 2` (a duplicate), `Border/25` (a raw `#f5f5f5` with no scope), and `Alias/Neutral/Color` and `Alias/Color` (raw white, unused) are kept as `$deprecated` and left out of the CSS.
4. **Unnamed variants.** The Radio, Tag and Carousel `Status5`–`Status8` variants and Link `Status4` (which is the disabled state) are unnamed.
5. **Hard-coded values in components.** Button radius and padding, pill radius and padding, snack bar padding, several 10px / 6px / 15px gaps, and the `#d9d9d9` loader and progress dots aren't bound to tokens.
6. **Inconsistencies.** The table header uses a *border* token (`Border/default light`) as its fill. The switch focus ring uses `Border/action` instead of `Border/focus`.
7. **Contrast.** Several semantic pairings fall below WCAG AA:

| Pairing | Ratio | Needs |
|---|---|---|
| `text.on-action` on `surface.action` (primary button, selected menu item) | 3.92 | 4.5 |
| `text.action` on `surface.default` (purple text) | 3.92 | 4.5 |
| `text.success` on `surface.success` | 2.92 | 4.5 |
| `text.warning` on `surface.warning` | 2.56 | 4.5 |
| `text.error` on `surface.error` | 3.35 | 4.5 |
| `text.placeholder` on `surface.default` | 4.49 | 4.5 |
| `border.default-light` on `surface.default` (input outline) | 1.09 | 3.0 (WCAG 1.4.11) |

   The **Accessibility** collection already defines AA-safe brand (8.52:1), red (6.53:1), orange (5.35:1) and green (6.67:1) colours, but nothing in Mapped or the components uses them yet. Mapping `text.success`, `text.warning`, `text.error` and `text.action` to those colours would fix most of the table.
8. **Tight line height.** `Body/sm` is 14px/16px, a ratio of 1.14. It works for one line of text but is tight for paragraphs.

## How the prototype uses it

`styles.css` reads only tokens from this folder; it contains no hex values. It adds a small **app layer** at the top. That layer maps prototype roles onto DS tokens and applies the contrast fixes above, using colours the DS already provides:

| Prototype role | DS default | Used instead |
|---|---|---|
| Primary button (Resubmit, Suggest) / selected nav / selected menu item | `button.primary.bg` = `surface.action` (3.92) | `button.primary.bg-hover` (purple 600, 5.69) and `a11y.brand` on hover, via `--app-primary-*` |
| Purple text and links | `text.action` (3.92) | `a11y.brand` (8.52) |
| Success / warning / error text | `text.success` / `warning` / `error` | `a11y.green` / `orange` / `red` |
| Input outline | `border.default-light` (1.09) | `color.neutral.400` (4.49) |
| Secondary text | `text.placeholder` (4.49) | `color.neutral.500` |

The DS has no destructive button or modal, so those are composed from DS tokens (button metrics with error colours; surface, radius and type tokens).

## Inbox-Redesign: token audit (Final end to end workflow page)

The prototype follows frames Inbox-07 to Inbox-12 in the Inbox-Redesign file. Every value bound to a Build Design System token in those frames uses the same token in `styles.css`. Values Figma leaves unbound sit in one "Figma layer" block at the top of `styles.css`, so they can be fixed in Figma first.

**1. The Inbox file is on an old library version.** Five variables it uses have since been renamed in Build Design System. They have the same key, so they are the same token:

| Name in Inbox-Redesign | Current DS name | CSS token |
|---|---|---|
| Mapped/Border/default | Border/default light | `--border-default-light` |
| Accessibility/Color | Accessible brand color | `--a11y-brand` |
| Alias/Border Width/sm | Neutral/sm | `--border-width-sm` |
| Alias/Border Radius/md | Neutral/md 2 | `--radius-md` |
| Alias/Border Radius/round | Neutral/round | `--radius-round` |

Two values are also stale. Surface/disabled is #f4f4f4 in the Inbox file but #ecedee in the DS, and Border/default light is #ecedee there but #f5f5f5 in the DS. The prototype uses the current DS values, so dividers and grey pills look slightly different from the Figma canvas. To bring Figma in line, accept the library updates in Inbox-Redesign.

The renames also explain the odd DS names. Groups such as "Border Width" and "Border Radius" were renamed to "Neutral", so Figma suffixed the collisions with " 2".

**2. Values that are unbound in Figma** (no token on the canvas):
- **Text:** 1,000+ text layers use raw sizes: 10, 10.5, 11, 11.5, 12, 12.5, 13, 14, 15, 16, 17, 18 and 20px. Only Body/sm, Body/xsm, Body/md and their semibold variants are applied as styles.
- **Colours:**
  - The "Updated" tag (#996b14 on #fff5e0). The DS has no amber, and #996b14 is 4.34:1, so the prototype darkens it to #8a5e0f.
  - Soft surfaces #fbfbfc, #f9f9fb and #f5f5f7 are mapped to `--color-neutral-25`.
  - The header divider #d9d9d9 is mapped to `--border-disabled`.
  - Icon fills #323232 (84 layers) are mapped to `--icon-default`.
  - The overlay #3b3b3b @ 40% is mapped to neutral 800 @ 40%.
- **Review DCR dialog header buttons:** Reject (#cc4d4d / #b82929) and Approve (#218747) are raw values. The right panel uses Accessible red and green, and the prototype uses those in both places.
- **Required-comment dialog:** this comes from a different, Material-style library with raw colours and Roboto-style text styles. It is rebuilt with DS tokens.

**3. Content inconsistencies between frames:**
- The panel shows "Groton-Mystic Falcons / 118C6dGI" while the dialog shows "Groton-Mystic Falcons Ltd / 0KY7eHf". The prototype uses the dialog values.
- The summary text and tally are static in Figma ("7 clear · 2 no signal" in the panel, "1 no signal" in the dialog, "7 updated"). The prototype derives them from the 8 fields.
- "Comments (0)" is shown while two comments are listed.
- AI reasoning in the dialog uses raw #9e6b0f, while the panel uses Accessible orange.

**4. AA swaps.** Text/action (#a259fb), used on tabs, links and DONE, is 3.92:1. Text/placeholder is 4.49:1. Both are swapped for `--a11y-brand` and `--color-neutral-500` where they carry text.

## Profile page: design-system mapping (Profile Page 01 — Reviewer Viewing, 1752:18350)

The reviewer's starting page was inventoried in Figma (component instances, their library and variable bindings) and rebuilt in HTML from Build Design System tokens. Each section falls into one bucket:

| Section | Figma source | In the prototype |
|---|---|---|
| App bar, nav rails, entity tabs, avatar | Library: App Bar, Navigation Drawer (Mini), Tab Bar, Avatar | **Already DS.** Rebuilt with `--tab-*`, `--avatar-*`, Surface/action-hover light for the active rail item |
| "Viewing" button, Effective date field | Library: Button (outline), Field | **Already DS.** `--button-outline-*`, `--field-*` |
| Entity header, attribute cards, segments table, hierarchy tree | Local "Profile /" components bound to DS variables (Grey/600, Grey/800, Blue/50, Blue/500, Surface/information, Border/default light) | **Composed from DS tokens.** Same variables in CSS |
| Workflow panel | Local component; header and text buttons come from a Material library ("Button / Text / Primary", Roboto 14) | **Composed from DS primitives.** DS Button (transparent variant) for Review DCR / View DCR / Add, DS Field for due date, priority and assignee |
| Shadows | Material effects (M3 Elevation 3, app bar, rail) | **No DS token.** Kept as `--fig-shadow-*` in the Figma layer |

AA swaps on this page: Text/action (3.92:1) on "68,441 Search results", Viewing, Show more and the panel buttons uses `--a11y-brand`. Text/placeholder (4.49:1) on Entity ID, request labels and due dates uses `--color-neutral-500`. Text/success (2.9:1) on "Reviewed" uses `--a11y-green`. The 3px priority bar keeps Icon/error, because it isn't text and "High" is also announced.

### Review DCR additions (not in Figma)
- **Reviewer-added value row:** background `--color-neutral-25` (Grey/25, the lightest grey in the DS). It uses the DS `delete_outline` icon in place of +.
- **Values already in the request** are shown with the DS Menu item disabled tokens (`--menu-item-bg-disabled`, `--menu-item-text-disabled`, `--menu-item-border-disabled`).
- **Tags:** Edited (Surface/information) is a requester change. Updated (the amber Figma value) is a reviewer change. The header tally now says "Edited" instead of Figma's "Updated".
- **Add attribute:** the picker is the DS Menu (same tokens as the row dropdowns) and lists the profile attributes that aren't in the DCR. Each added attribute uses the same Grey/25 row, with + and `delete_outline`.
- **Field messages:** the DS Field has no error or warning variant (only Default, Hover, Focus and Disabled), so messages are built from semantic tokens. They sit under the box in Body/xsm with the DS `error_outline` icon.
  - **Error:** Accessible red text and border, plus `aria-invalid`. Errors block Approve and Resubmit.
  - **Note** (the value is the same as the profile): Accessible orange. It doesn't block anything.
- **Validation rules:** phone, website, whole number (employees), letters only (city), digits and hyphens (Tax ID), digits only (Data Provider Organization ID). A requester value can't be left empty.
- **Workflow card fields:** Priority and Assigned to use the DS Field + Menu dropdown. The priority bar is Icon/error for High, Icon/warning for Medium and Icon/success for Low.
- **Date picker:** the Build DS has no date picker (its pages are Button, Label, Field, Input, Menu, Checkbox, Radio Button, Switch, Text Area, Tab Bar, Button Group, Link, Breadcrumb, Avatar, Tag, Pill, Loader, Badge, Progress Bar, Snack Bar, Carousel and Table). It is composed from DS parts:
  - the Field as the trigger, with the `date_range` icon;
  - the Menu surface tokens for the popover;
  - icon buttons for month navigation;
  - Menu item hover tokens for days, with the AA-safe primary purple for the selected day and a Border/action ring for today.
  It is a good candidate to add to the DS.
- **Workflow filter:**
  - The Filter button is the DS transparent Button with the DS `filter_alt` icon. Its count bubble uses the Badge tokens (radius and text) on the AA-safe purple.
  - Search is a DS Field with the `search` icon, and the six filters are DS Menu dropdowns. Workflow types that don't exist on the profile use the Menu item disabled tokens.
  - Active filters are pills (Pill height and radius) on Surface/action-hover light.
  - Apply is the DS primary Button and Clear all is the transparent Button.
- **View DCR (history):** the Review DCR overlay in read-only mode.
  - The outcome is a pill (Surface/success + Accessible green) in place of the action buttons.
  - Rounds are cards (Border/default, radius lg) with a coloured top edge: Accessible green for approval, Accessible red for sent back or rejected, Icon/information for requester rounds. The round number uses the Badge size and radius.
  - The per-field timeline uses Border/default for its line, with dots in Icon/information (proposed or resubmitted), Accessible orange (updated by the reviewer), Accessible red (sent back) and Accessible green (approved).
  - The highlighted comment gets an Accessible-brand outline. Approval comments use Surface/success.
  - Comment timestamps now use the AA-safe grey (Text/placeholder was 3.8:1 on tinted cards).
- **Profile mode menu and Suggesting** (Figma "Profile Page 02 — Select suggesting" 1856:35664 and "Profile Page 04 — Suggest Mode" 830:22529):
  - The mode button is the DS outline Button. It works as a select-only combobox over a DS Menu, right-aligned and at least 215px wide as in Figma.
  - The menu shadow is Figma's Drop Shadow/400. The DS has no elevation token for it, so it's written inline.
  - The selected menu item uses the AA-safe purple 600 (5.69:1). The DS `menu.item.bg-selected` (`surface.action`, 3.92:1 with white) fails AA. This applies to every dropdown in the prototype.
  - Cancel is the DS outline Button (the DS has no separate secondary variant), and Suggest (Save in Editing) is the DS primary Button. It uses the Button disabled tokens until something changes.
  - Show more / Show less stays the Figma text link (Text/action, swapped to the Accessible brand colour), with the DS focus ring.
  - Editable values are DS Fields with Body/md text, and Company Type is a DS Menu dropdown on Grey/25, as in Figma. Row actions use the DS `add` and `delete_outline` icons, and deleted values get the Deleted tag (Surface/error + Accessible red).
  - The Suggesting icon is Material Icons `rate_review` (outlined), because Figma's icon assets couldn't be exported from this session.
- **Inbox bulk actions:** icon buttons in the selection bar (DS icon button, 24px target), shown once a task is selected. Reject and Approve use the Accessible red and green, and Delete and Archive use Icon/default. They're separated from the count by a short Grey/300 divider. The DS has no Tooltip, so the tooltip is composed from Grey/800, Text/on-action, Body/xsm and radius sm. It shows on hover and keyboard focus, and Esc hides it. Icons are Material `highlight_off`, `check_circle_outline`, `delete_outline` (DS) and `archive` (outlined).
