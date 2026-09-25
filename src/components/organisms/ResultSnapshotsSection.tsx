import { Card } from "@/components/atoms/Card";
import { Badge } from "@/components/atoms/Badge";
import { RESULT_SOURCE_LABELS } from "@/components/labels";
import { ResultSnapshotForm } from "@/components/organisms/ResultSnapshotForm";
import type { ResultSnapshot } from "@/modules/results/domain/result-snapshot";
import type { BoundFormAction } from "@/components/action-state";

export function ResultSnapshotsSection({
  snapshots,
  recordResultSnapshotAction,
}: {
  snapshots: ResultSnapshot[];
  recordResultSnapshotAction: BoundFormAction;
}) {
  const sorted = [...snapshots].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));

  return (
    <Card title="Resultados de campaña">
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-on">Todavía no se han registrado resultados para esta audiencia.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {sorted.map((snapshot) => (
            <li key={snapshot.id} className="flex flex-col gap-2 rounded-2xl bg-muted p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium text-on-surface">
                  {snapshot.period.from} – {snapshot.period.to}
                </span>
                <Badge tone="info">{RESULT_SOURCE_LABELS[snapshot.source]}</Badge>
              </div>
              <ul className="flex flex-wrap gap-x-4 text-sm text-muted-on">
                {snapshot.metrics.map((metric, i) => (
                  <li key={i}>
                    {metric.name}: {metric.value}
                    {metric.unit ? ` ${metric.unit}` : ""}
                  </li>
                ))}
              </ul>
              {snapshot.notes && <p className="text-sm text-muted-on">{snapshot.notes}</p>}
              <p className="text-xs text-muted-on">Registrado por {snapshot.recordedBy} el {snapshot.recordedAt}</p>
            </li>
          ))}
        </ul>
      )}

      <details className="rounded-2xl border border-border p-4">
        <summary className="cursor-pointer text-sm font-medium text-primary">Registrar nuevo resultado</summary>
        <div className="mt-3">
          <ResultSnapshotForm action={recordResultSnapshotAction} />
        </div>
      </details>
    </Card>
  );
}
