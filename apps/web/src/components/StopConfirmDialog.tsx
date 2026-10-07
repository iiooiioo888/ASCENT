import { useEffect, useId, useRef } from "react";
import { trapTabKey } from "../a11y/trapFocus";
import { fmtIo } from "../format";
import { METHOD_NAME } from "../meta";
import type { Method } from "../types";
import { stopConfirmIntro, stopConfirmLossHeading } from "./stopConfirmCopy";

type Props = {
  open: boolean;
  buildingName: string;
  method: Method | undefined;
  onCancel: () => void;
  onConfirm: () => void;
};

export function StopConfirmDialog({ open, buildingName, method, onCancel, onConfirm }: Props) {
  const titleId = useId();
  const panelRef = useRef<HTMLFormElement>(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    if (!panel) return;

    const cancelBtn = panel.querySelector<HTMLButtonElement>('button[type="button"]');
    cancelBtn?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancelRef.current();
        return;
      }
      trapTabKey(e, panel);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const lossLine = method ? fmtIo(method.inputs) : "（未知配方）";
  const methodLabel = method ? (METHOD_NAME[method.id] ?? method.code) : "…";

  return (
    <dialog className="confirm-dialog" open aria-modal="true" aria-labelledby={titleId}>
      <form
        ref={panelRef}
        method="dialog"
        className="confirm-dialog-panel"
        onSubmit={(e) => {
          e.preventDefault();
          onConfirm();
        }}
      >
        <h4 id={titleId} className="confirm-dialog-title">確認停止生產？</h4>
        <p className="confirm-dialog-body">{stopConfirmIntro(buildingName, methodLabel)}</p>
        <p className="confirm-dialog-loss">
          <strong>{stopConfirmLossHeading()}：</strong> {lossLine}
        </p>
        <div className="confirm-dialog-actions">
          <button type="button" className="ghost" onClick={onCancel}>
            取消
          </button>
          <button type="submit" className="danger">
            確認停止
          </button>
        </div>
      </form>
    </dialog>
  );
}
