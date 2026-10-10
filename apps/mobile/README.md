# Petal Mobile Companion (`@petal/mobile`)

The complete frontend and user interface for the Petal mobile application, built using the approved **Petal Design Tokens** and **Lucide Icon Vocabulary** created by `@emperuna`.

## Features and Screens Implemented

1. **Setup & Onboarding (`SetupScreen.tsx`, PRD F01)**
   - Welcome header with folded-petal brand logo and character illustrations.
   - Verified Trust 28 formulation review (21 active white tablets + 7 inactive brown tablets).
   - First-pack setup (starting from Day 1 on a chosen date) and Mid-pack setup (anchoring today's tablet number 1–28).
   - Usual intake time picker (24h format) and IANA time zone preservation.
   - Discreet reminder notification toggle.

2. **Daily Companion (`TodayScreen.tsx`, PRD F03, F05, F06)**
   - Dominant today dose card with scheduled time, active vs brown tablet labeling, and status badge.
   - Quick logging actions: **"Taken now"** (one-tap recording with actual timestamp), **"Taken earlier"** (date/time selector with exact vs approximate precision), **"Confirmed missed"**, and **"Unsure"**.
   - Undo notice banner allowing immediate reversion of recent intake changes.
   - Unresolved history notice if earlier doses have no entry, linking straight to History Repair.
   - Missed-dose guidance panel with deterministic action and expandable evidence/citation inspector (PRD F06).

3. **28-Tablet Blister Pack (`PackScreen.tsx`, PRD F02)**
   - Authentic blister pack layout: 4 weeks × 7 tablets = 28 tablets.
   - Rows 1–3: 21 Active white tablets with rose borders and "Active" labels.
   - Row 4: 7 Non-hormonal brown reminder tablets (iron) with clear "Brown" labels (never color alone).
   - Visual status indicators on each tablet: checkmark for taken, X for missed, ? for unsure, ring for today's dose.
   - Interactive tablet inspector drawer: tap any tablet in the pack to inspect its details and log/correct its status.

4. **Ask Petal & History Repair (`ClarifyScreen.tsx`, PRD F07, F08)**
   - Spotlight conversational interface to reconstruct uncertain memories.
   - Identifies unresolved doses, asks focused single-tablet questions (newest first).
   - **Mutation Proposal Card (`ProposalCard.tsx`, F08)**:
     - Clear before/after diff of tablet, date, status, and time precision.
     - Explicit **"Confirm & Save"** and **"Cancel"** buttons (cancellation leaves state 100% untouched).
     - Confirmed writes append to the local audit trail with origin `'chat'`.
   - Sourced FAQ quick chips: missed active pill advice, brown reminder tablet details, with citations from Trust 28 leaflet and CDC SPR.

5. **Bleeding Journal (`BleedingScreen.tsx`, PRD F10, F11)**
   - Daily logging: Date, Type (Spotting vs Bleeding), Intensity (Light, Moderate, Heavy), and Notes.
   - Pack-based cycle phase card (F11): educational note explaining active phase breakthrough bleeding vs brown tablet withdrawal bleeding.
   - Explicit clinical boundary: no false fertility windows, ovulation dates, or pregnancy probabilities.
   - Recorded history timeline with delete support.

6. **Settings & Privacy (`SettingsScreen.tsx`, PRD F12, F13, F14)**
   - Daily reminder time setting and discreet reminder copy preview: `"Petal: Daily self-care check-in"`.
   - Verified product metadata and leaflet version (Trust 28, 2026.1-ph).
   - Privacy status dashboard: 100% offline, 0 bytes uploaded, local device storage.
   - Version-1 JSON backup export and validated JSON backup import with transactional replacement.
   - Pack reset and onboarding re-run options.

## Design Tokens & Assets Used

- **Palette**: Rose `#B83D70`, Background Soft White `#FFF7FA`, Surface White `#FFFFFF`, Blush `#FCE8EF`, Deep Plum `#33252D`, Muted Plum `#745D69`, Success `#2B6B59`, Warning `#835C17`, Error `#A32640`.
- **Typography**: Geist Mono across all headings, labels, body text, and captions.
- **Icons**: Shared Lucide icon vocabulary from `@petal/ui/icons` (`home`, `pill`, `chat`, `journal`, `settings`, `check`, `taken`, `missed`, `unsure`, `no-entry`, `info`, `warning`, `delete`, `edit`).
- **Brand Identity**: Folded-petal logo, circular icon, Petal companion mascot illustrations.

## Local Review

To review the complete mobile app locally:

```sh
pnpm dev:mobile
```

Open `http://127.0.0.1:4180` in your browser. The review runner displays an authentic smartphone frame with:
- Simulated mobile status bar and punch-hole notch
- Full click/touch interactivity across all 5 navigation tabs
- "Reset Demo State" button to reload the sample pack with Day 13 unresolved (to test History Repair and proposal cards immediately)
- "Mode: Responsive" toggle to switch between Phone Frame and Full Screen

## Hand-off for Necookie (Backend & Local AI Integration)

Clean interfaces are defined in `src/services/`:
1. `storage.ts`: `MobileStorageService` currently uses an in-memory/domain-validated store. Necookie can provide a native SQLite implementation conforming to `StorageAdapter` to persist records across app restarts.
2. `ai.ts`: `CompanionAiService` provides a fallback deterministic engine. Necookie can connect the native `llama.rn` context completion via `companionAi.setNativeEngine(...)`.
