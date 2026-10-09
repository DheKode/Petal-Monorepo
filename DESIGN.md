---
version: alpha
name: Petal
description: Petal's developing original brand identity, with an approved rose-and-white palette and Geist Mono typography.
colors:
  primary: "#B83D70"
  on-primary: "#FFFFFF"
  surface: "#FFFFFF"
  background: "#FFF7FA"
  primary-container: "#FCE8EF"
  on-surface: "#33252D"
  on-surface-variant: "#745D69"
typography:
  default:
    fontFamily: Geist Mono
omitted:
  - section: spacing
    reason: The initial spacing baseline is maintained in libs/ui/src/themes/petal.tokens.json.
  - section: rounded
    reason: The initial radius baseline is maintained in libs/ui/src/themes/petal.tokens.json.
  - section: components
    reason: Initial control tokens live in libs/ui/src/themes/petal.tokens.json; screen-level component design remains pending.
---

# Petal Brand Identity and Design Study

## Overview

This document uses the section structure from [Google's DESIGN.md specification](https://github.com/google-labs-code/design.md/blob/main/docs/spec.md) to record Petal's original brand decisions alongside reference research. The rose-and-white palette and Geist Mono font family are approved. The [shared theme](libs/ui/src/themes/README.md) provides an initial baseline for typography sizing, spacing, radii, control states, focus, and motion. Screen layouts, illustrations, and actual-device checks remain to be completed. Flo and the community kit remain reference material.

The selected direction is flat, modern, and UX-driven: clear hierarchy, readable content, and purposeful color use. Brand expression should support daily logging and history review.

### Approved logo identity

Petal's final logo pairs a three-petal **open blossom** with a bespoke lowercase **petal** wordmark. The blossom is an independent symbol; the wordmark uses custom outlined lettering with almond-shaped counters and tight spacing. Keep both flat, with a rose symbol and deep plum lettering in the primary horizontal lockup. A white blossom inside a rose circle is the approved circular icon treatment.

The asset bundle lives in [libs/assets/brands](libs/assets/brands/README.md), with horizontal and stacked lockups, standalone wordmarks and symbols, circular icons, monochrome and reversed versions, SVG masters, and transparent PNG exports. Use the supplied outlines rather than reconstructing the wordmark with a font. Naming, initial minimum-size recommendations, and usage guidance are recorded in the bundle README.

A possible experience goal to explore is helping Petal feel calm, personal, and easy to return to. Its central promise is helping someone record what happened and understand their own history without feeling judged.

The current [PRD](PRD.md) describes an offline pill companion with bleeding journaling, rather than a general cycle-prediction product. Design around three tasks: record today's intake, review the pack/history, and clarify an uncertain entry. Bleeding remains easy to record but does not determine pill status or imply contraceptive effectiveness.

Reference observations and possible applications remain exploratory unless explicitly marked as approved. Product requirements remain grounded in the PRD.

### Reference study

#### Evidence and access

| Source | What was inspected | Limits |
| --- | --- | --- |
| [Flo design system: Part 1](https://medium.com/flo-health/flo-design-system-part-1-1eb8b731a48c) | Full article text about foundations and workflow | Historical description, not proof of Flo's current implementation |
| [Supplied community Figma kit](https://www.figma.com/design/L3ga9lxqFXhHeIVy2AprkU/Flo-Free-UI-Kit---By-Marvilo--Community-?node-id=0-1) | Direct access attempted | Canvas did not load; no variables, component properties, exact measurements, or complete flows extracted |
| [Marvilo's public kit preview](https://dribbble.com/shots/25068210-Flo-FREE-UI-Kit-By-Marvilo) | Browser screenshots of the cover and linked insight-card image | Creator describes it as a redesign; a community interpretation, not Flo's official library |
| [Flo: Stay prepared](https://flo.health/stay-prepared) | Browser screenshot of its published home-screen image | Marketing imagery, not a hands-on audit of the installed app |

#### What Flo's system teaches

Flo describes three foundations: Core Colors, Product Tokens, and a UI Kit. Its tokens combine semantic roles with component-specific naming, support light/dark values, and can vary by platform. The article reports SF Pro on iOS, Roboto on Android, and fourteen typography styles, with line-height checks on actual devices. Icon naming encodes size and drawing style. Flo also identifies inconsistent manual updates and one-off overrides as sources of drift; its revised approach gives Figma ownership, versioned token exports, and dedicated maintenance capacity. These are organizational lessons we can apply at a smaller scale. [Source](https://medium.com/flo-health/flo-design-system-part-1-1eb8b731a48c)

#### What the inspected visuals teach

Flo's published home image has a compact date strip, a large central daily status, a pink logging action, and smaller daily-insight cards beneath. The visual hierarchy makes today's information easy to identify. A light blush background and white central surface create warmth without making every element compete. These are observations of that specific published image. [Source](https://flo.health/stay-prepared)

Marvilo's preview uses a pink daily view, a selected date marker, prominent day/status text, and rounded insight cards. The separate card image mixes white and softly tinted surfaces, simple illustrations, and a clear add action. We can study this hierarchy without treating the preview as a verified production specification. [Source](https://dribbble.com/shots/25068210-Flo-FREE-UI-Kit-By-Marvilo)

#### Questions to explore for Petal

| Reference pattern | Possible application to study |
| --- | --- |
| One dominant daily status | Scheduled tablet, scheduled time, recorded state, and one primary logging action |
| Compact date navigation | A week strip linking to dose history, with a full calendar in Journal |
| Gentle colors and rounded surfaces | Study how tone and containment support comfort; choose Petal's palette and shapes independently |
| Small insight cards | One contextual history-review prompt and a bleeding-journal shortcut |
| Semantic tokens and components | Shared visual meanings across Android and desktop, with platform-appropriate controls |

One possible way to make Petal's distinctive feature visible is: “Not sure about a day? Let's review it.” Avoid importing fertility forecasts, pregnancy-chance cards, content feeds, subscriptions, or social features into the current scope.

## Colors

### Approved Petal palette

| Color | Token | Hex | Role |
| --- | --- | --- | --- |
| Rose | `primary` | `#B83D70` | Primary actions, selected navigation, brand accent |
| White | `surface`, `on-primary` | `#FFFFFF` | Main surfaces and text on rose buttons |
| Soft white | `background` | `#FFF7FA` | App background with a faint pink undertone |
| Blush | `primary-container` | `#FCE8EF` | Gentle emphasis and selected backgrounds |
| Deep plum | `on-surface` | `#33252D` | Headings and body text |
| Muted plum | `on-surface-variant` | `#745D69` | Supporting text |

Keep most of the interface white or soft white. Reserve strong rose for actions and selection; use blush sparingly to group or emphasize content. Keep reading text dark.

White on Rose has a calculated contrast ratio of 5.33:1. Deep plum and muted plum on White have ratios of 14.55:1 and 5.98:1 respectively. These checks cover the stated pairs; validate additional combinations as components are designed.

Dose status and bleeding entries need explicit labels and icons. Color alone must not distinguish no record, unsure, confirmed missed, and taken. Status-specific colors and a dark appearance remain to be designed.

### Reference observation

Flo and Marvilo's inspected imagery uses pink emphasis, light backgrounds, and white surfaces. Those references informed the study; the palette above is Petal's separately selected identity.

## Typography

### Approved font family

Use **Geist Mono** from Vercel as Petal's primary typeface. Vercel describes its monospace design as prioritizing readability, within a family influenced by Swiss design principles. [Font source](https://vercel.com/font)

The design intent is a precise, contemporary type voice balanced by the warm rose-and-white palette. Apply the family consistently across headings, controls, dates, times, tablet positions, and body text. The approved logo wordmark is separate custom outlined artwork; do not typeset it in Geist Mono.

Keep sentence case, natural spacing, and a clear hierarchy. Monospaced text can require more horizontal space; allow labels to wrap and keep explanations concise. Essential instructions must remain readable, and text scaling must preserve the main task and its actions.

The initial type scale and role-specific weights, line heights, and letter spacing are defined in [the theme source](libs/ui/src/themes/petal.tokens.json), with usage guidance in its README. Body starts at 16/24 and screen headings at 24/32 logical units. Verify the scale at mobile sizes and with text scaling. Bundle the chosen font files with the eventual app so typography remains available offline.

### Reference lesson

Flo's platform-specific type styles and real-device line-height checks are useful process examples. Petal will use its selected family and define its own typography roles.

## Layout

Study Flo's daily hierarchy: compact date navigation, one prominent status, a clear logging action, and supporting content beneath. Evaluate which hierarchy best serves Petal's daily logging and history review.

The shared theme defines initial spacing and gutter values. Grid composition, safe-area treatment, and responsive behavior still require screen design. The following navigation is an exploration grounded in the PRD, not an approved layout.

### Navigation and platform adaptation


Proposed mobile navigation: **Today · Journal · Ask Petal**. Place Settings behind a labeled header control. Give the pack a prominent entry from Today and a Pack/Calendar switch within Journal; these are alternate views of the same records.

| Area | Purpose | Primary content |
| --- | --- | --- |
| Today | Finish the daily recording task quickly | Current scheduled dose, actual recorded status, logging actions, next reminder, unresolved-history prompt |
| Journal | See and correct the record | Calendar/pack view, selected-date timeline, bleeding entries, dose details |
| Ask Petal | Review uncertainty and explain supported information | Focused conversation, relevant records, proposed changes, confirmation, sources |
| Settings | Control local operation | Product details, reminder/time zone, model download, privacy, backup/import |

Explore the same destinations in a desktop side rail. Journal can show a calendar and selected-day detail side by side. Ask Petal can show relevant records beside the conversation. Do not stretch a narrow phone card across the entire desktop window.

## Elevation & Depth

The inspected Flo home image uses a light background and a white central surface to distinguish its daily status. The community preview uses cards and soft color changes to group supporting content.

Petal's selected direction is flat. Use whitespace, typography, restrained surface colors, and necessary borders to express hierarchy. Avoid decorative gradients, 3D effects, and heavy shadows. Detailed component treatment remains to be designed. Recorded facts, proposed changes, and supported guidance must remain clearly labeled.

## Shapes

The references use rounded surfaces and selected-date markers. Study how those shapes help group information and indicate selection without adopting them as Petal's shape language.

The shared theme defines initial radii: 12 for controls, 16 for containers, and 24 for sheets. The shared icon implementation uses the Lucide family at 20/24/32 with a 1.75-unit physical outline. Mascot, illustration style, and complete control compositions remain to be designed. Controls need accessible targets and labels; the theme sets a 48-unit minimum target baseline. Pack cells must not use shape or color alone to identify formulation or recorded status.

## Components

Shared defaults for buttons, fields, cards, navigation, neutral status containers, and dialogs are in `libs/ui/src/themes/petal.tokens.json`. These are reusable appearance values; implementing components and validating screens remain separate tasks. Future shared component, hook, layout, and helper code belongs in the corresponding `libs/ui/src/` folders.

The [offline HTML preview](libs/ui/preview.html) shows every canonical token, original component specimens, source aliases, and web/native values. It embeds the approved artwork and locally bundled Geist Mono. Buttons explore a 12-unit rounded rectangle, with 10/16-unit comparisons; selections and proposed changes use explicit labels. Shared web styling lives in `libs/ui/src/styles/`, exposed as `@petal/ui/styles.css`. These specimens remain an exploration for designer review. Petal controls remain original; the icon dependency is documented separately below.

The shared icon baseline uses Lucide shapes through [AnimateIcons](https://animateicons.in/) on web/Electron and Lucide React Native vectors on Android. Petal’s Icon and IconButton wrappers apply the existing size, outline, color, target, and accessibility tokens; review all 24 names in the live shared-component preview. Web motion animates individual paths; native motion uses a finite scale pulse rather than identical path choreography. Icons are still at rest and respect system/app reduced motion. Keep record labels explicit; a check or warning never implies contraceptive protection. App integration and actual-device accessibility review remain separate. [Animata](https://animata.design/) remains a study reference for restrained custom feedback. Component studies include [Untitled UI](https://www.untitledui.com/react/components/buttons), [HeroUI](https://heroui.com/en/docs/react/components/button), and [shadcn](https://ui.shadcn.com/docs/components/button). Study interaction hierarchy, then design Petal’s own values and controls. Motion proposals use 120/180/240 ms, scale 0.98, and an 8-unit entry offset; respect reduced motion and avoid automatic loops.

### Study considerations

- **Actions:** Explore a clear hierarchy for the primary logging action and its alternatives.
- **Containers:** Study ways to distinguish recorded facts, proposed changes, and supported guidance.
- **Status labels:** Pair explicit wording with accessible visual cues.
- **Feedback:** Make saving, success, failure, and undo easy to understand. Motion must respect reduced-motion preferences.
- **Companion:** Develop Petal's own character and visual voice. The PRD rules out punitive reactions or health/protection claims based on adherence.

### Screen compositions and interaction hierarchy

These are product-flow proposals based on the PRD. Their visual treatment will be developed through Petal's own brand and design work.


#### Today

Order the screen around the task:

1. Date and compact week strip.
2. “Today's tablet” with pack position, scheduled time, and current record state. Show tablet type only when the profile is verified.
3. **Taken now** as the primary action. **Taken earlier** stays visible beside or immediately below it. **Unsure** and **Confirm missed** remain explicit, easy-to-find alternatives.
4. After logging, show the saved actual time with **Undo** and **Change time**. Prevent accidental duplicate saves for this dose.
5. A contextual prompt such as “Friday has no record” with **Review Friday**. Do not convert the gap into a missed dose.
6. **Log bleeding** and the next reminder, including permission status where relevant.

The main card records a fact; it does not independently instruct the person to take medication. Fixed supported guidance has its own labeled surface. A decorative progress ring must never imply protection, health, or a required catch-up action.

#### Journal

The calendar supports scanning; the selected-date timeline carries detail. Show scheduled dose identity, scheduled time, actual time or time precision, and status in each dose row. Two separate dose events on one date remain separate rows.

Keep bleeding entries in their own labeled rows. A calendar marker can indicate an entry, but tapping the date reveals whether it represents spotting, bleeding, intake, or an unresolved record. Supply a legend and accessible labels; never make color the only distinction.

A pack view should use verified ordering and labels, not infer tablet type from color. Until verification is available, show neutral positions and the tracking-only limitation. A selected tablet opens details; selection must not silently record intake.

#### Ask Petal: the signature flow

Use fictional demo data and explicit dates throughout the review:

1. The user describes an uncertain date or opens **Review Friday**.
2. Petal shows what the record currently contains and asks one focused question.
3. If a correction is possible, show a separate **Proposed change** card: pack/tablet identity, scheduled date, old value, proposed status, actual time or approximation, and information still unknown.
4. **Confirm change** and **Cancel** appear on that card. Chat text alone cannot authorize a write. Expired proposals must be reviewed again if underlying records changed.
5. After confirmation, show the saved change and reevaluated fixed guidance. Its explanation and source details can follow independently.
6. If the user still cannot remember, preserve uncertainty and offer **Keep as unsure** through an explicit confirmation.

Keep three surfaces visually distinct: recorded facts, proposed changes, and supported guidance. The generated explanation must not look like the authority that saved a record or determined a clinical action.

#### Setup

Use short steps with a progress label and back navigation: supported-product check → first/current pack → time and pack position → schedule review. Remembered past intake is optional; unfilled history stays unknown. Offer notifications and model download after the core setup, so logging is immediately useful.

### Component states

| Component | Required variants or states |
| --- | --- |
| Dose status card | Upcoming, not recorded, taken with time precision, confirmed missed, unsure |
| Dose row / pack cell | Selected, current scheduled dose, tablet identity/type, status icon and text |
| Logging action group | Ready, saving, saved, failed, undo available |
| History-review prompt | No entry, user unsure, resolved; no blame or urgency invented from a blank record |
| Correction preview | Before/after, confirm, cancel, saving, error, stale proposal |
| Guidance card | Supported result, missing facts, unsupported scope, tracking-only mode |
| Explanation area | Generating, ready, canceled, unavailable; fixed guidance stays accessible |
| Source detail | Publisher, passage, applicability, review/version metadata, offline availability |
| Bleeding editor | Category, optional intensity/note, save, edit, delete |
| Reminder row | Enabled, permission denied, disabled, platform background limitation |
| Model download | Not installed, progress/size, canceled, retry, insufficient storage, integrity failure, ready |
| Backup/import | Export sensitivity/encryption label, import summary, replacement confirmation, error/recovery |

Record state and schedule state are separate dimensions: a future scheduled dose should not look like an overdue failure, and a past blank should not look confirmed missed. “Taken” with an approximate time must remain visibly approximate. A saved dose is evidence of a record, not a protection badge.

## Do's and Don'ts

### Language and trust

| Prefer | Avoid |
| --- | --- |
| “No record for Friday” | “You missed Friday” when no one confirmed it |
| “You marked this as unsure” | “Probably taken” presented as fact |
| “Recorded at 8:14 PM” | “You're protected” |
| “Review this change” | A silent chat-based edit |
| “Tracking only — product details need verification” | Clinical instructions for an unverified profile |
| “Pack phase” when no estimate is supported | Invented period, ovulation, or fertility dates |

Use calm, adult language. Keep source/rule details behind a clearly labeled disclosure while leaving material limitations visible. Privacy text must match implemented behavior: local operation, actual encryption status, model download requirements, and reminder limitations. No decorative lock badge should overstate protection.

### Design review and handoff

Develop Petal's brand identity first: personality, visual direction, palette, typography, iconography, and companion. Then organize its original design system into Foundations, Components, Mobile flows, Desktop adaptations, and Review states. Name components by purpose and give state variants explicit names. Keep proposed and approved decisions distinguishable, with one designated source for approved values and a small change log.

Continue defining the brand identity in prose before creating further mockups: typography hierarchy, shape language, iconography, and companion direction. When visual exploration resumes, use the approved palette and font while treating the Flo study as reference material. Select a visual direction before implementation; then finish Today → Journal → Review uncertainty → Confirm change → Updated result. Follow with setup, bleeding editor, and critical failure states.

Review the selected screens against these questions:

- Can someone identify today's scheduled tablet and record intake without navigating away?
- Can they distinguish no record, unsure, and confirmed missed without relying on color?
- Are two dose events on one date represented independently?
- Does a proposed change show exactly what confirmation will save?
- Can fixed guidance and sources remain usable when generation fails?
- Do large text, narrow screens, keyboard navigation, visible focus, and screen-reader labels preserve the task?
- Are tracking-only and unsupported states designed with the same care as successful states?

Remaining research gap: inspect the supplied Figma file's actual frames, components, typography, spacing, and licensing when access is available. Until then, no measurements in this document should be attributed to that file.
