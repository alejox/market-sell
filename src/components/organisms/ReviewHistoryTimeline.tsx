import { Card } from "@/components/atoms/Card";
import { Badge } from "@/components/atoms/Badge";
import type { ReviewDecision } from "@/modules/review/domain/review-decision";

const DECISION_LABELS: Record<ReviewDecision["decision"], string> = {
  approved: "Aprobado",
  changes_requested: "Cambios solicitados",
};

export function ReviewHistoryTimeline({ decisions }: { decisions: ReviewDecision[] }) {
  return (
    <Card title="Historial de revisión">
      {decisions.length === 0 ? (
        <p className="text-sm text-muted-on">Todavía no hay decisiones de revisión registradas.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {decisions.map((decision) => (
            <li key={decision.id} className="flex flex-col gap-1 border-l-2 border-border pl-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge tone={decision.decision === "approved" ? "success" : "warning"}>
                  {DECISION_LABELS[decision.decision]}
                </Badge>
                <span className="font-medium text-on-surface">Versión {decision.version}</span>
                <span className="text-muted-on">· {decision.reviewer} · {decision.decidedAt}</span>
              </div>
              {decision.feedback && <p className="text-sm text-muted-on">{decision.feedback}</p>}
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
