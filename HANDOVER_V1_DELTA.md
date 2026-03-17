# Team Randomizer — v1 delta handover

This file is the source of truth for the next Claude Code session.
Read this instead of HANDOVER.md or HANDOVER_V2.md — those describe the original spec.
This file describes what was **actually built** and what needs to be built next.

---

## Stack (confirmed shipped)

- Next.js 14, App Router, TypeScript
- Tailwind CSS + **shadcn/ui** component library
- Zustand + localStorage persist
- `@dnd-kit/core` + `@dnd-kit/sortable`
- Single-page layout — no separate routes, panels swap in/out on the same page

---

## What shipped vs the original spec

### Participant input
**Spec:** name-only textarea, skill/dept planned for v1.1.
**Shipped:** full `Name, Dept, Skill` inline format parsed from textarea. Serialisation and deserialisation implemented. A "Load sample" button with configurable participant count was also added (not in spec).

### Keyboard shortcuts
**Spec:** `Cmd/Ctrl+Enter` → generate, `Cmd/Ctrl+Z` → undo.
**Shipped:** only `Cmd/Ctrl+Z` was wired. `Cmd/Ctrl+Enter` was **not implemented**.

### Clipboard / Slack export fallback
**Spec:** hidden `<dialog id="slack-fallback-dialog">` with a raw `<textarea>`.
**Shipped:** React-controlled shadcn `Dialog` component. No DOM id selectors.

### shadcn component set in use
- `Button`, `Badge`
- `Dialog`
- `Select`, `DropdownMenu`
- `Card`
- `Toast` / `Sonner`
- `Sheet` / `Drawer`

### Additional features shipped (not in spec)
- Department colour badges per team card
- Dark/light theme toggle
- Skill bar recomputes correctly on every drag (stat recompute bug was fixed)
- "Custom team" feature (details unknown — do not touch)

### Stats bug fix
Original spec's `cloneTeams` helper did not recompute stats after swap/move. Shipped code calls `computeStats()` in both `swap` and `move` store actions. This is correct — preserve it.

---

## Routing change (new requirement)

The existing app is one page (`app/page.tsx`). The workspace must move to **separate URLs** using the App Router. Do not put the workspace in a sheet or panel on the home page.

### New file tree additions

```
app/
├── page.tsx                              (exists — do not modify)
└── workspace/
    └── [presetId]/
        ├── layout.tsx                    NEW — shared chrome for both tabs
        ├── page.tsx                      NEW — PRD tab (default route)
        └── tasks/
            └── page.tsx                  NEW — Tasks tab
```

### `app/workspace/[presetId]/layout.tsx`

Server component. Receives `{ children, params: { presetId } }`.

Renders:
- A top nav bar with:
  - Back button → `href="/"` using Next.js `<Link>`
  - Preset name — read from the Zustand store client-side via a `"use client"` child component `<WorkspaceNav>`
  - Two tab links: `<Link href={/workspace/${presetId}}>PRD</Link>` and `<Link href={/workspace/${presetId}/tasks}>Tasks</Link>`
  - Active tab highlighted using `usePathname()` from `next/navigation` inside `<WorkspaceNav>`
- `{children}` below the nav

```tsx
// app/workspace/[presetId]/layout.tsx
import { WorkspaceNav } from "@/components/WorkspaceNav";

export default function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { presetId: string };
}) {
  return (
    <div className="flex flex-col h-screen">
      <WorkspaceNav presetId={params.presetId} />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
```

### `components/WorkspaceNav.tsx` `"use client"`

```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";

export function WorkspaceNav({ presetId }: { presetId: string }) {
  const pathname = usePathname();
  const presetName = useAppStore(s => s.presets.find(p => p.id === presetId)?.name ?? "Workspace");
  const prdHref = `/workspace/${presetId}`;
  const tasksHref = `/workspace/${presetId}/tasks`;

  return (
    <nav className="flex items-center gap-3 border-b border-border px-4 h-12 shrink-0">
      <Link href="/"><Button variant="ghost" size="sm">← Back</Button></Link>
      <span className="text-sm font-medium flex-1">{presetName}</span>
      <Link href={prdHref}>
        <Button variant={pathname === prdHref ? "secondary" : "ghost"} size="sm">PRD</Button>
      </Link>
      <Link href={tasksHref}>
        <Button variant={pathname === tasksHref ? "secondary" : "ghost"} size="sm">Tasks</Button>
      </Link>
    </nav>
  );
}
```

### `app/workspace/[presetId]/page.tsx`

```tsx
"use client";
import { PrdInput } from "@/components/WorkspacePanel/PrdTab/PrdInput";
export default function PrdPage({ params }: { params: { presetId: string } }) {
  return <PrdInput presetId={params.presetId} />;
}
```

### `app/workspace/[presetId]/tasks/page.tsx`

```tsx
"use client";
import { TasksPage } from "@/components/WorkspacePanel/TasksTab/TasksPage";
export default function TasksRoutePage({ params }: { params: { presetId: string } }) {
  return <TasksPage presetId={params.presetId} />;
}
```

### `PresetSidebar` change

Replace any `openWorkspace` call with Next.js navigation:

```tsx
import { useRouter } from "next/navigation";
const router = useRouter();

// on folder icon click:
loadPreset(preset.id);
router.push(`/workspace/${preset.id}`);
```

### Remove from store

`activeWorkspaceId`, `openWorkspace()`, and `closeWorkspace()` are not needed. The URL is the source of truth. Do not add them.

---

## What does NOT exist yet (v1.1 scope)

Everything below is unbuilt. This is the full scope for the next session.

1. PRD workspace pages and routing
2. Markdown editor with live preview (`@uiw/react-md-editor`)
3. PDF + DOCX upload and server-side text extraction
4. AI task generation via Groq (Llama 3.3 70B)
5. Four-column kanban task board (To do / In progress / In review / Done)
6. Per-task assignee, priority, inline editing, move, delete
7. Assignee filter bar + progress bar
8. JSON download export (client-side only — no API route)

---

## New dependencies to install

```bash
npm install groq-sdk pdf-parse mammoth \
  @uiw/react-md-editor @uiw/react-markdown-preview \
  use-debounce

npm install -D @types/pdf-parse @types/mammoth @tailwindcss/typography
```

Add to `tailwind.config.ts` plugins:
```ts
require("@tailwindcss/typography")
```

Add to `.env.local`:
```
GROQ_API_KEY=your_key_here
```

Get a free key at https://console.groq.com — no credit card required.

---

## New types (append to `lib/types.ts`)

Only add if not already present. Do not remove or rename existing types.

```typescript
export type TaskPriority = "high" | "medium" | "low";
export type TaskStatus   = "todo" | "in_progress" | "in_review" | "done";

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  section: string;
  suggestedAssignee: Participant | null;
  confirmedAssignee: Participant | null;
  status: TaskStatus;
}

export interface PrdWorkspace {
  presetId: string;
  prdText: string;
  tasks: Task[];
  lastGeneratedAt: string | null;
}

export interface GenerateTasksRequest {
  prdText: string;
  participants: Participant[];
}
```

---

## Zustand store — new state and actions

Add to state:
```typescript
workspaces: Record<string, PrdWorkspace>  // persisted
activeFilter: string | null               // session-only, not persisted
```

Add actions:
```typescript
setPrdText(presetId: string, text: string): void
setTasks(presetId: string, tasks: Task[]): void
addTask(presetId: string, task: Omit<Task, "id">): void
updateTask(presetId: string, taskId: string, patch: Partial<Task>): void
deleteTask(presetId: string, taskId: string): void
moveTask(presetId: string, taskId: string, status: TaskStatus): void
setActiveFilter(name: string | null): void
```

Extend `partialize` to persist `workspaces`. `activeFilter` is session-only — do not persist it.

Do NOT add: `ExportSettings`, `activeWorkspaceId`, `openWorkspace`, `closeWorkspace`, `confirmAssignee`, `confirmAllAssignees`, `markExported`, `setExportSettings`.

---

## New API routes

### `POST /api/v1/prd/extract`  (`app/api/v1/prd/extract/route.ts`)

Accepts `multipart/form-data` with a `file` field. Branches on MIME type:
- `application/pdf` → `pdf-parse(buffer)` → return `{ text: string }`
- contains `wordprocessingml` → `mammoth.extractRawText({ buffer })` → return `{ text: string }`
- anything else → 400 `VALIDATION_ERROR`

### `POST /api/v1/tasks/generate`  (`app/api/v1/tasks/generate/route.ts`)

Body: `{ prdText: string; participants: Participant[] }`

```typescript
import Groq from "groq-sdk";
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const completion = await groq.chat.completions.create({
  model: "llama-3.3-70b-versatile",
  temperature: 0.3,
  max_tokens: 4096,
  messages: [
    {
      role: "system",
      content: "You are a project manager assistant. Return ONLY valid JSON with no markdown fences and no preamble.",
    },
    { role: "user", content: buildTaskPrompt(prdText, participants) },
  ],
});
```

Strip fences, `JSON.parse`, guard `Array.isArray(parsed.tasks)`. Hydrate tasks:
```typescript
{
  id: crypto.randomUUID(),
  title: t.title,
  description: t.description,
  priority: t.priority,
  section: t.section,
  suggestedAssignee: participants.find(p => p.id === t.suggestedAssigneeId) ?? null,
  confirmedAssignee: participants.find(p => p.id === t.suggestedAssigneeId) ?? null,
  status: "todo" as const,
}
```

Return `{ tasks: Task[] }`.

**No `/api/v1/tasks/export` route.** Export is client-side JSON blob only.

---

## `lib/prd.ts`

```typescript
export function buildTaskPrompt(prdText: string, participants: Participant[]): string {
  const roster = participants.map(p => ({
    id: p.id,
    name: p.name,
    department: p.department ?? "Unknown",
    skillLevel: p.skillLevel ?? 3,
  }));
  return `PRD document:\n${prdText}\n\nTeam roster (use these exact IDs):\n${JSON.stringify(roster, null, 2)}\n\nReturn JSON: { "tasks": [{ "title": string, "description": string, "priority": "high"|"medium"|"low", "suggestedAssigneeId": string|null, "section": string }] }\n\nGenerate 5–20 tasks covering all major features and non-functional requirements.`;
}
```

---

## New components

### `components/WorkspacePanel/PrdTab/PrdInput.tsx`

Must use `dynamic(() => import("@uiw/react-md-editor"), { ssr: false })` — crashes on SSR without it.

```tsx
"use client";
import dynamic from "next/dynamic";
import { useDebouncedCallback } from "use-debounce";
import { useAppStore } from "@/store/useAppStore";
import { PdfUploadButton } from "./PdfUploadButton";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

export function PrdInput({ presetId }: { presetId: string }) {
  const prdText    = useAppStore(s => s.workspaces[presetId]?.prdText ?? "");
  const setPrdText = useAppStore(s => s.setPrdText);
  const save       = useDebouncedCallback((val: string) => setPrdText(presetId, val), 300);

  return (
    <div className="flex flex-col h-full gap-3 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">PRD document</span>
        <PdfUploadButton presetId={presetId} />
      </div>
      <div className="flex-1 overflow-hidden" data-color-mode="light">
        <MDEditor value={prdText} onChange={val => save(val ?? "")} preview="live" height="100%" />
      </div>
    </div>
  );
}
```

### `components/WorkspacePanel/PrdTab/PdfUploadButton.tsx`

Hidden file input accepting `.pdf` and `.docx`. POST to `/api/v1/prd/extract` → `setPrdText`. Reset input value after upload so the same file can be re-selected.

### `components/WorkspacePanel/TasksTab/TasksPage.tsx`

Toolbar + filter + progress + board:

```
[Generate tasks]  [+ Add task]  [Download JSON]
[All] [Alice] [Bob] [Carol] [Unassigned]
████████░░░  4 of 12 done
<TaskBoard presetId={presetId} />
```

"Download JSON" is client-side only:
```typescript
const tasks = useAppStore.getState().workspaces[presetId]?.tasks ?? [];
const blob  = new Blob([JSON.stringify(tasks, null, 2)], { type: "application/json" });
const a     = Object.assign(document.createElement("a"), {
  href: URL.createObjectURL(blob),
  download: "tasks.json",
});
a.click();
URL.revokeObjectURL(a.href);
```

### `components/WorkspacePanel/TasksTab/TaskBoard.tsx`

Four fixed columns: `todo`, `in_progress`, `in_review`, `done`. Apply `activeFilter` before passing tasks to columns.

```typescript
const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "todo",        label: "To do"       },
  { status: "in_progress", label: "In progress" },
  { status: "in_review",   label: "In review"   },
  { status: "done",        label: "Done"         },
];
```

### `components/WorkspacePanel/TasksTab/TaskColumn.tsx`

Props: `status`, `label`, `tasks`, `presetId`. Column header with label + count badge. Inline `+ Add task` at bottom (title only, Enter commits, Escape cancels). New task gets `id: crypto.randomUUID()`, the column's status, `priority: "medium"`, empty description/section, null assignees.

### `components/WorkspacePanel/TasksTab/TaskCard.tsx`

Layout:
```
[high]  Design auth flow                    [×]
Auth & Security
Define the OAuth flow for Google...
[AL] Alice ▾                    [→ In progress]
```

- Done column: `opacity-60`, title has `line-through`
- In progress column: card has `border-primary` (2px)
- Title: `ondblclick` → inline `<input>`, blur/Enter → `updateTask`
- Priority badge: `high` → destructive, `medium` → amber custom class, `low` → secondary
- Assignee avatar: 20×20, initials, deterministic colour:
  ```typescript
  const PALETTE = [
    "bg-purple-100 text-purple-800",
    "bg-teal-100 text-teal-800",
    "bg-amber-100 text-amber-800",
    "bg-orange-100 text-orange-800",
    "bg-blue-100 text-blue-800",
  ];
  const colour = PALETTE[name.charCodeAt(0) % PALETTE.length];
  ```
- Move `→` button: shadcn `Popover` with the other three statuses → `moveTask`
- Delete `×`: visible on hover only → `deleteTask`

### `components/WorkspacePanel/TasksTab/AssigneeDropdown.tsx`

shadcn `Select`. All preset participants + "Unassigned". On change → `updateTask(presetId, taskId, { confirmedAssignee })`.

### `components/WorkspacePanel/TasksTab/FilterBar.tsx`

Pill buttons — "All" + one per participant. Active pill filled. Clicking sets/clears `activeFilter`.

### `components/WorkspacePanel/TasksTab/ProgressBar.tsx`

`done / total` count with green fill bar + `{n} of {total} done` label. Hidden when `total === 0`.

---

## `hooks/useGenerateTasks.ts`

```typescript
"use client";
import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import type { Task } from "@/lib/types";

export function useGenerateTasks(presetId: string) {
  const prdText      = useAppStore(s => s.workspaces[presetId]?.prdText ?? "");
  const participants = useAppStore(s => s.presets.find(p => p.id === presetId)?.participants ?? []);
  const setTasks     = useAppStore(s => s.setTasks);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const generate = async () => {
    if (!prdText.trim()) { setError("Add a PRD first."); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/v1/tasks/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prdText, participants }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error?.message ?? "Generation failed.");
      } else {
        const { tasks }: { tasks: Task[] } = await res.json();
        setTasks(presetId, tasks);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return { generate, loading, error };
}
```

---

## Tests

### `__tests__/prd.test.ts`
1. `buildTaskPrompt` output contains participant IDs
2. `buildTaskPrompt` output contains the PRD text
3. `buildTaskPrompt` does not throw on empty participant array

### `__tests__/extract.test.ts`
1. Extract route returns 400 for unsupported file type (`.txt` file)

---

## Removed entirely — do not create

- `lib/taskExport.ts`
- `app/api/v1/tasks/export/route.ts`
- `ExportSettings` type
- `hooks/useExportTasks.ts`
- All Linear / Asana / Jira integration code

---

## Definition of done

- [ ] Clicking folder icon on a preset navigates to `/workspace/[presetId]`
- [ ] PRD tab: MDEditor loads with live split preview
- [ ] PRD tab: uploading a PDF populates the editor
- [ ] PRD tab: uploading a DOCX populates the editor
- [ ] Tasks tab: "Generate tasks" calls Groq and renders tasks in the To do column
- [ ] Tasks tab: four columns — To do, In progress, In review, Done
- [ ] Tasks tab: move button cycles a task through columns
- [ ] Tasks tab: assignee dropdown updates the card avatar immediately
- [ ] Tasks tab: filter pills show only that person's tasks across all columns
- [ ] Tasks tab: progress bar reflects done / total
- [ ] Tasks tab: double-clicking a title enables inline editing
- [ ] Tasks tab: `+ Add task` in any column creates a task in that column
- [ ] Tasks tab: "Download JSON" downloads all tasks as a `.json` file
- [ ] `npm run build` exits 0
- [ ] `npm test` all tests pass
