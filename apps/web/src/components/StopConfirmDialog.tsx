import { fmtIo } from "../format";
import { METHOD_NAME } from "../meta";
import type { Method } from "../types";
import { stopConfirmIntro } from "./stopConfirmCopy";

type Props = {
  open: boolean;
  buildingName: string;
  method: Method | undefined;
  onCancel: () => void;
  onConfirm: () => void;
};

export function StopConfirmDialog({ open, buildingName, method, onCancel, onConfirm }: Props) {
  if (!open) return null;

  const lossLine = method ? fmtIo(method.inputs) : "（未知配方）";
  const methodLabel = method ? (METHOD_NAME[method.id] ?? method.code) : "…";

  return (
    <dialog className="confirm-dialog" open>
      <form
        method="dialog"
        className="confirm-dialog-panel"
        onSubmit={(e) => {
          e.preventDefault();
          onConfirm();
        }}
      >
        <h4 className="confirm-dialog-title">確認停止生產？</h4>
        <p className="confirm-dialog-body">{stopConfirmIntro(buildingName, methodLabel)}</p>
        <p className="confirm-dialog-loss">{lossLine}</p>
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
