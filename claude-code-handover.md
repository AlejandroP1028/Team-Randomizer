# Team Randomizer — Claude Code handover

## What you are building

A Next.js 14 (App Router) web app that generates balanced teams from a list of participants. Users paste names, configure constraints, generate teams, drag-and-drop to adjust, and export to Slack. No database. No auth in v1. All state is client-side (Zustand + localStorage).

---

## Scaffold this first

```bash
npx create-next-app@latest team-randomizer \
  --typescript --tailwind --app --eslint \
  --no-src-dir --import-alias "@/*"
cd team-randomizer
npm install zustand @dnd-kit/core @dnd-kit/sortable
npm install -D vitest @vitest/ui @vitejs/plugin-react
```

---

## Exact file tree to create

```
team-randomizer/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   └── api/
│       └── v1/
│           ├── participants/validate/route.ts
│           ├── teams/generate/route.ts
│           └── teams/export/slack/route.ts
├── components/
│   ├── TeamRandomizerApp.tsx          "use client" — layout shell, keyboard shortcuts
│   ├── InputPanel/
│   │   ├── index.tsx                  sidebar wrapper
│   │   ├── ParticipantInput.tsx       textarea → Participant[]
│   │   ├── ConstraintConfig.tsx       team count/size + strategy select
│   │   └── PresetSidebar.tsx          save/load/delete from localStorage
│   └── OutputPanel/
│       ├── index.tsx                  top bar + teams grid + balance bar
│       ├── TeamGrid.tsx               DndContext wrapper
│       ├── TeamCard.tsx               droppable team column
│       ├── ParticipantCard.tsx        draggable chip (drag + drop target)
│       ├── BalanceIndicator.tsx       per-team coloured bar
│       └── ExportBar.tsx             Copy to Slack + fallback dialog
├── lib/
│   ├── types.ts                       all shared TypeScript types
│   └── solver/
│       └── index.ts                   generateTeams() — pure TS, no side effects
├── store/
│   └── useAppStore.ts                 Zustand store + persist middleware
├── hooks/
│   ├── useGenerate.ts                 POST /api/v1/teams/generate
│   └── useExport.ts                   POST /api/v1/teams/export/slack
└── __tests__/
    └── solver.test.ts
```

---

## Types  (`lib/types.ts`)

```typescript
export type Strategy = "balanced_skill" | "mixed_department" | "random" | "custom";

export interface Participant {
  id: string;
  name: string;
  skillLevel?: number | null;   // 1–5
  department?: string | null;
  preferences?: {
    mustSeparateFrom: string[];    // participant IDs
    preferTogetherWith: string[];
  };
}

export interface TeamConfig {
  strategy: Strategy;
  teamCount?: number;
  teamSize?: number;
}

export interface TeamStats {
  avgSkill: number;
  departments: Record<string, number>;
}

export interface Team {
  id: string;
  name: string;
  members: Participant[];
  stats: TeamStats;
}

export interface SolverWarning {
  type: "skill_imputed" | "soft_constraint_unmet" | "hard_constraint_partial";
  participants: string[];
  message: string;
}

export interface SolverResult {
  teams: Team[];
  warnings: SolverWarning[];
  remainderCount: number;
}

export interface Preset {
  id: string;
  name: string;
  participants: Participant[];
  config: TeamConfig;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateRequest  { participants: Participant[]; config: TeamConfig; }
export interface ValidateRequest  { participants: Participant[]; }
export interface SlackExportRequest { teams: Team[]; includeStats?: boolean; }
export interface SlackExportResponse { text: string; }
export interface ApiError {
  error: { code: "VALIDATION_ERROR" | "CONSTRAINT_CONFLICT" | "INTERNAL_ERROR"; message: string; details?: Record<string, unknown>; };
}
```

---

## Solver algorithm  (`lib/solver/index.ts`)

Pure TypeScript function. No imports outside `@/lib/types`. Called by the API route — also safe to call directly from a component.

```
generateTeams(participants: Participant[], config: TeamConfig): SolverResult
```

**Five phases, in order:**

### Phase 1 — Normalise
- Deduplicate by `id`
- Compute median `skillLevel` across participants that have one (sorted array, mid element)
- Fill missing `skillLevel` with that median; emit `skill_imputed` warning for each imputed participant

### Phase 2 — Constraint graph validation
- Build undirected adjacency list from all `mustSeparateFrom` edges (bidirectional)
- BFS to find connected components
- If any component length > `maxTeamSize`, throw `ConstraintConflictError` (extends `Error`) with `.conflictingParticipants: string[]`
- `maxTeamSize = floor(N / teamCount) + (remainder > 0 ? 1 : 0)`

### Phase 3 — Seed
- **`balanced_skill`**: sort descending by skill, snake-draft into teams
  - Snake draft: round 0 goes 0→N-1, round 1 goes N-1→0, alternating
- **`mixed_department`**: sort by department asc then skill desc, snake-draft
- **`random` / `custom`**: Fisher-Yates shuffle, then assign `participant[i]` → `teams[i % teamCount]`

### Phase 4 — Hard constraint repair  (max 1000 iterations)
- Scan all teams for any pair where `p1.preferences.mustSeparateFrom` contains `p2.id`
- Offender = the lower-skill member of the pair
- Find best swap candidate from another team: not violating constraints in either direction, minimum `|candidate.skill - offender.skill|`
- If no candidate found → emit `hard_constraint_partial` warning, break
- Perform swap in-place, repeat

### Phase 5 — Soft constraint nudge
- For each participant's `preferTogetherWith` list:
  - Skip if already on same team
  - Find which team holds the preferred participant
  - Try each member of the current team as a swap-out:
    - Simulate the swap
    - Accept only if both teams' new avgSkill stays within `±0.5` of `globalAvg`
    - Also check no hard constraints are violated by the swap
  - If no valid swap → emit `soft_constraint_unmet` warning, skip
  - If valid → perform swap

**Stats helper:**
```typescript
function computeStats(members: Participant[]): TeamStats {
  const skills = members.map(p => p.skillLevel ?? 3);
  const avg = skills.reduce((s, n) => s + n, 0) / skills.length;
  const departments: Record<string, number> = {};
  for (const p of members)
    if (p.department) departments[p.department] = (departments[p.department] ?? 0) + 1;
  return { avgSkill: Math.round(avg * 10) / 10, departments };
}
```

---

## API routes

All under `app/api/v1/`. Each file exports a single `POST` function. Use `NextResponse.json()`. Error shape: `{ error: { code, message, details? } }`.

### `POST /api/v1/teams/generate`
1. Parse + validate body (`participants` array ≥ 2, `config.strategy` present, exactly one of `teamCount` / `teamSize`)
2. Call `generateTeams(participants, config)`
3. Catch `ConstraintConflictError` → 422; other `Error` → 400; unknown → 500
4. Return `SolverResult` with status 200

### `POST /api/v1/participants/validate`
1. Compute median of present skill levels
2. Fill missing with median
3. Flag duplicates
4. Return `{ normalised: Participant[], warnings: SolverWarning[], imputedMedian: number | null }`

### `POST /api/v1/teams/export/slack`
Format:
```
*Team 1*
• Alice (Engineering)
• Bob (Design)
_Avg skill: 3.5 · Engineering 1 · Design 1_   ← only if includeStats: true
```
Teams separated by blank line. Return `{ text: string }`.

---

## Zustand store  (`store/useAppStore.ts`)

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";
```

**Shape:**
```
participants: Participant[]
config: TeamConfig                     default: { strategy: "balanced_skill", teamCount: 3 }
teams: Team[]
warnings: SolverWarning[]
teamHistory: Team[][]                  undo stack, max 20 snapshots
presets: Preset[]
activePresetId: string | null
loading: boolean
```

**Actions:**
- `setParticipants`, `setConfig` (merges partial), `setLoading`, `setResult`
- `swap(srcTi, srcMi, dstTi, dstMi)` — push snapshot to history, swap in-place
- `move(srcTi, srcMi, dstTi)` — push snapshot, splice + push
- `undo()` — pop last snapshot from history
- `savePreset(name)` — id = `preset_${Date.now()}`
- `loadPreset(id)` — sets `participants` + `config` + `activePresetId`
- `deletePreset(id)`

**Persist:** `name: "teamrandomizer"`, partialize to `{ config, presets, activePresetId }` only. Teams and history are session-only.

---

## Hooks

### `hooks/useGenerate.ts`
- Reads `participants` + `config` from store
- `generate()`: POST `/api/v1/teams/generate`, calls `setResult` on success, returns `{ error?: string }`
- Manages `setLoading` around the fetch

### `hooks/useExport.ts`
- Reads `teams` from store
- `copyToSlack(includeStats?)`: POST `/api/v1/teams/export/slack`, then `navigator.clipboard.writeText(text)`
- Clipboard fallback: if permission denied, populate `#slack-fallback-text` textarea and call `.showModal()` on `#slack-fallback-dialog`
- Returns `{ copyToSlack, copied: boolean }` — `copied` resets after 2s

---

## Component responsibilities

### `TeamRandomizerApp`  `"use client"`
- Two-panel layout: `aside` (300px fixed) + `main` (flex-1)
- `useEffect` keyboard listener:
  - `Cmd/Ctrl+Z` → `store.undo()`
  - `Cmd/Ctrl+Enter` → `generate()`

### `ParticipantInput`
- Controlled `<textarea>` bound to `participants.map(p => p.name).join("\n")`
- `onChange`: split by `\n`, trim, filter empty, map to `Participant` with `id = p_${i}_${slugified name}`
- Show participant count below

### `ConstraintConfig`
- Segmented control: "Count" | "Size" — mutually exclusive, sets `teamCount` or `teamSize` (clears the other)
- Number input (min 2, max `floor(N/2)`)
- `<select>` for strategy

### `PresetSidebar`
- List preset tags; active preset has blue accent
- Hover on tag → show `×` delete button
- `+ Save` → inline `<input>`, Enter commits, Escape cancels
- Loading a preset triggers `generate()` automatically

### `TeamGrid`
- Wrap with `<DndContext>` using `PointerSensor` (activation distance 5px) and `closestCenter`
- `onDragEnd`: if `over.data` has `memberIndex` → `store.swap()`; else → `store.move()`
- `<DragOverlay>` renders a rotated, scaled ghost of the dragged `ParticipantCard`

### `TeamCard`  (droppable)
- `useDroppable({ id: "team-${teamIndex}", data: { teamIndex } })`
- Header: team name, avg skill, department breakdown, skill bar
  - Skill bar colour: green if `|teamAvg - globalAvg| ≤ 0.5`, amber otherwise
- Body: list of `ParticipantCard`s
- `isOver` → blue border + light tint

### `ParticipantCard`  (draggable + droppable)
- `useDraggable` and `useDroppable` on the same `ref` node
- Skill badge colour by level:
  - 1 → red-100 / red-800
  - 2 → orange-100 / orange-800
  - 3 → amber-100 / amber-800
  - 4 → teal-100 / teal-800
  - 5 → blue-100 / blue-800
- `isDragging` → opacity-40
- `isOver` → blue border + tint

### `BalanceIndicator`
- One `div` per team, equal width, green/amber fill
- `title` tooltip with team name + avg + delta

### `ExportBar`
- "Copy to Slack" button; shows "Copied!" for 2s after success
- Hidden `<dialog id="slack-fallback-dialog">` with `<textarea id="slack-fallback-text">` and a close button

---

## Tests  (`__tests__/solver.test.ts`)

Use Vitest. Cover:
1. Skill imputation uses cohort median
2. Deduplication removes same-id entries
3. `ConstraintConflictError` thrown when must-separate group > team size
4. No error when constraints fit
5. `balanced_skill` snake-draft: all team avgs within ±0.5 of global avg
6. All participants distributed (total members = input length)
7. `remainderCount` computed correctly
8. Hard constraint repair: `mustSeparateFrom` pair ends up on different teams
9. Soft constraint warning emitted when prefer-together can't be satisfied
10. `computeStats` avgSkill rounded to 1 decimal

Vitest config in `vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
  test: { environment: "node" },
});
```

---

## Constraints and non-goals for v1

- No database. No auth. No user accounts.
- Presets live in `localStorage` only.
- No CSV upload (planned for v1.1).
- No direct Slack API posting — clipboard only.
- No real-time collaboration.
- `skillLevel` and `department` are accepted in the type but there is no UI to set them per-participant beyond the textarea. The textarea is name-only for v1; attributes can be set programmatically or added in v1.1.

---

## Definition of done for v1

- [ ] `npm run dev` starts without errors
- [ ] Pasting 6 names and clicking Generate produces 3 balanced teams
- [ ] Dragging a chip between teams updates the team cards and balance bar
- [ ] Dragging a chip onto another chip swaps them
- [ ] Cmd/Ctrl+Z undoes the last swap
- [ ] Saving a preset and reloading the page restores it
- [ ] "Copy to Slack" copies valid Slack markdown to clipboard
- [ ] `npm test` passes all solver tests
- [ ] `npm run build` exits 0

---

## Starter prompt for Claude Code

Paste this verbatim into a new Claude Code session after pointing it at the repo:

```
Read HANDOVER.md in full before writing any code.

Then implement the project exactly as specified:
1. Scaffold with the exact install commands in the handover
2. Create every file in the listed tree — do not skip any
3. Implement lib/types.ts first, then lib/solver/index.ts, then the API routes, then the store, then hooks, then components top-down
4. After all files are written, run: npm run build
5. Fix any TypeScript or build errors before stopping
6. Run: npm test — fix any failing tests
7. Report the final output of npm run build and npm test
```
