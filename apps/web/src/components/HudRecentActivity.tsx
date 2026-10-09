import { hudRecentActivityLabel } from "../hud-display";

type Props = {
  message: string;
};

/** 頂欄次要列：精簡最近動態（唔佔主要 chip 名額）。 */
export function HudRecentActivity({ message }: Props) {
  if (!message.trim()) return null;
  return (
    <span
      className="chip chip-muted chip-hud-activity"
      data-testid="hud-recent-activity"
      title={message}
    >
      {hudRecentActivityLabel(message)}
    </span>
  );
}
