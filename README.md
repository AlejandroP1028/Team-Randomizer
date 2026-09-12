# Team Randomizer

Splits a list of people into balanced teams, then turns a product requirements
document into assigned tasks for those teams.

The interesting part is not the randomising. It is that "balanced" has to mean
several things at once — comparable skill levels, a sensible spread of
departments, seniority that is not all stacked on one team, and teams that are
the same size — and those goals contradict each other. The solver in
`lib/solver/` is what resolves that.

## What it does

1. **Parse participants.** Paste `Name, Dept, Skill` lines into a textarea.
   Missing seniority is imputed from the skill rating.
2. **Generate balanced teams.** A weighted multi-objective solver seeds an
   initial split, scores it against four objectives, then runs a repair loop
   swapping members until the imbalance falls inside tolerance or it hits the
   iteration cap.
3. **Extract a PRD.** Upload a PDF or DOCX, or paste markdown.
4. **Generate tasks from the PRD.** An LLM turns the document into a task list
   with priorities and suggested assignees, matched against the actual
   participants.
5. **Work the board.** Drag-and-drop task board with filters and progress, then
   export teams or tasks to Slack or the clipboard.

## The solver

`lib/solver/index.ts` (453 lines, covered by `__tests__/solver.test.ts`).

Two grouping modes:

- **Mixed** — spread every department across all teams.
- **Specialised** — cluster departments together, then balance the remaining
  objectives around that.

Four weighted objectives, tuned per mode:

| Objective | Mixed | Specialised |
|---|---|---|
| Seniority | 9 | 9 |
| Skill | 8 | 8 |
| Department | 7 | 0 |
| Headcount | 6 | 6 |

Department weight drops to zero in specialised mode because homogeneity is
already handled by the seed phase — leaving it non-zero makes the two phases
fight each other.

Participants carry `mustSeparateFrom` and `preferTogetherWith` preferences.
Before any balancing runs, the solver walks the `mustSeparateFrom` graph as
connected components — if one component is larger than the maximum team size,
the set is unsatisfiable no matter how the teams are arranged, so it throws
`ConstraintConflictError` naming the people involved rather than failing later
with "no solution".

Seeding is a snake draft over skill-sorted participants, with an optional
`requireSeniorPerTeam` guarantee.

The repair loop is bounded at 1000 iterations with a 0.5 balance tolerance. It
returns the best split it reached along with warnings rather than looping
forever or returning nothing.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Zustand · Tailwind ·
shadcn/ui · dnd-kit · Groq · pdf-parse / mammoth · Vitest

## API

| Route | Purpose |
|---|---|
| `POST /api/v1/participants/validate` | Parse and validate the participant list |
| `POST /api/v1/teams/generate` | Run the solver |
| `POST /api/v1/prd/extract` | Pull text out of an uploaded PDF or DOCX |
| `POST /api/v1/tasks/generate` | Turn PRD text into assigned tasks |
| `POST /api/v1/teams/export/slack` | Format teams for Slack |

Every route returns errors as `{ error: { code, message } }` with a matching
status, so the client never has to guess why something failed.

## Running it

```bash
npm install
echo "GROQ_API_KEY=your-key" > .env.local   # only needed for task generation
npm run dev
```

```bash
npm test        # vitest — solver, PRD parsing, extraction
```

Teams generate without a key. Task generation is the only feature that calls
out to an LLM.

## Notes

Built with Claude Code. `CLAUDE.md` holds the design system and
`HANDOVER_V1_DELTA.md` records what shipped against the original spec,
including the pieces that did not — the spec called for a `Cmd/Ctrl+Enter`
shortcut that was never wired up, and the Slack fallback became a controlled
shadcn dialog rather than the planned raw `<dialog>` element.
