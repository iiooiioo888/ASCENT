import { CONNECTION_INTERRUPTED_BANNER } from "../productCopy";

type Props = {
  visible: boolean;
};

/** Reserved slot so connect/disconnect does not shift HUD (v0.3). */
export function ConnectionStatusBar({ visible }: Props) {
  return (
    <div
      className={`connection-status-slot${visible ? " is-visible" : ""}`}
      role="status"
      aria-live="polite"
      aria-hidden={!visible}
    >
      {visible ? CONNECTION_INTERRUPTED_BANNER : null}
    </div>
  );
}
