import { CONNECTION_INTERRUPTED_BANNER } from "../productCopy";

type Props = {
  visible: boolean;
};

export function ConnectionStatusBar({ visible }: Props) {
  if (!visible) return null;
  return (
    <div className="connection-status" role="status" aria-live="polite">
      {CONNECTION_INTERRUPTED_BANNER}
    </div>
  );
}
