# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Pom's Playhouse** — a React + TypeScript children's activity web app with 6 mini-games. Built with Vite. No external game libraries; all illustrations are inline SVG.

## Commands

```bash
npm install      # install dependencies
npm run dev      # start dev server (localhost:5173)
npm run build    # TypeScript check + Vite build
npm run preview  # preview production build
```

## Architecture

Navigation is a single `useState` in `App.tsx` — no router. `current: ActivityId | null` determines which screen renders; `null` = Home.

### Component layer (`src/components/`)

| File | Role |
|------|------|
| `Layout.tsx` | Page shell: header with back button, mascot, title |
| `Mascot.tsx` | SVG character "Pom" — props: `size`, `mood`, `animate` |
| `ActivityCard.tsx` | Home grid card; inline SVG icon per activity |
| `Button.tsx` | Styled button with 3D push effect via `box-shadow` |

### Activity layer (`src/activities/`)

Each activity receives `{ onBack: () => void }` and owns all its own state.

| Activity | Key mechanic |
|----------|-------------|
| `MemoryGame` | 4×4 card flip using CSS `preserve-3d` / `backface-visibility` classes in `globals.css` |
| `PuzzleOrderGame` | Click story cards in correct sequence (1→4); shuffled via `useMemo` |
| `ColoringActivity` | SVG regions with `onClick` → fill from selected palette color; state is `Record<regionId, hexColor>` |
| `ShapeMatchGame` | Two-step click: select shape on left, tap matching outline on right; slots shuffled via `useMemo` |
| `HiddenCharacterGame` | Invisible `<rect>` hit areas over camouflaged SVG creatures; opacity transitions to reveal on find |
| `ColorMatchGame` | 10 rounds — pick target color from 4 options; `pickRound()` picks random target + 3 distractors |

### Data (`src/data/activities.ts`)

`ActivityInfo` records with `id`, `title`, `tagline`, `color`, `bg`, `shadow` — consumed by `Home` and `ActivityCard`. `ActivityId` is the union type used by `App.tsx` for routing.

### Styling

- `src/styles/globals.css` — CSS custom properties, keyframe animations, and the card-flip helper classes (`.flip-container`, `.flip-inner`, `.flip-face`, `.flip-face-back`). Imported once in `main.tsx`.
- All component-level styles are inline `CSSProperties` objects.
- Animation classes (`.pop`, `.shake`, `.float`, `.bounce`, `.fadeUp`) are applied via `className`.

## Copyright rule

All characters and illustrations are original. Do not reference Miffy, Dick Bruna, or miffy.com. The mascot "Pom" is an original round bear-like creature drawn in SVG.
