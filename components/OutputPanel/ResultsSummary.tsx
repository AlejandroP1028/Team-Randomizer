interface ResultsSummaryProps {
  totalParticipants: number;
  teamCount: number;
  avgTeamSize: number;
  skillSpread: number;
  deptCount: number;
  seniorityTotals: { junior: number; mid: number; senior: number };
  softUnmetCount: number;
  hardFailCount: number;
}

function Chip({
  value,
  label,
  className = "",
}: {
  value: React.ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={[
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px]",
        "bg-secondary border-border",
        className,
      ].join(" ")}
    >
      <span className="font-mono font-semibold text-foreground">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

export function ResultsSummary({
  totalParticipants,
  teamCount,
  avgTeamSize,
  skillSpread,
  deptCount,
  seniorityTotals,
  softUnmetCount,
  hardFailCount,
}: ResultsSummaryProps) {
  const hasSeniority =
    seniorityTotals.junior + seniorityTotals.mid + seniorityTotals.senior > 0;

  const skillSpreadColor =
    skillSpread <= 0.5
      ? "border-emerald-500/30 bg-emerald-500/10 [&_span:first-child]:text-emerald-600"
      : "border-amber-500/30 bg-amber-500/10 [&_span:first-child]:text-amber-600";

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-1">
      <Chip value={totalParticipants} label="participants" />
      <Chip value={teamCount} label="teams" />
      <Chip value={avgTeamSize.toFixed(1)} label="avg / team" />

      {teamCount > 1 && (
        <Chip
          value={`±${skillSpread.toFixed(1)}`}
          label="skill spread"
          className={skillSpreadColor}
        />
      )}

      {deptCount > 0 && (
        <Chip value={deptCount} label="depts" />
      )}

      {hasSeniority && (
        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border bg-secondary text-[11px]">
          <span className="text-muted-foreground">J·</span>
          <span className="font-mono font-semibold text-foreground">{seniorityTotals.junior}</span>
          <span className="text-muted-foreground ml-1">M·</span>
          <span className="font-mono font-semibold text-foreground">{seniorityTotals.mid}</span>
          <span className="text-muted-foreground ml-1">S·</span>
          <span className="font-mono font-semibold text-foreground">{seniorityTotals.senior}</span>
        </div>
      )}

      {softUnmetCount > 0 && (
        <Chip
          value={`⚠ ${softUnmetCount}`}
          label={`pref${softUnmetCount > 1 ? "s" : ""} unmet`}
          className="border-amber-500/30 bg-amber-500/10 [&_span:first-child]:text-amber-500"
        />
      )}

      {hardFailCount > 0 && (
        <Chip
          value={`✕ ${hardFailCount}`}
          label={`hard constraint${hardFailCount > 1 ? "s" : ""} failed`}
          className="border-red-500/30 bg-red-500/10 [&_span:first-child]:text-red-500"
        />
      )}
    </div>
  );
}
