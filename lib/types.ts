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
