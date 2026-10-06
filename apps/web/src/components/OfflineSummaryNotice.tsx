import { useEffect, useId, useRef } from "react";
import { trapTabKey } from "../a11y/trapFocus";
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
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    const dialog = dialogRef.current;
    const panel = panelRef.current;
    if (!dialog || !panel) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    if (!dialog.open) {
      dialog.showModal();
    }

    const dismissBtn = panel.querySelector<HTMLButtonElement>("button.offline-summary-dismiss");
    dismissBtn?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onDismissRef.current();
        return;
      }
      trapTabKey(e, panel);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (dialog.open) dialog.close();
      previouslyFocused?.focus?.();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="offline-summary-dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div ref={panelRef} className="banner offline-summary offline-summary-panel">
        <div className="offline-summary-head">
          <h2 id={titleId} className="offline-summary-title">
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
      </div>
    </dialog>
  );
}
