import { fmtIo } from "../format";
import { METHOD_NAME } from "../meta";
import type { Method } from "../types";

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
        <p className="confirm-dialog-body">
          <strong>{buildingName}</strong> 正在進行「{method ? (METHOD_NAME[method.id] ?? method.code) : "…"}」。停止後將失去下列已在開工時扣除的資源（目前後端
          <strong>不會</strong>退還），且進行中的工時與未完成產出也會作廢：
        </p>
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
