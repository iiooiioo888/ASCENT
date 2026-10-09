import type { SessionDecision, TutorialCoach } from "@ascent/shared";

type Props = {
  tutorial: TutorialCoach;
  decision: SessionDecision;
  bottleneckLabel?: string;
  bottleneckHint?: string;
};

export function SessionCoach({ tutorial, decision, bottleneckLabel, bottleneckHint }: Props) {
  return (
    <section className="session-coach" data-testid="session-coach">
      <p className="session-coach-step">
        <strong>{tutorial.title}</strong> {tutorial.body}
      </p>
      {bottleneckLabel ? (
        <p className="session-coach-bottleneck" data-testid="economy-bottleneck">
          現在：{bottleneckLabel}
          {bottleneckHint ? ` — ${bottleneckHint}` : ""}
        </p>
      ) : null}
      <p className="session-coach-decision" data-testid="session-decision">
        這輪決定：{decision.prompt}
      </p>
    </section>
  );
}
