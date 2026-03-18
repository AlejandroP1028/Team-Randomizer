export type Strategy = "balanced_skill" | "mixed_department" | "random" | "custom";
export type Seniority = "junior" | "mid" | "senior";
export type GroupingMode = "mixed" | "specialised";

export interface BalanceWeights {
  skill:      number;   // 0–10
  department: number;   // 0–10
  seniority:  number;   // 0–10
  headcount:  number;   // 0–10
}

export interface Participant {
  id: string;
  name: string;
  skillLevel?: number | null;    // 1–5
  department?: string | null;
  seniority?: Seniority | null;
  tags?: string[];               // e.g. ["backend", "postgres", "python"]
  preferences?: {
    mustSeparateFrom: string[];
    preferTogetherWith: string[];
  };
}

export interface TeamConfig {
  strategy: Strategy;
  teamCount?: number;
  teamSize?: number;
  groupingMode?: GroupingMode;    // "mixed" (default) | "specialised"
  weights?: BalanceWeights;
  requireSeniorPerTeam?: boolean;
}

export interface TeamStats {
  avgSkill:    number;
  departments: Record<string, number>;
  tags:        Record<string, number>;     // tag → count across team members
  seniority:   Record<string, number>;     // "junior"|"mid"|"senior" → count
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

export interface ObjectiveScores {
  skill:      number;   // 0–100
  department: number;   // 0–100
  seniority:  number;   // 0–100
  headcount:  number;   // 0–100
  composite:  number;   // weighted average
}

export interface SolverResult {
  teams: Team[];
  warnings: SolverWarning[];
  remainderCount: number;
  scores: ObjectiveScores;
}

export interface Preset {
  id: string;
  name: string;
  participants: Participant[];
  config: TeamConfig;
  createdAt: string;
  updatedAt: string;
  color: string;  // hex value, e.g. "#1D9E75"
}

export interface GenerateRequest  { participants: Participant[]; config: TeamConfig; }
export interface ValidateRequest  { participants: Participant[]; }
export interface SlackExportRequest { teams: Team[]; includeStats?: boolean; }
export interface SlackExportResponse { text: string; }
export interface ApiError {
  error: { code: "VALIDATION_ERROR" | "CONSTRAINT_CONFLICT" | "INTERNAL_ERROR"; message: string; details?: Record<string, unknown>; };
}

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

export interface TaskFilters {
  assignees:  string[];
  priorities: TaskPriority[];
  statuses:   TaskStatus[];
}

export interface SubTeam {
  id: string;
  splitId: string;
  name: string;
  members: Participant[];
}

export interface Split {
  id: string;
  name: string;
  prdMode: "shared" | "per_team";
  color: string;
  allParticipants: Participant[];
  config: TeamConfig;
  subTeams: SubTeam[];
  createdAt: string;
  updatedAt: string;
}

export interface SplitWorkspace {
  subTeamId: string;
  prdText: string;
  tasks: Task[];
  lastGeneratedAt: string | null;
}
