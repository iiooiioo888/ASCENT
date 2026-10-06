import {
  OFFLINE_SUMMARY_DISMISS_LABEL,
  OFFLINE_SUMMARY_FOOTNOTE,
  OFFLINE_SUMMARY_PENDING_TAG,
  OFFLINE_SUMMARY_TITLE,
} from "../productCopy";
import type { OfflineSummaryResult } from "../offlineSummary";

type Props = {
  summary: OfflineSummaryResult;
  onDismiss: () => void;
};

export function OfflineSummaryNotice({ summary, onDismiss }: Props) {
  return (
    <section className="banner offline-summary" role="dialog" aria-labelledby="offline-summary-title">
      <div className="offline-summary-head">
        <h2 id="offline-summary-title" className="offline-summary-title">
          {OFFLINE_SUMMARY_TITLE}
        </h2>
        <span className="offline-summary-tag">{OFFLINE_SUMMARY_PENDING_TAG}</span>
      </div>
      <ul className="offline-summary-lines">
        {summary.lines.map((line) => (
          <li key={line.buildingId}>{line.text}</li>
        ))}
      </ul>
      <p className="offline-summary-footnote">{OFFLINE_SUMMARY_FOOTNOTE}</p>
      <button type="button" className="offline-summary-dismiss" onClick={onDismiss}>
        {OFFLINE_SUMMARY_DISMISS_LABEL}
      </button>
    </section>
  );
}
